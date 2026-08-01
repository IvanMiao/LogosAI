import { describe, expect, it, beforeEach } from 'vitest';
import {
  DEFAULT_ANALYSIS_LANGUAGE,
  DEFAULT_CLOSE_READING_SOURCE_WIDTH,
  DEFAULT_READER_PREFERENCES,
  MAX_CLOSE_READING_SOURCE_WIDTH,
  MIN_CLOSE_READING_SOURCE_WIDTH,
  readStoredAnalysisLanguage,
  readStoredCloseReadingSourceWidth,
  readStoredDocument,
  readStoredReaderPreferences,
  writeStoredAnalysisLanguage,
  writeStoredCloseReadingSourceWidth,
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
      closeReadingFontFamily: 'serif' as const,
      fontSize: 20,
      lineSpacing: 1.9,
    };

    writeStoredReaderPreferences(preferences);

    expect(readStoredReaderPreferences()).toEqual(preferences);
  });

  it('adds the default Close Reading font to legacy reader preferences', () => {
    localStorage.setItem(
      'logosai.workspace.readerPreferences:v1',
      '{"fontFamily":"mono","fontSize":20,"lineSpacing":1.9}',
    );

    expect(readStoredReaderPreferences()).toEqual({
      fontFamily: 'mono',
      closeReadingFontFamily: 'sans',
      fontSize: 20,
      lineSpacing: 1.9,
    });
  });

  it('falls back to default reader preferences for invalid data', () => {
    localStorage.setItem('logosai.workspace.readerPreferences:v1', '{"fontSize":"large"}');

    expect(readStoredReaderPreferences()).toEqual(DEFAULT_READER_PREFERENCES);
  });

  it('persists and restores the analysis language', () => {
    writeStoredAnalysisLanguage('fr');

    expect(readStoredAnalysisLanguage()).toBe('fr');
  });

  it('falls back to the default analysis language for invalid data', () => {
    localStorage.setItem('logosai.workspace.analysisLanguage:v1', 'invalid');

    expect(readStoredAnalysisLanguage()).toBe(DEFAULT_ANALYSIS_LANGUAGE);
  });

  it('persists and restores the Close Reading source width', () => {
    writeStoredCloseReadingSourceWidth(46);

    expect(readStoredCloseReadingSourceWidth()).toBe(46);
  });

  it('clamps invalid Close Reading source widths to readable limits', () => {
    writeStoredCloseReadingSourceWidth(5);
    expect(readStoredCloseReadingSourceWidth()).toBe(MIN_CLOSE_READING_SOURCE_WIDTH);

    writeStoredCloseReadingSourceWidth(95);
    expect(readStoredCloseReadingSourceWidth()).toBe(MAX_CLOSE_READING_SOURCE_WIDTH);

    localStorage.setItem('logosai.workspace.closeReadingSourceWidth:v1', 'wide');
    expect(readStoredCloseReadingSourceWidth()).toBe(DEFAULT_CLOSE_READING_SOURCE_WIDTH);
  });
});
