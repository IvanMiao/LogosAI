import type { AnchorSkill, TextAnchor } from '@/features/anchors';
import type { Artifact } from '@/features/artifacts';
import type {
  AnalysisLanguage,
  ReaderPreferences,
  WorkspaceDocument,
} from '@/features/reading';
import type { DocumentParagraph } from '@/features/reading/reading-core';
import type {
  AnchorMarkStatus,
  PendingSelection,
  SelectionToolbarPlacement,
  WorkspaceSessionArtifact,
} from '../workspace-types';
import type { WorkspaceAppChromeProps } from './WorkspaceHeader';

export interface ReaderWorkspaceState {
  activeDocument: WorkspaceDocument;
  activeAnchor: TextAnchor | null;
  anchors: TextAnchor[];
  activeArtifacts: Artifact[];
  activeArtifact: Artifact | null;
  sessionArtifacts: WorkspaceSessionArtifact[];
  artifactCountByAnchorId: Record<string, number>;
  noteDraftContent: string;
  anchorMarkStatusById: Record<string, AnchorMarkStatus>;
  readerPreferences: ReaderPreferences;
  analysisLanguage: AnalysisLanguage;
  selectionToolbarPlacement: SelectionToolbarPlacement | null;
}

export interface ReaderWorkspaceActions {
  setActiveAnchorId: (anchorId: string) => void;
  selectArtifact: (artifactId: string) => void;
  openSessionArtifact: (artifactId: string) => void;
  deleteArtifact: (artifactId: string) => void;
  deleteAnchor: (anchorId: string) => void;
  updateNoteDraft: (content: string) => void;
  runCloseReadDocument: () => Promise<void>;
  runExplainParagraph: (paragraph: DocumentParagraph) => Promise<void>;
  stopArtifact: (artifact: Artifact) => void;
  showSelectionActions: (
    selection: PendingSelection,
    placement: SelectionToolbarPlacement,
  ) => void;
  dismissSelectionToolbar: () => void;
  updateReaderPreference: <Key extends keyof ReaderPreferences>(
    key: Key,
    value: ReaderPreferences[Key],
  ) => void;
  updateAnalysisLanguage: (language: AnalysisLanguage) => void;
  clearDocument: () => void;
  renameDocument: (documentId: string, title: string) => void;
}

export interface ReaderWorkspaceProps {
  appChrome: WorkspaceAppChromeProps;
  reading: ReaderWorkspaceState;
  actions: ReaderWorkspaceActions;
  isDesktopViewport: boolean;
  isSessionsNavigationPinned: boolean;
  noteEditorAnchorId: string | null;
  onRunSkill: (skill: AnchorSkill) => void;
  onStartNote: () => void;
  onRunPendingSelectionSkill: (skill: AnchorSkill) => void;
  onStartPendingSelectionNote: () => void;
  onClearActiveAnchor: () => void;
  onRetryArtifact: (artifact: Artifact) => void;
  onOpenLibrary: () => void;
}
