import { useCallback, useState } from 'react';
import { getAnchorsForDocument, type TextAnchor } from '@/features/anchors';
import type { AnalysisLanguage, ReaderPreferences } from '@/features/reading';
import type { AnalysisModel } from '@/types';
import {
  deleteAnchor as deleteWorkspaceAnchor,
  deleteDocument as deleteWorkspaceDocument,
  setAnalysisLanguage,
  updateReaderPreference as updateWorkspaceReaderPreference,
} from '@/features/reading/reading-workspace';
import type { WorkspaceSessionArtifact } from './workspace-types';
import type { ReadingWorkspaceStore } from './useReadingWorkspace';
import type { useReadingLibrary } from './useReadingLibrary';
import type { useReadingSelection } from './useReadingSelection';
import type { useArtifactCollection } from './useArtifactCollection';
import type { useArtifactTasks } from './useArtifactTasks';
import type { useReadingSync } from './useReadingSync';
import { useAnchorSkillActions } from './useAnchorSkillActions';

interface WorkspaceActionsInput {
  hasApiKey: boolean;
  model: AnalysisModel;
  store: ReadingWorkspaceStore;
  library: ReturnType<typeof useReadingLibrary>;
  selection: ReturnType<typeof useReadingSelection>;
  artifacts: ReturnType<typeof useArtifactCollection>;
  tasks: ReturnType<typeof useArtifactTasks>;
  sync: ReturnType<typeof useReadingSync>;
  sessionArtifacts: WorkspaceSessionArtifact[];
}

export function useWorkspaceActions({
  hasApiKey,
  model,
  store,
  library,
  selection,
  artifacts,
  tasks,
  sync,
  sessionArtifacts,
}: WorkspaceActionsInput) {
  const [workspaceActionError, setWorkspaceActionError] = useState('');
  const resetSelectedArtifact = artifacts.resetSelectedArtifact;
  const confirmSelection = selection.confirmPendingSelection;
  const activateSelectionAnchor = selection.activateAnchor;
  const confirmPendingSelection = useCallback(() => {
    const anchor = confirmSelection();
    if (anchor) resetSelectedArtifact();
    return anchor;
  }, [confirmSelection, resetSelectedArtifact]);
  const activateAnchor = useCallback((anchor: TextAnchor) => {
    activateSelectionAnchor(anchor);
    resetSelectedArtifact();
  }, [activateSelectionAnchor, resetSelectedArtifact]);
  const skillActions = useAnchorSkillActions({
    hasApiKey,
    model,
    activeDocument: library.activeDocument,
    activeAnchor: selection.activeAnchor,
    anchorsById: store.state.anchorStorage.anchorsById,
    analysisLanguage: store.state.analysisLanguage,
    activateAnchor,
    confirmPendingSelection,
    runArtifactTask: tasks.runArtifactTask,
    setActionError: setWorkspaceActionError,
  });
  const resetTransientDocumentState = selection.resetSelectionState;

  const importPastedText = () => {
    if (library.importPastedText()) resetTransientDocumentState();
  };
  const importTextFile = async (file: File | null) => {
    if (await library.importTextFile(file)) resetTransientDocumentState();
  };
  const openDocument = (documentId: string) => {
    if (library.openDocument(documentId)) resetTransientDocumentState();
  };
  const startNewDocument = () => {
    if (library.startNewDocument()) resetTransientDocumentState();
  };
  const openHistoryAsDocument = (item: Parameters<typeof library.openHistoryAsDocument>[0]) => {
    if (library.openHistoryAsDocument(item)) resetTransientDocumentState();
  };
  const setActiveAnchorId = (anchorId: string) => {
    if (selection.setActiveAnchorId(anchorId)) artifacts.resetSelectedArtifact();
  };
  const clearActiveAnchor = () => {
    selection.clearActiveAnchor();
    artifacts.resetSelectedArtifact();
  };
  const openSessionArtifact = (artifactId: string) => {
    const sessionArtifact = sessionArtifacts.find(({ artifact }) => artifact.id === artifactId);
    if (!sessionArtifact || !selection.setActiveAnchorId(sessionArtifact.anchor.id)) return;
    artifacts.selectArtifact(sessionArtifact.artifact.id);
  };
  const deleteArtifact = (artifactId: string) => {
    tasks.abortTasksFor((taskArtifactId) => taskArtifactId === artifactId);
    artifacts.deleteArtifact(artifactId);
  };
  const deleteAnchor = (anchorId: string) => {
    if (!store.state.anchorStorage.anchorsById[anchorId]) return;
    tasks.abortTasksFor((_, taskAnchorId) => taskAnchorId === anchorId);
    if (store.commit((current) => deleteWorkspaceAnchor(
      current,
      anchorId,
      library.activeDocument?.id ?? null,
    ))) {
      selection.resetSelectionState();
      artifacts.resetSelectedArtifact();
    }
  };
  const deleteDocument = (documentId: string) => {
    if (!store.state.documentLibrary.documentsById[documentId]) return;
    const anchorIds = new Set(getAnchorsForDocument(
      store.state.anchorStorage.anchorsById,
      documentId,
    ).map((anchor) => anchor.id));
    tasks.abortTasksFor((_, anchorId) => anchorIds.has(anchorId));
  if (store.commit((current) => deleteWorkspaceDocument(current, documentId))) {
      resetTransientDocumentState();
      artifacts.resetSelectedArtifact();
    }
  };
  const updateReaderPreference = <Key extends keyof ReaderPreferences>(
    key: Key,
    value: ReaderPreferences[Key],
  ) => {
    store.commit((current) => updateWorkspaceReaderPreference(current, key, value));
  };
  const updateAnalysisLanguage = (language: AnalysisLanguage) => {
    store.commit((current) => setAnalysisLanguage(current, language));
  };
  const startNoteForPendingSelection = () => confirmPendingSelection();

  return {
    workspaceError: workspaceActionError || store.error || sync.error,
    importPastedText,
    importTextFile,
    runAnchorSkillForPendingSelection: skillActions.runAnchorSkillForPendingSelection,
    startNoteForPendingSelection,
    setActiveAnchorId,
    openSessionArtifact,
    deleteArtifact,
    deleteAnchor,
    clearActiveAnchor,
    runAnchorSkillForActiveAnchor: skillActions.runAnchorSkillForActiveAnchor,
    runCloseReadDocument: skillActions.runCloseReadDocument,
    runExplainParagraph: skillActions.runExplainParagraph,
    stopArtifact: tasks.stopArtifact,
    retryArtifact: skillActions.retryArtifact,
    openDocument,
    renameDocument: library.renameDocument,
    deleteDocument,
    startNewDocument,
    openHistoryAsDocument,
    deleteHistoryItem: library.deleteHistoryItem,
    updateReaderPreference,
    updateAnalysisLanguage,
    clearDocument: startNewDocument,
    retryCloudSync: sync.retry,
    syncConflicts: sync.conflicts,
    resolveSyncConflict: sync.resolveConflict,
  };
}
