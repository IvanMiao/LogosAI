import type {
  AnchorScope,
  AnchorStorageState,
  ResolvedAnchor,
  TextAnchor,
} from './anchor.types';

interface CreateAnchorInput {
  documentId: string;
  documentText: string;
  selectedText: string;
  startOffset?: number;
  endOffset?: number;
  scope?: AnchorScope;
}

interface CreateRangeAnchorInput {
  documentId: string;
  documentText: string;
  startOffset: number;
  endOffset: number;
  scope: AnchorScope;
}

interface NormalizedCharacter {
  value: string;
  rawIndex: number;
}

export function normalizeAnchorQuote(quote: string): string {
  return quote.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

export function hashAnchorQuote(normalizedQuote: string): string {
  let hash = 5381;

  for (let index = 0; index < normalizedQuote.length; index += 1) {
    hash = (hash * 33) ^ normalizedQuote.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}

function normalizeWithRawOffsets(text: string): NormalizedCharacter[] {
  const normalizedCharacters: NormalizedCharacter[] = [];
  let previousWasSpace = true;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index].normalize('NFKC');
    if (/\s/.test(character)) {
      if (!previousWasSpace) {
        normalizedCharacters.push({ value: ' ', rawIndex: index });
      }
      previousWasSpace = true;
      continue;
    }

    normalizedCharacters.push({ value: character, rawIndex: index });
    previousWasSpace = false;
  }

  if (normalizedCharacters[normalizedCharacters.length - 1]?.value === ' ') {
    normalizedCharacters.pop();
  }

  return normalizedCharacters;
}

function findNormalizedOffsets(documentText: string, quote: string): ResolvedAnchor | null {
  const normalizedQuote = normalizeAnchorQuote(quote);
  if (!normalizedQuote) {
    return null;
  }

  const normalizedDocument = normalizeWithRawOffsets(documentText);
  const normalizedDocumentText = normalizedDocument.map((item) => item.value).join('');
  const normalizedStart = normalizedDocumentText.indexOf(normalizedQuote);
  if (normalizedStart === -1) {
    return null;
  }

  const nextMatch = normalizedDocumentText.indexOf(
    normalizedQuote,
    normalizedStart + normalizedQuote.length,
  );
  if (nextMatch !== -1) {
    return null;
  }

  const normalizedEnd = normalizedStart + normalizedQuote.length - 1;
  const startOffset = normalizedDocument[normalizedStart]?.rawIndex;
  const endOffset = normalizedDocument[normalizedEnd]?.rawIndex;
  if (startOffset === undefined || endOffset === undefined) {
    return null;
  }

  return {
    startOffset,
    endOffset: endOffset + 1,
    quote: documentText.slice(startOffset, endOffset + 1),
  };
}

function resolveSelectedOffsets({
  documentText,
  selectedText,
  startOffset,
  endOffset,
}: CreateAnchorInput): ResolvedAnchor | null {
  if (startOffset === undefined || endOffset === undefined) {
    return findNormalizedOffsets(documentText, selectedText);
  }

  if (startOffset < 0 || endOffset <= startOffset) {
    return null;
  }

  const quote = documentText.slice(startOffset, endOffset);
  if (normalizeAnchorQuote(quote) !== normalizeAnchorQuote(selectedText)) {
    return null;
  }

  return { startOffset, endOffset, quote };
}

export function resolveAnchor(anchor: TextAnchor, documentText: string): ResolvedAnchor | null {
  const exactQuote = documentText.slice(anchor.startOffset, anchor.endOffset);
  if (normalizeAnchorQuote(exactQuote) === anchor.normalizedQuote) {
    return {
      startOffset: anchor.startOffset,
      endOffset: anchor.endOffset,
      quote: exactQuote,
    };
  }

  const resolvedByQuote = findNormalizedOffsets(documentText, anchor.quote);
  if (resolvedByQuote?.startOffset !== undefined) {
    return resolvedByQuote;
  }

  return null;
}

export function createAnchorFromSelection({
  documentId,
  documentText,
  selectedText,
  startOffset,
  endOffset,
  scope = 'selection',
}: CreateAnchorInput): TextAnchor | null {
  const normalizedQuote = normalizeAnchorQuote(selectedText);
  const resolvedAnchor = resolveSelectedOffsets({
    documentId,
    documentText,
    selectedText,
    startOffset,
    endOffset,
    scope,
  });
  if (!normalizedQuote || !resolvedAnchor) {
    return null;
  }

  const quoteHash = hashAnchorQuote(normalizedQuote);

  return {
    id: `anchor-${documentId}-selection-${quoteHash}-${resolvedAnchor.startOffset}`,
    documentId,
    scope,
    quote: resolvedAnchor.quote,
    normalizedQuote,
    quoteHash,
    startOffset: resolvedAnchor.startOffset,
    endOffset: resolvedAnchor.endOffset,
    createdAt: new Date().toISOString(),
  };
}

export function createAnchorFromRange({
  documentId,
  documentText,
  startOffset,
  endOffset,
  scope,
}: CreateRangeAnchorInput): TextAnchor | null {
  const quote = documentText.slice(startOffset, endOffset).trim();
  const normalizedQuote = normalizeAnchorQuote(quote);
  if (!normalizedQuote) {
    return null;
  }

  const quoteHash = hashAnchorQuote(normalizedQuote);

  return {
    id: `anchor-${documentId}-${scope}-${quoteHash}-${startOffset}`,
    documentId,
    scope,
    quote,
    normalizedQuote,
    quoteHash,
    startOffset,
    endOffset,
    createdAt: new Date().toISOString(),
  };
}

export function getActiveAnchorIdForDocument(
  storage: AnchorStorageState,
  documentId: string | undefined,
): string | null {
  if (!documentId) {
    return null;
  }

  const storedId = storage.activeAnchorIdByDocumentId?.[documentId];
  if (storedId && storage.anchorsById[storedId]?.documentId === documentId) {
    return storedId;
  }

  const legacyAnchor = storage.activeAnchorId
    ? storage.anchorsById[storage.activeAnchorId]
    : undefined;
  return legacyAnchor?.documentId === documentId ? legacyAnchor.id : null;
}

export function setActiveAnchorForDocument(
  storage: AnchorStorageState,
  documentId: string,
  anchorId: string | null,
): AnchorStorageState {
  const activeAnchorIdByDocumentId = { ...storage.activeAnchorIdByDocumentId };
  const legacyActiveAnchor = storage.activeAnchorId
    ? storage.anchorsById[storage.activeAnchorId]
    : undefined;
  if (
    legacyActiveAnchor
    && activeAnchorIdByDocumentId[legacyActiveAnchor.documentId] === undefined
  ) {
    activeAnchorIdByDocumentId[legacyActiveAnchor.documentId] = legacyActiveAnchor.id;
  }

  return {
    ...storage,
    activeAnchorId: anchorId,
    activeAnchorIdByDocumentId: {
      ...activeAnchorIdByDocumentId,
      [documentId]: anchorId,
    },
  };
}

export function removeAnchorsForDocument(
  storage: AnchorStorageState,
  documentId: string,
): AnchorStorageState {
  const anchorsById = Object.fromEntries(
    Object.entries(storage.anchorsById).filter(([, anchor]) => anchor.documentId !== documentId),
  );
  const activeAnchorIdByDocumentId = { ...storage.activeAnchorIdByDocumentId };
  delete activeAnchorIdByDocumentId[documentId];
  const activeAnchorId = storage.activeAnchorId
    && storage.anchorsById[storage.activeAnchorId]?.documentId === documentId
    ? null
    : storage.activeAnchorId;

  return { anchorsById, activeAnchorId, activeAnchorIdByDocumentId };
}
