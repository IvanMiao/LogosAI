import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteApiError } from '@/client-api/api-error';
import {
  buildReadingSessions,
  createLocalWorkspaceState,
  type LocalWorkspaceState,
} from '@/features/reading/reading-cloud-state';
import {
  createReadingSync,
  type CloudWorkspacePort,
  type ReadingSync,
  type ReadingSyncSnapshot,
  type SyncJournalStore,
} from '@/features/reading/reading-sync';
import {
  type WorkspaceSyncJournal,
} from '@/features/reading/reading-sync-journal';
import { DEFAULT_READER_PREFERENCES } from '@/features/reading/reading-storage';
import type { CloudWorkspaceState, ReadingSessionSnapshot } from '@/features/reading';

const now = '2026-09-13T00:00:00.000Z';
const original: ReadingSessionSnapshot = {
  document: {
    id: 'original',
    title: 'Original title',
    text: 'Original text',
    sourceType: 'paste',
    createdAt: now,
    updatedAt: now,
  },
  activeAnchorId: null,
  anchors: [],
  artifacts: [],
};
const preferences: CloudWorkspaceState['preferences'] = {
  activeDocumentId: 'original',
  readerPreferences: DEFAULT_READER_PREFERENCES,
  analysisLanguage: 'en',
};

interface MemoryCloud extends CloudWorkspacePort {
  state: CloudWorkspaceState;
  loads: number;
  saves: number;
  loadNext: (() => Promise<CloudWorkspaceState>) | null;
  saveNext: ((
    snapshot: ReadingSessionSnapshot,
    revision: number,
  ) => Promise<{ revision: number; syncedAt: string }>) | null;
  persistSession: (
    snapshot: ReadingSessionSnapshot,
    revision: number,
  ) => Promise<{ revision: number; syncedAt: string }>;
}

function createMemoryCloud(): MemoryCloud {
  const cloud: MemoryCloud = {
    state: {
      preferences,
      sessions: [{ ...structuredClone(original), revision: 1, syncedAt: now }],
    },
    loads: 0,
    saves: 0,
    loadNext: null,
    saveNext: null,
    async load() {
      cloud.loads += 1;
      const load = cloud.loadNext;
      cloud.loadNext = null;
      return load ? load() : structuredClone(cloud.state);
    },
    async saveSession(snapshot, revision) {
      cloud.saves += 1;
      const save = cloud.saveNext;
      cloud.saveNext = null;
      return save ? save(snapshot, revision) : cloud.persistSession(snapshot, revision);
    },
    async persistSession(snapshot, revision) {
      const current = cloud.state.sessions.find((session) => session.document.id === snapshot.document.id);
      if ((current?.revision ?? 0) !== revision) {
        throw new RemoteApiError('This reading changed elsewhere.', 409);
      }
      const saved = { ...structuredClone(snapshot), revision: revision + 1, syncedAt: now };
      cloud.state = {
        ...cloud.state,
        sessions: [
          ...cloud.state.sessions.filter((session) => session.document.id !== snapshot.document.id),
          saved,
        ],
      };
      return { revision: saved.revision, syncedAt: now };
    },
    async deleteSession(sessionId, revision) {
      const current = cloud.state.sessions.find((session) => session.document.id === sessionId);
      if ((current?.revision ?? 0) !== revision) {
        throw new RemoteApiError('This reading changed elsewhere.', 409);
      }
      cloud.state = {
        ...cloud.state,
        sessions: cloud.state.sessions.filter((session) => session.document.id !== sessionId),
      };
    },
    async savePreferences(nextPreferences) {
      cloud.state = { ...cloud.state, preferences: nextPreferences };
      return { preferences: nextPreferences };
    },
  };
  return cloud;
}

function createMemoryJournal(failWrites = false): SyncJournalStore & { value: WorkspaceSyncJournal } {
  let value: WorkspaceSyncJournal = {
    knownSessionIds: [],
    dirtySessionIds: [],
    deletedSessionIds: [],
    preferencesDirty: false,
  };
  return {
    get value() {
      return structuredClone(value);
    },
    read: () => structuredClone(value),
    write: (journal) => {
      if (failWrites) return false;
      value = structuredClone(journal);
      return true;
    },
  };
}

function createHarness(
  cloud = createMemoryCloud(),
  journal = createMemoryJournal(),
  initialState = createLocalWorkspaceState([original], preferences),
) {
  let state = initialState;
  let snapshot: ReadingSyncSnapshot = { status: 'loading', error: '', conflicts: [] };
  const sync = createReadingSync({
    cloud,
    journal,
    initialState,
    replaceLocalState: (next) => {
      state = next;
    },
    onChange: (next) => {
      snapshot = next;
    },
    debounceMs: 0,
  });
  return {
    cloud,
    journal,
    sync,
    get state() {
      return state;
    },
    get snapshot() {
      return snapshot;
    },
    update(change: (current: LocalWorkspaceState) => LocalWorkspaceState) {
      state = change(state);
      sync.update(state);
    },
    stop() {
      sync.stop();
    },
  };
}

function renamed(state: LocalWorkspaceState, title: string): LocalWorkspaceState {
  return {
    ...state,
    documentLibrary: {
      ...state.documentLibrary,
      documentsById: {
        original: { ...state.documentLibrary.documentsById.original, title },
      },
    },
  };
}

async function waitForStatus(sync: ReadingSync, read: () => ReadingSyncSnapshot, status: string): Promise<void> {
  sync.start();
  await vi.waitFor(() => expect(read().status).toBe(status), { timeout: 5_000 });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('reading sync', () => {
  it('automatically rebases independent edits after a 409 and saves one reading', async () => {
    const harness = createHarness();
    await waitForStatus(harness.sync, () => harness.snapshot, 'saved');
    harness.cloud.state.sessions[0] = {
      ...harness.cloud.state.sessions[0],
      document: { ...original.document, text: 'Newer cloud text' },
      revision: 2,
    };
    harness.update((state) => renamed(state, 'Local rename'));

    await vi.waitFor(() => expect(harness.cloud.state.sessions[0].document.title).toBe('Local rename'));
    expect(harness.cloud.state.sessions).toHaveLength(1);
    expect(harness.cloud.state.sessions[0].document.text).toBe('Newer cloud text');
    expect(harness.snapshot.conflicts).toEqual([]);
    expect(harness.cloud.state.sessions[0].revision).toBe(3);
    harness.stop();
  });

  it('holds overlapping edits through reload, then saves the explicit resolution', async () => {
    const first = createHarness();
    await waitForStatus(first.sync, () => first.snapshot, 'saved');
    first.cloud.state.sessions[0] = {
      ...first.cloud.state.sessions[0],
      document: { ...original.document, title: 'Cloud title' },
      revision: 2,
    };
    first.update((state) => renamed(state, 'Local title'));
    await vi.waitFor(() => expect(first.snapshot.status).toBe('conflict'));
    expect(first.cloud.state.sessions[0].document.title).toBe('Cloud title');
    const cachedState = first.state;
    first.stop();

    const second = createHarness(first.cloud, first.journal, cachedState);
    await waitForStatus(second.sync, () => second.snapshot, 'conflict');
    expect(buildReadingSessions(second.state)).toHaveLength(1);
    expect(second.state.documentLibrary.documentsById.original.title).toBe('Local title');
    expect(second.sync.resolveConflict(second.snapshot.conflicts[0], 'local')).toBe('original');
    await vi.waitFor(() => expect(second.cloud.state.sessions[0].document.title).toBe('Local title'));
    expect(second.snapshot.conflicts).toEqual([]);
    expect(second.cloud.state.sessions).toHaveLength(1);
    second.stop();
  });

  it('returns the recovered reading id after restoring a remotely deleted reading', async () => {
    const harness = createHarness();
    await waitForStatus(harness.sync, () => harness.snapshot, 'saved');
    harness.cloud.state.sessions = [];
    harness.update((state) => renamed(state, 'Offline title'));
    await vi.waitFor(() => expect(harness.snapshot.status).toBe('conflict'));
    expect(harness.snapshot.conflicts[0].remoteDeleted).toBe(true);
    const returned = harness.sync.resolveConflict(harness.snapshot.conflicts[0], 'local');
    const sessions = buildReadingSessions(harness.state);
    expect(returned).not.toBe('original');
    expect(returned).toBe(sessions[0].document.id);
    expect(sessions[0].document.title).toContain('(recovered)');
    harness.stop();
  });

  it('recognizes a successful save whose response was lost without creating a duplicate', async () => {
    const harness = createHarness();
    harness.cloud.saveNext = async (snapshot, revision) => {
      await harness.cloud.persistSession(snapshot, revision);
      throw new Error('Connection lost');
    };
    await waitForStatus(harness.sync, () => harness.snapshot, 'saved');
    harness.update((state) => renamed(state, 'Saved before disconnect'));
    await vi.waitFor(() => expect(harness.snapshot.status).toBe('error'));
    harness.sync.retry();
    await vi.waitFor(() => expect(harness.snapshot.status).toBe('saved'));
    expect(harness.snapshot.conflicts).toEqual([]);
    expect(harness.cloud.state.sessions).toHaveLength(1);
    expect(harness.cloud.saves).toBe(1);
    harness.stop();
  });

  it('does not loop when another writer repeatedly changes the reading', async () => {
    const harness = createHarness();
    await waitForStatus(harness.sync, () => harness.snapshot, 'saved');
    harness.cloud.saveNext = async () => {
      throw new RemoteApiError('Changed again', 409);
    };
    const originalSave = harness.cloud.saveSession.bind(harness.cloud);
    harness.cloud.saveSession = async (snapshot, revision) => {
      harness.cloud.saves += 1;
      return harness.cloud.saveNext
        ? harness.cloud.saveNext(snapshot, revision)
        : harness.cloud.persistSession(snapshot, revision);
    };
    harness.update((state) => renamed(state, 'Local title'));
    await vi.waitFor(() => expect(harness.snapshot.status).toBe('error'));
    expect(harness.cloud.saves).toBe(2);
    expect(harness.cloud.loads).toBe(2);
    expect(harness.state.documentLibrary.documentsById.original.title).toBe('Local title');
    harness.cloud.saveSession = originalSave;
    harness.stop();
  });

  it('journals offline edits and compares them after reconnecting', async () => {
    const first = createHarness();
    await waitForStatus(first.sync, () => first.snapshot, 'saved');
    const initial = first.state;
    first.stop();
    first.cloud.loadNext = async () => {
      throw new Error('Offline');
    };
    const second = createHarness(first.cloud, first.journal, initial);
    await waitForStatus(second.sync, () => second.snapshot, 'offline');
    second.update((state) => renamed(state, 'Offline title'));
    expect(second.journal.value.dirtySessionIds).toContain('original');
    second.cloud.state.sessions[0] = {
      ...second.cloud.state.sessions[0],
      document: { ...original.document, text: 'New cloud text' },
      revision: 2,
    };
    second.sync.retry();
    await vi.waitFor(() => expect(second.cloud.state.sessions[0].document.title).toBe('Offline title'));
    expect(second.cloud.state.sessions[0].document.text).toBe('New cloud text');
    second.stop();
  });

  it('accepts cloud edits after an offline reload with no local changes', async () => {
    const first = createHarness();
    await waitForStatus(first.sync, () => first.snapshot, 'saved');
    const cached = first.state;
    first.stop();
    first.cloud.loadNext = async () => {
      throw new Error('Offline');
    };
    const second = createHarness(first.cloud, first.journal, cached);
    await waitForStatus(second.sync, () => second.snapshot, 'offline');
    expect(second.journal.value.dirtySessionIds).toEqual([]);
    second.cloud.state.sessions[0] = {
      ...second.cloud.state.sessions[0],
      document: { ...original.document, title: 'Cloud title' },
      revision: 2,
    };
    second.sync.retry();
    await vi.waitFor(() => expect(second.snapshot.status).toBe('saved'));
    expect(second.state.documentLibrary.documentsById.original.title).toBe('Cloud title');
    expect(second.snapshot.conflicts).toEqual([]);
    expect(second.cloud.saves).toBe(0);
    second.stop();
  });

  it('preserves edits made while the initial cloud request is pending', async () => {
    const harness = createHarness();
    const pendingLoad: { receive?: (state: CloudWorkspaceState) => void } = {};
    harness.cloud.loadNext = () => new Promise<CloudWorkspaceState>((resolve) => {
      pendingLoad.receive = resolve;
    });
    harness.sync.start();
    await vi.waitFor(() => expect(harness.cloud.loads).toBe(1));
    harness.update((state) => renamed(state, 'Typed while loading'));
    pendingLoad.receive?.(structuredClone(harness.cloud.state));
    await vi.waitFor(() => expect(harness.snapshot.status).toBe('conflict'));
    expect(harness.state.documentLibrary.documentsById.original.title).toBe('Typed while loading');
    expect(harness.cloud.state.sessions[0].document.title).toBe('Original title');
    harness.stop();
  });

  it('keeps edits made during an in-flight save pending for the following save', async () => {
    const harness = createHarness();
    const pendingSave: { release?: () => void } = {};
    harness.cloud.saveNext = async (snapshot, revision) => {
      await new Promise<void>((resolve) => {
        pendingSave.release = resolve;
      });
      return harness.cloud.persistSession(snapshot, revision);
    };
    await waitForStatus(harness.sync, () => harness.snapshot, 'saved');
    harness.update((state) => renamed(state, 'First edit'));
    await vi.waitFor(() => expect(harness.cloud.saves).toBe(1));
    harness.update((state) => renamed(state, 'Second edit'));
    pendingSave.release?.();
    expect(harness.journal.value.dirtySessionIds).toContain('original');
    await vi.waitFor(() => expect(harness.cloud.state.sessions[0].document.title).toBe('Second edit'));
    expect(harness.cloud.saves).toBe(2);
    expect(harness.cloud.state.sessions).toHaveLength(1);
    harness.stop();
  });

  it('warns when browser storage cannot retain the sync journal', async () => {
    const harness = createHarness(createMemoryCloud(), createMemoryJournal(true));
    harness.sync.start();
    await vi.waitFor(() => expect(harness.snapshot.error).toContain('Keep this page open'));
    expect(harness.state.documentLibrary.documentsById.original.title).toBe('Original title');
    harness.stop();
  });
});
