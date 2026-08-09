import type { AnchorStorageState, TextAnchor } from './anchor.types';
import { readScopedStorage, writeScopedStorage } from '@/utils/scopedStorage';

const ANCHOR_STORAGE_KEY = 'logosai.workspace.anchors:v1';

const EMPTY_ANCHOR_STORAGE: AnchorStorageState = {
  anchorsById: {},
  activeAnchorId: null,
  activeAnchorIdByDocumentId: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTextAnchor(value: unknown): value is TextAnchor {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string'
    && typeof value.documentId === 'string'
    && typeof value.scope === 'string'
    && typeof value.quote === 'string'
    && typeof value.normalizedQuote === 'string'
    && typeof value.quoteHash === 'string'
    && typeof value.startOffset === 'number'
    && typeof value.endOffset === 'number'
    && typeof value.createdAt === 'string'
  );
}

function isAnchorStorageState(value: unknown): value is AnchorStorageState {
  if (!isRecord(value) || !isRecord(value.anchorsById)) {
    return false;
  }

  const activeIdsAreValid = value.activeAnchorIdByDocumentId === undefined || (
    isRecord(value.activeAnchorIdByDocumentId)
    && Object.values(value.activeAnchorIdByDocumentId).every((activeId) => (
      typeof activeId === 'string' || activeId === null
    ))
  );

  return (
    (typeof value.activeAnchorId === 'string' || value.activeAnchorId === null)
    && Object.values(value.anchorsById).every(isTextAnchor)
    && activeIdsAreValid
  );
}

export function readStoredAnchors(storageScope?: string): AnchorStorageState {
  try {
    const rawValue = readScopedStorage(ANCHOR_STORAGE_KEY, storageScope);
    const parsedValue = rawValue ? JSON.parse(rawValue) : null;
    return isAnchorStorageState(parsedValue) ? parsedValue : EMPTY_ANCHOR_STORAGE;
  } catch {
    return EMPTY_ANCHOR_STORAGE;
  }
}

export function writeStoredAnchors(
  state: AnchorStorageState,
  storageScope?: string,
): void {
  try {
    writeScopedStorage(ANCHOR_STORAGE_KEY, JSON.stringify(state), storageScope);
  } catch {
    // Storage can fail in private browsing or when quota is exhausted.
  }
}
