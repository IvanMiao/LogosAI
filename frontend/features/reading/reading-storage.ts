import type {
  AnalysisLanguage,
  ReaderFontFamily,
  ReaderPreferences,
  WorkspaceDocument,
  WorkspaceDocumentLibrary,
} from './reading-types';
import {
  readScopedStorage,
  removeScopedStorage,
  writeScopedStorage,
} from '@/utils/scoped-storage';

const LEGACY_DOCUMENT_STORAGE_KEY = 'logosai.workspace.document:v1';
const DOCUMENT_LIBRARY_STORAGE_KEY = 'logosai.workspace.documentLibrary:v2';
const READER_PREFERENCES_STORAGE_KEY = 'logosai.workspace.readerPreferences:v1';
const ANALYSIS_LANGUAGE_STORAGE_KEY = 'logosai.workspace.analysisLanguage:v1';
const LEGACY_CLOSE_READING_SOURCE_WIDTH_KEY = 'logosai.workspace.closeReadingSourceWidth:v1';
const CLOSE_READING_SOURCE_WIDTH_KEY = 'logosai.workspace.closeReadingSourceWidth:v2';

export const DEFAULT_ANALYSIS_LANGUAGE: AnalysisLanguage = 'en';
export const DEFAULT_CLOSE_READING_SOURCE_WIDTH = 42;
export const MIN_CLOSE_READING_SOURCE_WIDTH = 32;
export const MAX_CLOSE_READING_SOURCE_WIDTH = 68;

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  fontFamily: 'serif',
  closeReadingFontFamily: 'serif',
  fontLinked: true,
  fontSize: 18,
  lineSpacing: 1.75,
  lineWidth: 760,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWorkspaceDocument(value: unknown): value is WorkspaceDocument {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.text === 'string'
    && typeof value.sourceType === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (value.lastOpenedAt === undefined || typeof value.lastOpenedAt === 'string')
  );
}

function normalizeDocumentLibrary(value: unknown): WorkspaceDocumentLibrary | null {
  if (!isRecord(value) || !isRecord(value.documentsById)) {
    return null;
  }

  const documents = Object.values(value.documentsById);
  if (!documents.every(isWorkspaceDocument)) {
    return null;
  }

  const activeDocumentId = typeof value.activeDocumentId === 'string'
    && isWorkspaceDocument(value.documentsById[value.activeDocumentId])
    ? value.activeDocumentId
    : null;

  return {
    activeDocumentId,
    documentsById: value.documentsById as Record<string, WorkspaceDocument>,
  };
}

export function createEmptyDocumentLibrary(): WorkspaceDocumentLibrary {
  return { activeDocumentId: null, documentsById: {} };
}

export function getActiveDocument(
  library: WorkspaceDocumentLibrary,
): WorkspaceDocument | null {
  if (!library.activeDocumentId) {
    return null;
  }

  return library.documentsById[library.activeDocumentId] ?? null;
}

function isReaderFontFamily(value: unknown): value is ReaderFontFamily {
  return value === 'serif' || value === 'sans' || value === 'mono';
}

function normalizeReaderPreferences(value: unknown): ReaderPreferences | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isReaderFontFamily(value.fontFamily)
    || typeof value.fontSize !== 'number'
    || typeof value.lineSpacing !== 'number'
  ) {
    return null;
  }

  return {
    fontFamily: value.fontFamily,
    closeReadingFontFamily: isReaderFontFamily(value.closeReadingFontFamily)
      ? value.closeReadingFontFamily
      : value.fontFamily,
    fontLinked: typeof value.fontLinked === 'boolean'
      ? value.fontLinked
      : value.closeReadingFontFamily === value.fontFamily,
    fontSize: value.fontSize,
    lineSpacing: value.lineSpacing,
    lineWidth: typeof value.lineWidth === 'number'
      ? value.lineWidth
      : DEFAULT_READER_PREFERENCES.lineWidth,
  };
}

function isAnalysisLanguage(value: unknown): value is AnalysisLanguage {
  return value === 'zh'
    || value === 'en'
    || value === 'fr'
    || value === 'de'
    || value === 'es'
    || value === 'it'
    || value === 'ja';
}

function normalizeCloseReadingSourceWidth(value: number): number {
  const clampedValue = Math.min(
    MAX_CLOSE_READING_SOURCE_WIDTH,
    Math.max(MIN_CLOSE_READING_SOURCE_WIDTH, value),
  );
  return Math.round(clampedValue * 10) / 10;
}

function readLegacyDocument(storageScope?: string): WorkspaceDocument | null {
  try {
    const rawValue = readScopedStorage(LEGACY_DOCUMENT_STORAGE_KEY, storageScope);
    const parsedValue = rawValue ? JSON.parse(rawValue) : null;
    return isWorkspaceDocument(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function writeStoredDocumentLibrary(
  library: WorkspaceDocumentLibrary,
  storageScope?: string,
): boolean {
  try {
    writeScopedStorage(
      DOCUMENT_LIBRARY_STORAGE_KEY,
      JSON.stringify(library),
      storageScope,
    );
    removeScopedStorage(LEGACY_DOCUMENT_STORAGE_KEY, storageScope);
    return true;
  } catch {
    return false;
  }
}

export function readStoredDocumentLibrary(
  storageScope?: string,
): WorkspaceDocumentLibrary {
  try {
    const rawValue = readScopedStorage(DOCUMENT_LIBRARY_STORAGE_KEY, storageScope);
    const parsedValue = rawValue ? JSON.parse(rawValue) : null;
    const storedLibrary = normalizeDocumentLibrary(parsedValue);
    if (storedLibrary) {
      return storedLibrary;
    }
  } catch {
    // Fall through to the legacy document migration.
  }

  const legacyDocument = readLegacyDocument(storageScope);
  if (!legacyDocument) {
    return createEmptyDocumentLibrary();
  }

  const migratedLibrary = {
    activeDocumentId: legacyDocument.id,
    documentsById: { [legacyDocument.id]: legacyDocument },
  };
  writeStoredDocumentLibrary(migratedLibrary, storageScope);
  return migratedLibrary;
}

export function readStoredDocument(storageScope?: string): WorkspaceDocument | null {
  return getActiveDocument(readStoredDocumentLibrary(storageScope));
}

export function writeStoredDocument(
  document: WorkspaceDocument | null,
  storageScope?: string,
): void {
  try {
    removeScopedStorage(DOCUMENT_LIBRARY_STORAGE_KEY, storageScope);
    if (document) {
      writeScopedStorage(
        LEGACY_DOCUMENT_STORAGE_KEY,
        JSON.stringify(document),
        storageScope,
      );
    } else {
      removeScopedStorage(LEGACY_DOCUMENT_STORAGE_KEY, storageScope);
    }
  } catch {
    // This compatibility helper is only used to seed legacy document state.
  }
}

export function readStoredReaderPreferences(storageScope?: string): ReaderPreferences {
  try {
    const rawValue = readScopedStorage(READER_PREFERENCES_STORAGE_KEY, storageScope);
    const parsedValue = rawValue ? JSON.parse(rawValue) : null;
    return normalizeReaderPreferences(parsedValue) ?? DEFAULT_READER_PREFERENCES;
  } catch {
    return DEFAULT_READER_PREFERENCES;
  }
}

export function writeStoredReaderPreferences(
  preferences: ReaderPreferences,
  storageScope?: string,
): void {
  try {
    writeScopedStorage(
      READER_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
      storageScope,
    );
  } catch {
    // Storage can fail in private browsing or when quota is exhausted.
  }
}

export function readStoredAnalysisLanguage(storageScope?: string): AnalysisLanguage {
  try {
    const storedLanguage = readScopedStorage(ANALYSIS_LANGUAGE_STORAGE_KEY, storageScope);
    return isAnalysisLanguage(storedLanguage) ? storedLanguage : DEFAULT_ANALYSIS_LANGUAGE;
  } catch {
    return DEFAULT_ANALYSIS_LANGUAGE;
  }
}

export function writeStoredAnalysisLanguage(
  language: AnalysisLanguage,
  storageScope?: string,
): void {
  try {
    writeScopedStorage(ANALYSIS_LANGUAGE_STORAGE_KEY, language, storageScope);
  } catch {
    // Storage can fail in private browsing or when quota is exhausted.
  }
}

export function readStoredCloseReadingSourceWidth(storageScope?: string): number {
  try {
    const storedValue = readScopedStorage(CLOSE_READING_SOURCE_WIDTH_KEY, storageScope);
    const parsedValue = storedValue === null ? Number.NaN : Number(storedValue);
    if (Number.isFinite(parsedValue)) {
      return normalizeCloseReadingSourceWidth(parsedValue);
    }

    const legacyValue = localStorage.getItem(LEGACY_CLOSE_READING_SOURCE_WIDTH_KEY);
    const parsedLegacyValue = legacyValue === null ? Number.NaN : Number(legacyValue);
    if (Number.isFinite(parsedLegacyValue)) {
      const normalizedValue = normalizeCloseReadingSourceWidth(parsedLegacyValue);
      writeScopedStorage(
        CLOSE_READING_SOURCE_WIDTH_KEY,
        String(normalizedValue),
        storageScope,
      );
      return normalizedValue;
    }

    return DEFAULT_CLOSE_READING_SOURCE_WIDTH;
  } catch {
    return DEFAULT_CLOSE_READING_SOURCE_WIDTH;
  }
}

export function writeStoredCloseReadingSourceWidth(
  sourceWidth: number,
  storageScope?: string,
): void {
  try {
    writeScopedStorage(
      CLOSE_READING_SOURCE_WIDTH_KEY,
      String(normalizeCloseReadingSourceWidth(sourceWidth)),
      storageScope,
    );
  } catch {
    // Storage can fail in private browsing or when quota is exhausted.
  }
}
