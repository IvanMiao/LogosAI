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
