import type { AnalysisModel } from '@/types';
import type { HistoryItem } from '@/types';
import type { TextAnchor } from '@/features/anchors';
import type { Artifact } from '@/features/artifacts';
import type { AnchorSkill } from '@/client-api/anchorApi';
import type { DocumentParagraph } from './workspace.helpers';

export type DocumentSourceType = 'paste' | 'file' | 'history';
export type ReaderFontFamily = 'serif' | 'sans' | 'mono';
export type AnalysisLanguage = 'zh' | 'en' | 'fr' | 'de' | 'es' | 'it' | 'ja';

export interface WorkspacePageProps {
  apiKey: string;
  hasApiKey: boolean;
  model: AnalysisModel;
}

export type ApiKeyStatusTone = 'ready' | 'missing';

export interface WorkspaceViewModel {
  apiKeyStatusLabel: string;
  apiKeyStatusTone: ApiKeyStatusTone;
}

export interface WorkspaceDocument {
  id: string;
  title: string;
  text: string;
  sourceType: DocumentSourceType;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
}

export interface WorkspaceDocumentLibrary {
  activeDocumentId: string | null;
  documentsById: Record<string, WorkspaceDocument>;
}

export interface ReaderPreferences {
  fontFamily: ReaderFontFamily;
  closeReadingFontFamily: ReaderFontFamily;
  fontSize: number;
  lineSpacing: number;
}

export interface ImportState {
  pasteText: string;
  importError: string;
}

export interface SelectionToolbarPlacement {
  top: number;
  left: number;
}

export type AnchorMarkStatus = 'active' | 'draft' | 'saved';

export interface WorkspaceController {
  viewModel: WorkspaceViewModel;
  activeDocument: WorkspaceDocument | null;
  documents: WorkspaceDocument[];
  activeAnchor: TextAnchor | null;
  anchors: TextAnchor[];
  activeAnchorId: string | null;
  activeArtifacts: Artifact[];
  activeArtifact: Artifact | null;
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
  importPastedText: () => void;
  importTextFile: (file: File | null) => Promise<void>;
  createSelectionAnchor: (
    selectedText: string,
    placement: SelectionToolbarPlacement,
  ) => void;
  dismissSelectionToolbar: () => void;
  setActiveAnchorId: (anchorId: string) => void;
  selectArtifact: (artifactId: string) => void;
  deleteArtifact: (artifactId: string) => void;
  deleteAnchor: (anchorId: string) => void;
  clearActiveAnchor: () => void;
  updateNoteDraft: (content: string) => void;
  runExplainForActiveAnchor: () => Promise<void>;
  runAnchorSkillForActiveAnchor: (skill: AnchorSkill) => Promise<void>;
  runCloseReadDocument: () => Promise<void>;
  runCloseReadParagraph: (paragraph: DocumentParagraph) => Promise<void>;
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
}
