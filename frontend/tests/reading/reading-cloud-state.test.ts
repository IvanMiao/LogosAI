import type { ReadingConflict } from '@/features/reading/reading-session-merge';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildReadingSessions,
  createLocalWorkspaceState,
  mergeCloudWorkspace,
  type LocalWorkspaceState,
} from '@/features/reading/reading-cloud-state';
import {
  readWorkspaceSyncJournal,
  writeWorkspaceSyncJournal,
  type WorkspaceSyncJournal,
} from '@/features/reading/reading-sync-journal';

const NOW = '2026-08-09T12:00:00.000Z';

function createLocalState(): LocalWorkspaceState {
  return {
    documentLibrary: {
      activeDocumentId: 'document-1',
      documentsById: {
        'document-1': {
          id: 'document-1',
          title: 'Session one',
          text: 'Read this sentence.',
          sourceType: 'paste',
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
    },
    anchorStorage: {
      anchorsById: {
        'anchor-1': {
          id: 'anchor-1',
          documentId: 'document-1',
          scope: 'selection',
          quote: 'sentence',
          normalizedQuote: 'sentence',
          quoteHash: 'hash',
          startOffset: 10,
          endOffset: 18,
          createdAt: NOW,
        },
      },
      activeAnchorId: 'anchor-1',
      activeAnchorIdByDocumentId: { 'document-1': 'anchor-1' },
    },
    artifactStorage: {
      artifactsByAnchorId: {
        'anchor-1': [{
          id: 'note-1',
          documentId: 'document-1',
          anchorId: 'anchor-1',
          type: 'note',
          title: 'Note',
          content: 'Important image.',
          status: 'draft',
          createdAt: NOW,
          updatedAt: NOW,
        }],
      },
      tasksByRequestId: {},
    },
    readerPreferences: {
      fontFamily: 'serif',
      closeReadingFontFamily: 'sans',
      fontLinked: false,
      fontSize: 18,
      lineSpacing: 1.75,
      lineWidth: 760,
    },
    analysisLanguage: 'en',
  };
}

describe('reading cloud state', () => {
  beforeEach(() => localStorage.clear());

  it('does not attach the previous reading anchor to a newly imported reading', () => {
    const local = createLocalState();
    local.documentLibrary.documentsById['document-2'] = {
      ...local.documentLibrary.documentsById['document-1'],
      id: 'document-2',
      title: 'New reading',
    };
    local.documentLibrary.activeDocumentId = 'document-2';

    const sessions = buildReadingSessions(local);

    expect(sessions.find((session) => session.document.id === 'document-2'))
      .toMatchObject({ activeAnchorId: null, anchors: [], artifacts: [] });
    expect(sessions.find((session) => session.document.id === 'document-1')?.activeAnchorId)
      .toBe('anchor-1');
  });

  it('round-trips documents, anchors, and artifacts by session', () => {
    const local = createLocalState();
    const sessions = buildReadingSessions(local);
    const restored = createLocalWorkspaceState(sessions, {
      activeDocumentId: 'document-1',
      readerPreferences: local.readerPreferences,
      analysisLanguage: 'en',
    });

    expect(restored.documentLibrary).toEqual(local.documentLibrary);
    expect(restored.anchorStorage.anchorsById).toEqual(local.anchorStorage.anchorsById);
    expect(restored.artifactStorage.artifactsByAnchorId).toEqual(
      local.artifactStorage.artifactsByAnchorId,
    );
  });

  it('keeps streaming stages out of cloud session snapshots', () => {
    const local = createLocalState();
    local.artifactStorage.artifactsByAnchorId['anchor-1'][0].stage = 'interpret';

    const [session] = buildReadingSessions(local);

    expect(session.artifacts[0]).not.toHaveProperty('stage');
    expect(local.artifactStorage.artifactsByAnchorId['anchor-1'][0].stage).toBe('interpret');
  });

  it('keeps an unsynced local session instead of restoring older cloud data', () => {
    const local = createLocalState();
    const remoteSession = {
      ...buildReadingSessions(local)[0],
      artifacts: [{
        ...buildReadingSessions(local)[0].artifacts[0],
        content: 'Cloud version.',
        updatedAt: '2026-08-09T13:00:00.000Z',
      }],
      revision: 2,
      syncedAt: '2026-08-09T13:00:00.000Z',
    };
    const journal: WorkspaceSyncJournal = {
      knownSessionIds: ['document-1'],
      revisions: { 'document-1': 2 },
      dirtySessionIds: ['document-1'],
      deletedSessionIds: [],
      preferencesDirty: false,
    };

    const merged = mergeCloudWorkspace(local, {
      preferences: {
        activeDocumentId: 'document-1',
        readerPreferences: local.readerPreferences,
        analysisLanguage: 'en',
      },
      sessions: [remoteSession],
    }, journal);

    expect(merged.artifactStorage.artifactsByAnchorId['anchor-1'][0].content)
      .toBe('Important image.');
  });

  it('preserves a pending session deletion across a reload', () => {
    const previous = createLocalState();
    const remoteSession = {
      ...buildReadingSessions(previous)[0],
      revision: 1,
      syncedAt: NOW,
    };
    const local = createLocalWorkspaceState([], {
      activeDocumentId: null,
      readerPreferences: previous.readerPreferences,
      analysisLanguage: 'en',
    });

    const merged = mergeCloudWorkspace(local, {
      preferences: {
        activeDocumentId: 'document-1',
        readerPreferences: previous.readerPreferences,
        analysisLanguage: 'en',
      },
      sessions: [remoteSession],
    }, {
      knownSessionIds: ['document-1'],
      dirtySessionIds: [],
      revisions: { 'document-1': 1 },
      deletedSessionIds: ['document-1'],
      preferencesDirty: true,
    });

    expect(merged.documentLibrary.documentsById).toEqual({});
    expect(merged.documentLibrary.activeDocumentId).toBeNull();
  });

  it('does not restore a clean local session deleted from another device', () => {
    const local = createLocalState();

    const merged = mergeCloudWorkspace(local, {
      preferences: {
        activeDocumentId: null,
        readerPreferences: local.readerPreferences,
        analysisLanguage: 'en',
      },
      sessions: [],
    }, {
      knownSessionIds: ['document-1'],
      dirtySessionIds: [],
      deletedSessionIds: [],
      preferencesDirty: false,
    });

    expect(merged.documentLibrary.documentsById).toEqual({});
    expect(merged.documentLibrary.activeDocumentId).toBeNull();
  });

  it('keeps a locally changed session when its remote copy was deleted', () => {
    const local = createLocalState();

    const merged = mergeCloudWorkspace(local, {
      preferences: {
        activeDocumentId: null,
        readerPreferences: local.readerPreferences,
        analysisLanguage: 'en',
      },
      sessions: [],
    }, {
      knownSessionIds: ['document-1'],
      dirtySessionIds: ['document-1'],
      deletedSessionIds: [],
      preferencesDirty: false,
    });

    expect(merged.documentLibrary.documentsById).toHaveProperty('document-1');
    expect(Object.values(merged.documentLibrary.documentsById)).toHaveLength(1);
  });


  it('keeps legacy local edits in place for review without duplicating a reading', () => {
    const local = createLocalState();
    const base = buildReadingSessions(local)[0];
    local.documentLibrary.documentsById['document-1'].title = 'Stale tab rename';
    const cloud = { preferences: { activeDocumentId: 'document-1',
      readerPreferences: local.readerPreferences, analysisLanguage: 'en' as const },
      sessions: [{ ...base, document: { ...base.document, title: 'Cloud title' },
        artifacts: [{ ...base.artifacts[0], content: 'Newer saved cloud note' }], revision: 2, syncedAt: NOW }] };
    const merged = mergeCloudWorkspace(local, cloud, {
      knownSessionIds: ['document-1'], dirtySessionIds: ['document-1'],
      deletedSessionIds: [], preferencesDirty: false, revisions: { 'document-1': 1 },
    });
    const sessions = buildReadingSessions(merged);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].document.title).toBe('Stale tab rename');
    expect(sessions[0].artifacts[0].content).toBe('Important image.');
    expect(cloud.sessions[0].artifacts[0].content).toBe('Newer saved cloud note');
  });

  it('does not replay a stale deletion over a newly changed cloud reading', () => {
    const previous = createLocalState();
    const conflicts: ReadingConflict[] = [];
    const preferences = { activeDocumentId: null, readerPreferences: previous.readerPreferences,
      analysisLanguage: 'en' as const };
    const merged = mergeCloudWorkspace(createLocalWorkspaceState([], preferences), {
      preferences, sessions: [{ ...buildReadingSessions(previous)[0], revision: 2, syncedAt: NOW }],
    }, { knownSessionIds: ['document-1'], dirtySessionIds: [], deletedSessionIds: ['document-1'],
      preferencesDirty: true, revisions: { 'document-1': 1 } }, conflicts);
    expect(merged.documentLibrary.documentsById).not.toHaveProperty('document-1');
    expect(conflicts).toMatchObject([{ sessionId: 'document-1', localDeleted: true }]);
  });

  it('hydrates cloud preferences when the remote session library is empty', () => {
    const local = createLocalWorkspaceState([], {
      activeDocumentId: null,
      readerPreferences: createLocalState().readerPreferences,
      analysisLanguage: 'en',
    });
    const cloudPreferences = {
      activeDocumentId: null,
      readerPreferences: {
        fontFamily: 'sans' as const,
        closeReadingFontFamily: 'serif' as const,
        fontLinked: false,
        fontSize: 22,
        lineSpacing: 2,
        lineWidth: 760,
      },
      analysisLanguage: 'fr' as const,
    };

    const merged = mergeCloudWorkspace(local, {
      preferences: cloudPreferences,
      sessions: [],
    }, {
      knownSessionIds: [],
      dirtySessionIds: [],
      deletedSessionIds: [],
      preferencesDirty: false,
    });

    expect(merged.readerPreferences).toEqual(cloudPreferences.readerPreferences);
    expect(merged.analysisLanguage).toBe('fr');
  });

  it('stores the sync journal under the authenticated user scope', () => {
    const journal: WorkspaceSyncJournal = {
      knownSessionIds: ['document-1'],
      dirtySessionIds: ['document-1'],
      deletedSessionIds: [],
      preferencesDirty: true,
    };

    writeWorkspaceSyncJournal('user-1', journal);

    expect(readWorkspaceSyncJournal('user-1')).toEqual(journal);
    expect(readWorkspaceSyncJournal('user-2')).not.toEqual(journal);
  });
});
