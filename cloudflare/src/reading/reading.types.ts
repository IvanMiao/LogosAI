export type DocumentSourceType = 'paste' | 'file' | 'history';
export type AnchorScope = 'document' | 'paragraph' | 'selection';
export type ArtifactType =
  | 'note'
  | 'explanation'
  | 'translation'
  | 'vocabulary'
  | 'close_read';
export type ArtifactStatus =
  | 'draft'
  | 'running'
  | 'stopped'
  | 'failed'
  | 'complete';

export interface ReadingDocument {
  id: string;
  title: string;
  text: string;
  sourceType: DocumentSourceType;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
}

export interface ReadingAnchor {
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

export interface ReadingArtifact {
  id: string;
  documentId: string;
  anchorId: string;
  type: ArtifactType;
  title: string;
  content: string;
  status: ArtifactStatus;
  createdAt: string;
  updatedAt: string;
  requestId?: string;
  traceId?: string;
  errorMessage?: string;
}

export interface ReadingSessionSnapshot {
  document: ReadingDocument;
  activeAnchorId: string | null;
  anchors: ReadingAnchor[];
  artifacts: ReadingArtifact[];
}

export interface StoredReadingSession extends ReadingSessionSnapshot {
  revision: number;
  syncedAt: string;
}
