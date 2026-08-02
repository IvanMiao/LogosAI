export type AnchorScope = 'document' | 'paragraph' | 'selection';

export interface TextAnchor {
  id: string;
  documentId: string;
  scope: AnchorScope;
  quote: string;
  normalizedQuote: string;
  quoteHash: string;
  startOffset: number;
  endOffset: number;
  createdAt: string;
}

export interface ResolvedAnchor {
  startOffset: number;
  endOffset: number;
  quote: string;
}

export interface AnchorStorageState {
  anchorsById: Record<string, TextAnchor>;
  activeAnchorId: string | null;
  activeAnchorIdByDocumentId?: Record<string, string | null>;
}
