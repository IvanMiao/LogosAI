export type ArtifactType = 'note' | 'explanation' | 'translation' | 'vocabulary' | 'close_read';
export type ArtifactStatus = 'draft' | 'running' | 'stopped' | 'failed' | 'complete';

export interface Artifact {
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
  stage?: AnalysisStreamStage;
}

export interface NoteArtifact extends Artifact {
  type: 'note';
  status: 'draft' | 'complete';
}

export interface ArtifactTask {
  requestId: string;
  anchorId: string;
  artifactId: string;
  status: ArtifactStatus;
  traceId?: string;
}

export interface ArtifactStorageState {
  artifactsByAnchorId: Record<string, Artifact[]>;
  tasksByRequestId: Record<string, ArtifactTask>;
}
import type { AnalysisStreamStage } from '@/types';
