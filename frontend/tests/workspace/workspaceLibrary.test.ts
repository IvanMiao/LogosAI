import { describe, expect, it } from 'vitest';
import type { WorkspaceDocument } from '@/features/reading';
import {
  addDocumentToLibrary,
  closeLibraryDocument,
  listLibraryDocuments,
  openLibraryDocument,
  removeDocumentFromLibrary,
  renameLibraryDocument,
} from '@/pages/workspace/workspace-library';
import { createEmptyDocumentLibrary } from '@/pages/workspace/workspace-storage';
import { createWorkspaceDocument } from '@/pages/workspace/workspace.helpers';

const firstDocument: WorkspaceDocument = {
  id: 'document-first',
  title: 'First document',
  text: 'Alpha source text',
  sourceType: 'paste',
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
};

const secondDocument: WorkspaceDocument = {
  id: 'document-second',
  title: 'Second document',
  text: 'Beta source text',
  sourceType: 'file',
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
};

describe('workspace document library', () => {
  it('uses the file name instead of source text for an uploaded document title', () => {
    const document = createWorkspaceDocument('Opening words in the file.', 'file', 'my-book.md');

    expect(document.title).toBe('my-book');
  });

  it('uses a Markdown heading for a pasted document title', () => {
    const document = createWorkspaceDocument(
      'A preface before the heading.\n\n# Deliberate title\n\nBody',
      'paste',
    );

    expect(document.title).toBe('Deliberate title');
  });

  it('adds documents without replacing earlier documents', () => {
    const withFirst = addDocumentToLibrary(createEmptyDocumentLibrary(), firstDocument);
    const withSecond = addDocumentToLibrary(withFirst, secondDocument);

    expect(Object.keys(withSecond.documentsById)).toHaveLength(2);
    expect(withSecond.activeDocumentId).toBe(secondDocument.id);
  });

  it('switches documents and keeps the previous document available', () => {
    const library = addDocumentToLibrary(
      addDocumentToLibrary(createEmptyDocumentLibrary(), firstDocument),
      secondDocument,
    );

    const switched = openLibraryDocument(
      library,
      firstDocument.id,
      '2026-08-02T10:00:00.000Z',
    );

    expect(switched.activeDocumentId).toBe(firstDocument.id);
    expect(switched.documentsById[secondDocument.id]).toBeDefined();
    expect(switched.documentsById[firstDocument.id].lastOpenedAt)
      .toBe('2026-08-02T10:00:00.000Z');
  });

  it('closes the reader without deleting its active document', () => {
    const library = addDocumentToLibrary(createEmptyDocumentLibrary(), firstDocument);

    expect(closeLibraryDocument(library)).toEqual({
      activeDocumentId: null,
      documentsById: library.documentsById,
    });
  });

  it('renames a document without changing its source text', () => {
    const library = addDocumentToLibrary(createEmptyDocumentLibrary(), firstDocument);
    const renamed = renameLibraryDocument(
      library,
      firstDocument.id,
      '  A clearer title  ',
      '2026-08-02T11:00:00.000Z',
    );

    expect(renamed.documentsById[firstDocument.id]).toMatchObject({
      title: 'A clearer title',
      text: firstDocument.text,
      updatedAt: '2026-08-02T11:00:00.000Z',
    });
  });

  it('selects the most recently opened remaining document after deletion', () => {
    const withFirst = addDocumentToLibrary(
      createEmptyDocumentLibrary(),
      firstDocument,
      '2026-08-02T08:00:00.000Z',
    );
    const library = addDocumentToLibrary(
      withFirst,
      secondDocument,
      '2026-08-02T09:00:00.000Z',
    );

    const remaining = removeDocumentFromLibrary(library, secondDocument.id);

    expect(remaining.activeDocumentId).toBe(firstDocument.id);
    expect(remaining.documentsById[secondDocument.id]).toBeUndefined();
  });

  it('searches title and source text while preserving recent-first order', () => {
    const withFirst = addDocumentToLibrary(
      createEmptyDocumentLibrary(),
      firstDocument,
      '2026-08-02T08:00:00.000Z',
    );
    const library = addDocumentToLibrary(
      withFirst,
      secondDocument,
      '2026-08-02T09:00:00.000Z',
    );

    expect(listLibraryDocuments(library).map((document) => document.id))
      .toEqual([secondDocument.id, firstDocument.id]);
    expect(listLibraryDocuments(library, 'alpha').map((document) => document.id))
      .toEqual([firstDocument.id]);
  });
});
