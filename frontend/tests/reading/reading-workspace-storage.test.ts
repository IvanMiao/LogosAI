import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TextAnchor } from '@/features/anchors';
import { writeStoredAnchors } from '@/features/anchors';
import type { Artifact } from '@/features/artifacts';
import { writeStoredArtifacts } from '@/features/artifacts';
import type { LocalWorkspaceState } from '@/features/reading/reading-cloud-state';
import { deleteDocument } from '@/features/reading/reading-workspace';
import { writeLocalWorkspace } from '@/features/reading/reading-workspace-storage';
import type { WorkspaceDocument } from '@/features/reading';
import {
  DEFAULT_READER_PREFERENCES,
  writeStoredDocumentLibrary,
} from '@/features/reading/reading-storage';

const userId = 'storage-failure-test';
const document: WorkspaceDocument = {
  id: 'target',
  title: 'Target',
  text: 'Target text',
  sourceType: 'paste',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const anchor: TextAnchor = {
  id: 'target-anchor',
  documentId: document.id,
  scope: 'selection',
  quote: 'Target',
  normalizedQuote: 'target',
  quoteHash: 'target',
  startOffset: 0,
  endOffset: 6,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const artifact: Artifact = {
  id: 'target-note',
  documentId: document.id,
  anchorId: anchor.id,
  type: 'note',
  title: 'Target note',
  content: 'Remember this',
  status: 'complete',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const libraryKey = `logosai.workspace.documentLibrary:v2:${userId}`;
const anchorsKey = `logosai.workspace.anchors:v1:${userId}`;
const artifactsKey = `logosai.workspace.artifacts:v1:${userId}`;

function createWorkspace(): LocalWorkspaceState {
  return {
    documentLibrary: {
      activeDocumentId: document.id,
      documentsById: { [document.id]: document },
    },
    anchorStorage: {
      anchorsById: { [anchor.id]: anchor },
      activeAnchorId: anchor.id,
      activeAnchorIdByDocumentId: { [document.id]: anchor.id },
    },
    artifactStorage: {
      artifactsByAnchorId: { [anchor.id]: [artifact] },
      tasksByRequestId: {},
    },
    readerPreferences: DEFAULT_READER_PREFERENCES,
    analysisLanguage: 'en',
  };
}

describe('reading workspace storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not persist annotation deletions when the document library write fails', () => {
    const previous = createWorkspace();
    writeStoredDocumentLibrary(previous.documentLibrary, userId);
    writeStoredAnchors(previous.anchorStorage, userId);
    writeStoredArtifacts(previous.artifactStorage, userId);
    const storedAnchors = localStorage.getItem(anchorsKey);
    const storedArtifacts = localStorage.getItem(artifactsKey);
    const next = deleteDocument(previous, document.id);
    const originalSetItem = Storage.prototype.setItem;

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === libraryKey) throw new DOMException('Storage unavailable', 'QuotaExceededError');
      originalSetItem.call(this, key, value);
    });

    expect(writeLocalWorkspace(previous, next, userId)).toBe(false);
    expect(localStorage.getItem(anchorsKey)).toBe(storedAnchors);
    expect(localStorage.getItem(artifactsKey)).toBe(storedArtifacts);
  });
});
