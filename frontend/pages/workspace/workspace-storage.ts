import type { ReaderPreferences, WorkspaceDocument } from './workspace.types';

const DOCUMENT_STORAGE_KEY = 'logosai.workspace.document:v1';
const READER_PREFERENCES_STORAGE_KEY = 'logosai.workspace.readerPreferences:v1';

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  fontFamily: 'serif',
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

function isReaderPreferences(value: unknown): value is ReaderPreferences {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.fontFamily === 'serif' || value.fontFamily === 'sans' || value.fontFamily === 'mono')
    && typeof value.fontSize === 'number'
    && typeof value.lineSpacing === 'number'
  );
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
    return isReaderPreferences(parsedValue) ? parsedValue : DEFAULT_READER_PREFERENCES;
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
