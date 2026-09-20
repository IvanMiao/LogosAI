import { act, useState } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { RemoteApiError } from '@/client-api/api-error';
import { useWorkspaceCloudSync } from '@/pages/workspace/useWorkspaceCloudSync';
import { buildReadingSessions, createLocalWorkspaceState, type LocalWorkspaceState } from '@/features/reading/reading-cloud-state';
import { DEFAULT_READER_PREFERENCES } from '@/features/reading/reading-storage';
import { readWorkspaceSyncJournal } from '@/features/reading/reading-sync-journal';
import { getCloudWorkspace, saveCloudReadingSession } from '@/client-api/workspace-api';
import type { CloudWorkspaceState, ReadingSessionSnapshot } from '@/features/reading';

vi.mock('@/client-api/workspace-api', () => ({
  getCloudWorkspace: vi.fn(), saveCloudReadingSession: vi.fn(),
  saveCloudWorkspacePreferences: vi.fn().mockResolvedValue({}),
  deleteCloudReadingSession: vi.fn().mockResolvedValue(undefined),
}));
const now = '2026-09-13T00:00:00.000Z';
const original: ReadingSessionSnapshot = { document: { id: 'original', title: 'Original title',
  text: 'Original text', sourceType: 'paste', createdAt: now, updatedAt: now },
  activeAnchorId: null, anchors: [], artifacts: [] };
const preferences: CloudWorkspaceState['preferences'] = { activeDocumentId: 'original',
  readerPreferences: DEFAULT_READER_PREFERENCES, analysisLanguage: 'en' };
let cloud: CloudWorkspaceState;

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  cloud = { preferences, sessions: [{ ...structuredClone(original), revision: 1, syncedAt: now }] };
  vi.mocked(getCloudWorkspace).mockImplementation(async () => structuredClone(cloud));
  vi.mocked(saveCloudReadingSession).mockImplementation(async (snapshot, revision) => {
    const current = cloud.sessions.find((session) => session.document.id === snapshot.document.id);
    if ((current?.revision ?? 0) !== revision) throw new RemoteApiError('This reading changed elsewhere.', 409);
    const saved = { ...structuredClone(snapshot), revision: revision + 1, syncedAt: now };
    cloud = { ...cloud, sessions: [...cloud.sessions.filter((session) => session.document.id !== snapshot.document.id), saved] };
    return { revision: saved.revision, syncedAt: now };
  });
});

function useHarness(initial = createLocalWorkspaceState([original], preferences)) {
  const [state, setState] = useState(initial);
  return { state, setState, sync: useWorkspaceCloudSync({ enabled: true, userId: 'reader', state, onHydrate: setState }) };
}
function renamed(state: LocalWorkspaceState, title: string): LocalWorkspaceState {
  return { ...state, documentLibrary: { ...state.documentLibrary,
    documentsById: { original: { ...state.documentLibrary.documentsById.original, title } } } };
}

it('automatically rebases independent edits after a 409 and saves one reading', async () => {
  const { result } = renderHook(() => useHarness());
  await waitFor(() => expect(result.current.sync.status).toBe('saved'));
  cloud.sessions[0] = { ...cloud.sessions[0], document: { ...original.document, text: 'Newer cloud text' }, revision: 2 };
  act(() => result.current.setState((state) => renamed(state, 'Local rename')));
  await waitFor(() => expect(cloud.sessions[0].document.title).toBe('Local rename'), { timeout: 5000 });
  expect(cloud.sessions).toHaveLength(1);
  expect(cloud.sessions[0].document.text).toBe('Newer cloud text');
  expect(result.current.sync.conflicts).toEqual([]);
  expect(cloud.sessions[0].revision).toBe(3);
});

it('holds overlapping edits through reload, then saves the explicit resolution', async () => {
  const first = renderHook(() => useHarness());
  await waitFor(() => expect(first.result.current.sync.status).toBe('saved'));
  cloud.sessions[0] = { ...cloud.sessions[0], document: { ...original.document, title: 'Cloud title' }, revision: 2 };
  act(() => first.result.current.setState((state) => renamed(state, 'Local title')));
  await waitFor(() => expect(first.result.current.sync.status).toBe('conflict'), { timeout: 4000 });
  expect(cloud.sessions[0].document.title).toBe('Cloud title');
  const cachedState = first.result.current.state;
  first.unmount();
  const { result } = renderHook(() => useHarness(cachedState));
  await waitFor(() => expect(result.current.sync.status).toBe('conflict'));
  expect(buildReadingSessions(result.current.state)).toHaveLength(1);
  expect(result.current.state.documentLibrary.documentsById.original.title).toBe('Local title');
  act(() => result.current.sync.resolveConflict(result.current.sync.conflicts[0], 'local'));
  await waitFor(() => expect(cloud.sessions[0].document.title).toBe('Local title'), { timeout: 4000 });
  expect(result.current.sync.conflicts).toEqual([]);
  expect(cloud.sessions).toHaveLength(1);
});

it('recognizes a successful save whose response was lost without creating a duplicate', async () => {
  const save = vi.mocked(saveCloudReadingSession).getMockImplementation()!;
  vi.mocked(saveCloudReadingSession).mockImplementationOnce(async (...args) => {
    await save(...args);
    throw new Error('Connection lost');
  });
  const { result } = renderHook(() => useHarness());
  await waitFor(() => expect(result.current.sync.status).toBe('saved'));
  act(() => result.current.setState((state) => renamed(state, 'Saved before disconnect')));
  await waitFor(() => expect(result.current.sync.status).toBe('error'), { timeout: 4000 });
  act(() => result.current.sync.retry());
  await waitFor(() => expect(result.current.sync.status).toBe('saved'));
  expect(result.current.sync.conflicts).toEqual([]);
  expect(cloud.sessions).toHaveLength(1);
  expect(saveCloudReadingSession).toHaveBeenCalledTimes(1);
});

it('does not loop when another writer repeatedly changes the reading', async () => {
  vi.mocked(saveCloudReadingSession).mockRejectedValue(new RemoteApiError('Changed again', 409));
  const { result } = renderHook(() => useHarness());
  await waitFor(() => expect(result.current.sync.status).toBe('saved'));
  act(() => result.current.setState((state) => renamed(state, 'Local title')));
  await waitFor(() => expect(result.current.sync.status).toBe('error'), { timeout: 5000 });
  expect(saveCloudReadingSession).toHaveBeenCalledTimes(2);
  expect(getCloudWorkspace).toHaveBeenCalledTimes(2);
  expect(result.current.state.documentLibrary.documentsById.original.title).toBe('Local title');
});

it('journals offline edits and compares them after reconnecting', async () => {
  const first = renderHook(() => useHarness());
  await waitFor(() => expect(first.result.current.sync.status).toBe('saved'));
  const initial = first.result.current.state; first.unmount();
  vi.mocked(getCloudWorkspace).mockRejectedValueOnce(new Error('Offline'));
  const { result } = renderHook(() => useHarness(initial));
  await waitFor(() => expect(result.current.sync.status).toBe('offline'));
  act(() => result.current.setState((state) => renamed(state, 'Offline title')));
  expect(readWorkspaceSyncJournal('reader').dirtySessionIds).toContain('original');
  cloud.sessions[0] = { ...cloud.sessions[0], document: { ...original.document, text: 'New cloud text' }, revision: 2 };
  act(() => result.current.sync.retry());
  await waitFor(() => expect(cloud.sessions[0].document.title).toBe('Offline title'), { timeout: 4000 });
  expect(cloud.sessions[0].document.text).toBe('New cloud text');
});

it('accepts cloud edits after an offline reload with no local changes', async () => {
  const first = renderHook(() => useHarness());
  await waitFor(() => expect(first.result.current.sync.status).toBe('saved'));
  const cached = first.result.current.state;
  first.unmount();
  vi.mocked(getCloudWorkspace).mockRejectedValueOnce(new Error('Offline'));
  const { result } = renderHook(() => useHarness(cached));
  await waitFor(() => expect(result.current.sync.status).toBe('offline'));
  expect(readWorkspaceSyncJournal('reader').dirtySessionIds).toEqual([]);
  cloud.sessions[0] = { ...cloud.sessions[0], document: { ...original.document, title: 'Cloud title' }, revision: 2 };
  act(() => result.current.sync.retry());
  await waitFor(() => expect(result.current.sync.status).toBe('saved'));
  expect(result.current.state.documentLibrary.documentsById.original.title).toBe('Cloud title');
  expect(result.current.sync.conflicts).toEqual([]);
  expect(saveCloudReadingSession).not.toHaveBeenCalled();
});

it('preserves edits made while the initial cloud request is pending', async () => {
  let receive!: (state: CloudWorkspaceState) => void;
  vi.mocked(getCloudWorkspace).mockImplementationOnce(() => new Promise((resolve) => { receive = resolve; }));
  const { result } = renderHook(() => useHarness());
  await waitFor(() => expect(getCloudWorkspace).toHaveBeenCalled());
  act(() => result.current.setState((state) => renamed(state, 'Typed while loading')));
  await act(async () => receive(structuredClone(cloud)));
  await waitFor(() => expect(result.current.sync.status).toBe('conflict'));
  expect(result.current.state.documentLibrary.documentsById.original.title).toBe('Typed while loading');
  expect(cloud.sessions[0].document.title).toBe('Original title');
});

it('keeps edits made during an in-flight save pending for the following save', async () => {
  const save = vi.mocked(saveCloudReadingSession).getMockImplementation()!;
  let release!: () => void;
  vi.mocked(saveCloudReadingSession).mockImplementationOnce(async (...args) => {
    await new Promise<void>((resolve) => { release = resolve; });
    return save(...args);
  });
  const { result } = renderHook(() => useHarness());
  await waitFor(() => expect(result.current.sync.status).toBe('saved'));
  act(() => result.current.setState((state) => renamed(state, 'First edit')));
  await waitFor(() => expect(saveCloudReadingSession).toHaveBeenCalledTimes(1), { timeout: 4000 });
  act(() => result.current.setState((state) => renamed(state, 'Second edit')));
  await act(async () => release());
  expect(readWorkspaceSyncJournal('reader').dirtySessionIds).toContain('original');
  await waitFor(() => expect(cloud.sessions[0].document.title).toBe('Second edit'), { timeout: 4000 });
  expect(saveCloudReadingSession).toHaveBeenCalledTimes(2);
  expect(cloud.sessions).toHaveLength(1);
});

it('warns when browser storage cannot retain the sync journal', async () => {
  const write = Storage.prototype.setItem;
  const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (key.includes('cloudSyncJournal')) throw new DOMException('Quota exceeded', 'QuotaExceededError');
    return write.call(this, key, value);
  });
  try {
    const { result } = renderHook(() => useHarness());
    await waitFor(() => expect(result.current.sync.error).toContain('Keep this page open'));
    expect(result.current.state.documentLibrary.documentsById.original.title).toBe('Original title');
  } finally {
    storage.mockRestore();
  }
});
