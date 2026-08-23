import type { TextAnchor } from '@/features/anchors';
import type { Artifact } from '@/features/artifacts';
import type {
  AnalysisLanguage,
  ReaderPreferences,
  WorkspaceDocument,
} from './reading.types';

export interface ReadingSessionSnapshot {
  document: WorkspaceDocument;
  activeAnchorId: string | null;
  anchors: TextAnchor[];
  artifacts: Array<Omit<Artifact, 'stage'>>;
}

export interface WorkspacePreferencesPayload {
  activeDocumentId: string | null;
  readerPreferences: ReaderPreferences;
  analysisLanguage: AnalysisLanguage;
}

export interface StoredReadingSession extends ReadingSessionSnapshot {
  revision: number;
  syncedAt: string;
}

export interface CloudWorkspaceState {
  preferences: WorkspacePreferencesPayload;
  sessions: StoredReadingSession[];
}
