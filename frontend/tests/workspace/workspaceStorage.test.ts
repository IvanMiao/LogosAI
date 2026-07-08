import { describe, expect, it, beforeEach } from 'vitest';
import {
  DEFAULT_READER_PREFERENCES,
  readStoredDocument,
  readStoredReaderPreferences,
  writeStoredDocument,
  writeStoredReaderPreferences,
} from '@/pages/workspace/workspace-storage';
import type { WorkspaceDocument } from '@/pages/workspace/workspace.types';

const document: WorkspaceDocument = {
  id: 'document-test',
  title: 'Test document',
  text: 'First paragraph.\n\nSecond paragraph.',
  sourceType: 'paste',
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
};

describe('workspace storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and restores the active document', () => {
    writeStoredDocument(document);

    expect(readStoredDocument()).toEqual(document);
  });

  it('removes the active document when null is written', () => {
    writeStoredDocument(document);
    writeStoredDocument(null);

    expect(readStoredDocument()).toBeNull();
  });

  it('persists and restores reader preferences', () => {
    const preferences = {
      fontFamily: 'mono' as const,
      fontSize: 20,
      lineSpacing: 1.9,
    };

    writeStoredReaderPreferences(preferences);

    expect(readStoredReaderPreferences()).toEqual(preferences);
  });

  it('falls back to default reader preferences for invalid data', () => {
    localStorage.setItem('logosai.workspace.readerPreferences:v1', '{"fontSize":"large"}');

    expect(readStoredReaderPreferences()).toEqual(DEFAULT_READER_PREFERENCES);
  });
});
