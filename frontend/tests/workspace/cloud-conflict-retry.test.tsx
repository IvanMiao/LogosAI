import { act, useState } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useWorkspaceCloudSync } from '@/pages/workspace/useWorkspaceCloudSync';
import { buildReadingSessions, createLocalWorkspaceState } from '@/features/reading/reading-cloud-state';
import { DEFAULT_READER_PREFERENCES } from '@/features/reading/reading-storage';
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
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

it('rejects a stale tab, then Retry saves its edits separately from the newer cloud reading', async () => {
  let cloud: CloudWorkspaceState = { preferences, sessions: [{ ...original, revision: 1, syncedAt: now }] };
  vi.mocked(getCloudWorkspace).mockImplementation(async () => structuredClone(cloud));
  vi.mocked(saveCloudReadingSession).mockImplementation(async (snapshot, revision) => {
    const current = cloud.sessions.find((session) => session.document.id === snapshot.document.id);
    if ((current?.revision ?? 0) !== revision) throw new Error('This reading changed elsewhere.');
    const saved = { ...snapshot, revision: revision + 1, syncedAt: now };
    cloud = { ...cloud, sessions: [...cloud.sessions.filter((session) => session.document.id !== snapshot.document.id), saved] };
    return { revision: saved.revision, syncedAt: now };
  });
  const { result } = renderHook(() => {
    const [state, setState] = useState(() => createLocalWorkspaceState([original], preferences));
    return { state, setState, sync: useWorkspaceCloudSync({ enabled: true, userId: 'reader', state, onHydrate: setState }) };
  });
  await waitFor(() => expect(result.current.sync.status).toBe('saved'));
  cloud.sessions[0] = { ...cloud.sessions[0], document: { ...original.document, text: 'Newer cloud text' }, revision: 2 };
  act(() => result.current.setState((state) => ({ ...state, documentLibrary: { ...state.documentLibrary,
    documentsById: { original: { ...original.document, title: 'Stale tab rename' } } } })));
  await waitFor(() => expect(result.current.sync.status).toBe('error'), { timeout: 4000 });
  expect(cloud.sessions[0].document.text).toBe('Newer cloud text');
  act(() => result.current.sync.retry());
  await waitFor(() => expect(buildReadingSessions(result.current.state)).toHaveLength(2));
  await waitFor(() => expect(result.current.sync.status).toBe('saved'), { timeout: 4000 });
  expect(cloud.sessions).toHaveLength(2);
  expect(cloud.sessions.find((session) => session.document.id === 'original')?.document.text).toBe('Newer cloud text');
  expect(cloud.sessions.find((session) => session.document.id !== 'original')?.document.title).toBe('Stale tab rename (conflict copy)');
});
