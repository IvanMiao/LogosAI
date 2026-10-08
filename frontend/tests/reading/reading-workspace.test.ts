import { describe, expect, it } from 'vitest';
import type { TextAnchor } from '@/features/anchors';
import type { Artifact } from '@/features/artifacts';
import type { LocalWorkspaceState } from '@/features/reading/reading-cloud-state';
import {
  deleteAnchor,
  deleteDocument,
  updateReaderPreference,
} from '@/features/reading/reading-workspace';
import { DEFAULT_READER_PREFERENCES } from '@/features/reading/reading-storage';
import type { WorkspaceDocument } from '@/features/reading';

const firstDocument: WorkspaceDocument = {
  id: 'first',
  title: 'First',
  text: 'First text',
  sourceType: 'paste',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  lastOpenedAt: '2026-01-01T00:00:00.000Z',
};
const secondDocument: WorkspaceDocument = {
  ...firstDocument,
  id: 'second',
  title: 'Second',
  lastOpenedAt: '2026-01-02T00:00:00.000Z',
};

function anchor(id: string, documentId: string): TextAnchor {
  return {
    id,
    documentId,
    scope: 'selection',
    quote: `Quote ${id}`,
    normalizedQuote: `quote ${id}`,
    quoteHash: id,
    startOffset: 0,
    endOffset: 5,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function artifact(id: string, documentId: string, anchorId: string): Artifact {
  return {
    id,
    documentId,
    anchorId,
    type: 'note',
    title: `Note ${id}`,
    content: id,
    status: 'complete',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function workspace(): LocalWorkspaceState {
  const firstAnchor = anchor('first-anchor', 'first');
  const secondAnchor = anchor('second-anchor', 'second');
  return {
    documentLibrary: {
      activeDocumentId: firstDocument.id,
      documentsById: { first: firstDocument, second: secondDocument },
    },
    anchorStorage: {
      anchorsById: { [firstAnchor.id]: firstAnchor, [secondAnchor.id]: secondAnchor },
      activeAnchorId: firstAnchor.id,
      activeAnchorIdByDocumentId: { first: firstAnchor.id, second: secondAnchor.id },
    },
    artifactStorage: {
      artifactsByAnchorId: {
        [firstAnchor.id]: [artifact('first-note', 'first', firstAnchor.id)],
        [secondAnchor.id]: [artifact('second-note', 'second', secondAnchor.id)],
      },
      tasksByRequestId: {},
    },
    readerPreferences: DEFAULT_READER_PREFERENCES,
    analysisLanguage: 'en',
  };
}

describe('reading workspace transformations', () => {
  it('deletes a document and its anchors and artifacts while preserving other documents', () => {
    const state = workspace();
    const next = deleteDocument(state, 'first');

    expect(next.documentLibrary.activeDocumentId).toBe('second');
    expect(next.documentLibrary.documentsById).toEqual({ second: secondDocument });
    expect(next.anchorStorage.anchorsById).toEqual({ 'second-anchor': state.anchorStorage.anchorsById['second-anchor'] });
    expect(next.artifactStorage.artifactsByAnchorId).toEqual({
      'second-anchor': state.artifactStorage.artifactsByAnchorId['second-anchor'],
    });
    expect(next.documentLibrary.documentsById.second).toBe(state.documentLibrary.documentsById.second);
  });

  it('keeps the active document when deleting another document', () => {
    const state = workspace();
    state.documentLibrary.activeDocumentId = 'second';

    expect(deleteDocument(state, 'first').documentLibrary.activeDocumentId).toBe('second');
  });

  it('deletes an anchor and its artifacts and clears it only when active', () => {
    const state = workspace();
    const next = deleteAnchor(state, 'first-anchor', 'first');

    expect(next.anchorStorage.anchorsById['first-anchor']).toBeUndefined();
    expect(next.anchorStorage.activeAnchorIdByDocumentId?.first).toBeNull();
    expect(next.artifactStorage.artifactsByAnchorId['first-anchor']).toBeUndefined();
    expect(next.anchorStorage.activeAnchorIdByDocumentId?.second).toBe('second-anchor');
    expect(next.artifactStorage.artifactsByAnchorId['second-anchor']).toEqual(
      state.artifactStorage.artifactsByAnchorId['second-anchor'],
    );

    const inactive = deleteAnchor(state, 'second-anchor', 'first');
    expect(inactive.anchorStorage.activeAnchorIdByDocumentId?.first).toBe('first-anchor');
    expect(inactive.anchorStorage.activeAnchorIdByDocumentId?.second).toBe('second-anchor');
  });

  it('returns the same state for unknown document and anchor ids', () => {
    const state = workspace();

    expect(deleteDocument(state, 'missing')).toBe(state);
    expect(deleteAnchor(state, 'missing', 'first')).toBe(state);
  });

  it('preserves linked reader-font preferences', () => {
    const state = workspace();
    const changedFont = updateReaderPreference(state, 'fontFamily', 'mono');
    expect(changedFont.readerPreferences.fontFamily).toBe('mono');
    expect(changedFont.readerPreferences.closeReadingFontFamily).toBe('mono');

    const unlinked = {
      ...state,
      readerPreferences: { ...state.readerPreferences, fontLinked: false },
    };
    expect(updateReaderPreference(unlinked, 'fontFamily', 'sans').readerPreferences.closeReadingFontFamily)
      .toBe(state.readerPreferences.closeReadingFontFamily);
    expect(updateReaderPreference(unlinked, 'fontLinked', true).readerPreferences.closeReadingFontFamily)
      .toBe(unlinked.readerPreferences.fontFamily);
  });
});
