import type {
  AnalysisLanguage,
  ReaderFontFamily,
  ReaderPreferences,
  WorkspaceDocument,
} from './workspace.types';

const DOCUMENT_STORAGE_KEY = 'logosai.workspace.document:v1';
const READER_PREFERENCES_STORAGE_KEY = 'logosai.workspace.readerPreferences:v1';
const ANALYSIS_LANGUAGE_STORAGE_KEY = 'logosai.workspace.analysisLanguage:v1';
const CLOSE_READING_SOURCE_WIDTH_KEY = 'logosai.workspace.closeReadingSourceWidth:v1';

export const DEFAULT_ANALYSIS_LANGUAGE: AnalysisLanguage = 'en';
export const DEFAULT_CLOSE_READING_SOURCE_WIDTH = 41;
export const MIN_CLOSE_READING_SOURCE_WIDTH = 30;
export const MAX_CLOSE_READING_SOURCE_WIDTH = 54;

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  fontFamily: 'serif',
  closeReadingFontFamily: 'sans',
  fontSize: 18,
  lineSpacing: 1.75,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
  );
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
      : DEFAULT_READER_PREFERENCES.closeReadingFontFamily,
    fontSize: value.fontSize,
    lineSpacing: value.lineSpacing,
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

export function readStoredDocument(): WorkspaceDocument | null {
  try {
    const rawValue = localStorage.getItem(DOCUMENT_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : null;
    return isWorkspaceDocument(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function writeStoredDocument(document: WorkspaceDocument | null): void {
  try {
    if (!document) {
      localStorage.removeItem(DOCUMENT_STORAGE_KEY);
      return;
    }

    localStorage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify(document));
  } catch {
    // Storage can fail in private browsing or when quota is exhausted.
  }
}

export function readStoredReaderPreferences(): ReaderPreferences {
  try {
    const rawValue = localStorage.getItem(READER_PREFERENCES_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : null;
    return normalizeReaderPreferences(parsedValue) ?? DEFAULT_READER_PREFERENCES;
  } catch {
    return DEFAULT_READER_PREFERENCES;
  }
}

export function writeStoredReaderPreferences(preferences: ReaderPreferences): void {
  try {
    localStorage.setItem(READER_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage can fail in private browsing or when quota is exhausted.
  }
}

export function readStoredAnalysisLanguage(): AnalysisLanguage {
  try {
    const storedLanguage = localStorage.getItem(ANALYSIS_LANGUAGE_STORAGE_KEY);
    return isAnalysisLanguage(storedLanguage) ? storedLanguage : DEFAULT_ANALYSIS_LANGUAGE;
  } catch {
    return DEFAULT_ANALYSIS_LANGUAGE;
  }
}

export function writeStoredAnalysisLanguage(language: AnalysisLanguage): void {
  try {
    localStorage.setItem(ANALYSIS_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage can fail in private browsing or when quota is exhausted.
  }
}

export function readStoredCloseReadingSourceWidth(): number {
  try {
    const storedValue = localStorage.getItem(CLOSE_READING_SOURCE_WIDTH_KEY);
    const parsedValue = storedValue === null ? Number.NaN : Number(storedValue);
    return Number.isFinite(parsedValue)
      ? normalizeCloseReadingSourceWidth(parsedValue)
      : DEFAULT_CLOSE_READING_SOURCE_WIDTH;
  } catch {
    return DEFAULT_CLOSE_READING_SOURCE_WIDTH;
  }
}

export function writeStoredCloseReadingSourceWidth(sourceWidth: number): void {
  try {
    localStorage.setItem(
      CLOSE_READING_SOURCE_WIDTH_KEY,
      String(normalizeCloseReadingSourceWidth(sourceWidth)),
    );
  } catch {
    // Storage can fail in private browsing or when quota is exhausted.
  }
}
