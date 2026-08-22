import { describe, expect, it } from 'vitest';
import type { WorkspaceDocument } from '@/features/reading';
import {
  addDocumentToLibrary,
  closeLibraryDocument,
  listLibraryDocuments,
  openLibraryDocument,
  removeDocumentFromLibrary,
  renameLibraryDocument,
} from '@/features/reading/reading-library';
import { createEmptyDocumentLibrary } from '@/features/reading/reading-storage';
import {
  createWorkspaceDocument,
  formatDocumentLength,
} from '@/features/reading/reading-core';

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

describe('reading document library', () => {
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

  it('uses the supplied session title before generating one from the source text', () => {
    const document = createWorkspaceDocument(
      '# Generated title\n\nBody',
      'paste',
      'Untitled document',
      '  Reading group notes  ',
    );

    expect(document.title).toBe('Reading group notes');
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

describe('formatDocumentLength', () => {
  it('counts words for space-separated scripts', () => {
    expect(formatDocumentLength('Alpha beta gamma')).toBe('3 words');
    expect(formatDocumentLength('  Alpha  ')).toBe('1 word');
    expect(formatDocumentLength('')).toBe('0 words');
  });

  it('counts characters for scripts written without spaces', () => {
    // Splitting on whitespace reported "1 word" for any Chinese text, which is
    // the language the analysis options lead with.
    expect(formatDocumentLength('康德在纯粹理性批判中提出先验综合判断。')).toBe('19 characters');
    expect(formatDocumentLength('日本語のテキスト')).toBe('8 characters');
    expect(formatDocumentLength('中文')).toBe('2 characters');
  });

  it('ignores whitespace when counting characters', () => {
    expect(formatDocumentLength('中文\n\n段落')).toBe('4 characters');
  });
});
