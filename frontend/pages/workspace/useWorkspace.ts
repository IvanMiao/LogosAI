import { useMemo } from 'react';
import { buildReadingSessionStats } from '@/features/reading/reading-core';
import { useArtifactCollection } from './useArtifactCollection';
import { useArtifactTasks } from './useArtifactTasks';
import { useReadingLibrary } from './useReadingLibrary';
import { useReadingSelection } from './useReadingSelection';
import { useReadingSync } from './useReadingSync';
import { useReadingWorkspace } from './useReadingWorkspace';
import { buildWorkspaceViewModel, getSessionArtifacts } from './workspace-selectors';
import { useWorkspaceActions } from './useWorkspaceActions';
import type { WorkspaceController, WorkspacePageProps } from './workspace-types';

export function useWorkspace(props: WorkspacePageProps): WorkspaceController {
  const { userId, hasApiKey, model } = props;
  const store = useReadingWorkspace(userId);
  const library = useReadingLibrary(userId, store);
  const selection = useReadingSelection({ store, activeDocument: library.activeDocument });
  const artifacts = useArtifactCollection({
    store,
    activeDocument: library.activeDocument,
    activeAnchor: selection.activeAnchor,
    activeAnchorId: selection.activeAnchorId,
    anchors: selection.anchors,
  });
  const tasks = useArtifactTasks({
    artifactStorage: artifacts.artifactStorage,
    updateArtifacts: artifacts.updateArtifacts,
  });
  const sync = useReadingSync({
    enabled: props.cloudSyncEnabled ?? false,
    userId,
    state: store.state,
    replaceLocalState: store.replace,
  });
  const viewModel = useMemo(() => buildWorkspaceViewModel({
    hasApiKey,
    syncStatus: sync.status,
  }), [hasApiKey, sync.status]);
  const sessionStatsByDocumentId = useMemo(() => buildReadingSessionStats(
    library.documents,
    store.state.anchorStorage,
    store.state.artifactStorage,
  ), [library.documents, store.state.anchorStorage, store.state.artifactStorage]);
  const sessionArtifacts = useMemo(() => getSessionArtifacts(
    store.state.artifactStorage,
    store.state.anchorStorage.anchorsById,
    library.activeDocument?.id,
  ), [
    library.activeDocument?.id,
    store.state.anchorStorage.anchorsById,
    store.state.artifactStorage,
  ]);
  const actions = useWorkspaceActions({
    hasApiKey,
    model,
    store,
    library,
    selection,
    artifacts,
    tasks,
    sync,
    sessionArtifacts,
  });

  return {
    viewModel,
    activeDocument: library.activeDocument,
    documents: library.documents,
    sessionStatsByDocumentId,
    activeAnchor: selection.activeAnchor,
    anchors: selection.anchors,
    activeAnchorId: selection.activeAnchorId,
    activeArtifacts: artifacts.activeArtifacts,
    activeArtifact: artifacts.activeArtifact,
    sessionArtifacts,
    artifactCountByAnchorId: artifacts.artifactCountByAnchorId,
    noteDraftContent: artifacts.noteDraftContent,
    anchorMarkStatusById: artifacts.anchorMarkStatusById,
    history: library.history,
    workspaceError: actions.workspaceError,
    importState: library.importState,
    readerPreferences: store.state.readerPreferences,
    analysisLanguage: store.state.analysisLanguage,
    selectionToolbarPlacement: selection.selectionToolbarPlacement,
    setPasteText: library.setPasteText,
    setSessionTitle: library.setSessionTitle,
    importPastedText: actions.importPastedText,
    importTextFile: actions.importTextFile,
    showSelectionActions: selection.showSelectionActions,
    dismissSelectionToolbar: selection.dismissSelectionToolbar,
    runAnchorSkillForPendingSelection: actions.runAnchorSkillForPendingSelection,
    startNoteForPendingSelection: actions.startNoteForPendingSelection,
    setActiveAnchorId: actions.setActiveAnchorId,
    selectArtifact: artifacts.selectArtifact,
    openSessionArtifact: actions.openSessionArtifact,
    deleteArtifact: actions.deleteArtifact,
    deleteAnchor: actions.deleteAnchor,
    clearActiveAnchor: actions.clearActiveAnchor,
    updateNoteDraft: artifacts.updateNoteDraft,
    runAnchorSkillForActiveAnchor: actions.runAnchorSkillForActiveAnchor,
    runCloseReadDocument: actions.runCloseReadDocument,
    runExplainParagraph: actions.runExplainParagraph,
    stopArtifact: actions.stopArtifact,
    retryArtifact: actions.retryArtifact,
    openDocument: actions.openDocument,
    renameDocument: actions.renameDocument,
    deleteDocument: actions.deleteDocument,
    startNewDocument: actions.startNewDocument,
    openHistoryAsDocument: actions.openHistoryAsDocument,
    deleteHistoryItem: library.deleteHistoryItem,
    updateReaderPreference: actions.updateReaderPreference,
    updateAnalysisLanguage: actions.updateAnalysisLanguage,
    clearDocument: actions.clearDocument,
    retryCloudSync: actions.retryCloudSync,
    syncConflicts: actions.syncConflicts,
    resolveSyncConflict: actions.resolveSyncConflict,
  };
}
