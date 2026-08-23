import type { AnalysisModel } from '@/types';
import type { HistoryItem } from '@/types';
import type { TextAnchor } from '@/features/anchors';
import type { Artifact } from '@/features/artifacts';
import type {
  AnalysisLanguage,
  ReaderPreferences,
  ReadingSessionStats,
  WorkspaceDocument,
} from '@/features/reading';
import type { AnchorSkill } from '@/client-api/anchorApi';
import type { DocumentParagraph } from '@/features/reading/reading-core';

export interface WorkspacePageProps {
  userId: string;
  hasApiKey: boolean;
  model: AnalysisModel;
  cloudSyncEnabled?: boolean;
}

export type ApiKeyStatusTone = 'ready' | 'missing';
export type WorkspaceSyncStatus = 'loading' | 'saved' | 'saving' | 'offline' | 'error';

export interface WorkspaceViewModel {
  apiKeyStatusLabel: string;
  apiKeyStatusTone: ApiKeyStatusTone;
  cloudSyncLabel: string;
  cloudSyncTone: WorkspaceSyncStatus;
}

export interface ImportState {
  pasteText: string;
  sessionTitle: string;
  importError: string;
}

export interface WorkspaceSessionArtifact {
  artifact: Artifact;
  anchor: TextAnchor;
}

export interface SelectionToolbarPlacement {
  top: number;
  left: number;
}

export interface PendingSelection {
  selectedText: string;
  startOffset: number;
  endOffset: number;
}

export type AnchorMarkStatus = 'active' | 'draft' | 'saved';

export interface WorkspaceController {
  viewModel: WorkspaceViewModel;
  activeDocument: WorkspaceDocument | null;
  documents: WorkspaceDocument[];
  sessionStatsByDocumentId: Record<string, ReadingSessionStats>;
  activeAnchor: TextAnchor | null;
  anchors: TextAnchor[];
  activeAnchorId: string | null;
  activeArtifacts: Artifact[];
  activeArtifact: Artifact | null;
  sessionArtifacts: WorkspaceSessionArtifact[];
  artifactCountByAnchorId: Record<string, number>;
  noteDraftContent: string;
  anchorMarkStatusById: Record<string, AnchorMarkStatus>;
  history: HistoryItem[];
  workspaceError: string;
  importState: ImportState;
  readerPreferences: ReaderPreferences;
  analysisLanguage: AnalysisLanguage;
  selectionToolbarPlacement: SelectionToolbarPlacement | null;
  setPasteText: (text: string) => void;
  setSessionTitle: (title: string) => void;
  importPastedText: () => void;
  importTextFile: (file: File | null) => Promise<void>;
  showSelectionActions: (
    selection: PendingSelection,
    placement: SelectionToolbarPlacement,
  ) => void;
  dismissSelectionToolbar: () => void;
  runAnchorSkillForPendingSelection: (skill: AnchorSkill) => Promise<void>;
  startNoteForPendingSelection: () => TextAnchor | null;
  setActiveAnchorId: (anchorId: string) => void;
  selectArtifact: (artifactId: string) => void;
  openSessionArtifact: (artifactId: string) => void;
  deleteArtifact: (artifactId: string) => void;
  deleteAnchor: (anchorId: string) => void;
  clearActiveAnchor: () => void;
  updateNoteDraft: (content: string) => void;
  runAnchorSkillForActiveAnchor: (skill: AnchorSkill) => Promise<void>;
  runCloseReadDocument: () => Promise<void>;
  runExplainParagraph: (paragraph: DocumentParagraph) => Promise<void>;
  stopArtifact: (artifact: Artifact) => void;
  retryArtifact: (artifact: Artifact) => Promise<void>;
  openDocument: (documentId: string) => void;
  renameDocument: (documentId: string, title: string) => void;
  deleteDocument: (documentId: string) => void;
  startNewDocument: () => void;
  openHistoryAsDocument: (item: HistoryItem) => void;
  deleteHistoryItem: (id: number) => void;
  updateReaderPreference: <Key extends keyof ReaderPreferences>(
    key: Key,
    value: ReaderPreferences[Key],
  ) => void;
  updateAnalysisLanguage: (language: AnalysisLanguage) => void;
  clearDocument: () => void;
  retryCloudSync: () => void;
}
