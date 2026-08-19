import { useCallback, useMemo, useRef } from 'react';
import { runAnchorSkill, type AnchorSkill } from '@/client-api/anchorApi';
import { streamAnalysis } from '@/client-api/analysisApi';
import type { HistoryItem } from '@/types';
import { createClientId } from '@/utils/createClientId';
import {
  createAnchorFromRange,
  getAnchorsForDocument,
  resolveAnchor,
  type TextAnchor,
} from '@/features/anchors';
import {
  appendArtifactContent,
  createStreamingArtifact,
  prependArtifact,
  updateArtifact,
  type Artifact,
} from '@/features/artifacts';
import {
  buildReadingSessionStats,
  type DocumentParagraph,
} from '@/features/reading/reading-core';
import type {
  WorkspaceController,
  WorkspacePageProps,
  WorkspaceSyncStatus,
  WorkspaceViewModel,
} from './workspace.types';
import { useArtifactCollection } from './useArtifactCollection';
import { useReadingLibrary } from './useReadingLibrary';
import { useReadingPreferences } from './useReadingPreferences';
import { useReadingSelection } from './useReadingSelection';
import { useWorkspaceCloudSync } from './useWorkspaceCloudSync';
import type { LocalWorkspaceState } from '@/features/reading/reading-cloud-state';

function buildWorkspaceViewModel({
  hasApiKey,
  syncStatus,
}: Pick<WorkspacePageProps, 'hasApiKey'> & {
  syncStatus: WorkspaceSyncStatus;
}): WorkspaceViewModel {
  const syncLabelByStatus: Record<WorkspaceSyncStatus, string> = {
    loading: 'Loading cloud workspace',
    saving: 'Saving to cloud',
    saved: 'Saved to cloud',
    offline: 'Cloud sync offline. Select to retry.',
    error: 'Cloud sync failed. Select to retry.',
  };
  return {
    apiKeyStatusLabel: hasApiKey ? 'API key ready' : 'API key missing',
    apiKeyStatusTone: hasApiKey ? 'ready' : 'missing',
    cloudSyncLabel: syncLabelByStatus[syncStatus],
    cloudSyncTone: syncStatus,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function getArtifactTypeForSkill(skill: AnchorSkill): Artifact['type'] {
  const typeBySkill: Record<AnchorSkill, Artifact['type']> = {
    explain: 'explanation',
    translate: 'translation',
    vocab: 'vocabulary',
  };

  return typeBySkill[skill];
}

function getArtifactTitleForSkill(skill: AnchorSkill): string {
  const titleBySkill: Record<AnchorSkill, string> = {
    explain: 'Explanation',
    translate: 'Translation',
    vocab: 'Vocabulary',
  };

  return titleBySkill[skill];
}

function clearRunningController(
  tasks: Record<string, AbortController>,
  controller: AbortController,
) {
  for (const [requestId, runningController] of Object.entries(tasks)) {
    if (runningController === controller) {
      delete tasks[requestId];
    }
  }
}

export function useWorkspace(props: WorkspacePageProps): WorkspaceController {
  const { userId, hasApiKey, model } = props;
  const runningTasksRef = useRef<Record<string, AbortController>>({});
  const {
    documentLibrary,
    activeDocument,
    documents,
    history,
    importState,
    workspaceError,
    setPasteText,
    importPastedText: importPastedTextIntoLibrary,
    importTextFile: importTextFileIntoLibrary,
    openDocument: openLibraryDocument,
    renameDocument: renameLibraryDocument,
    removeDocument: removeLibraryDocument,
    startNewDocument: closeLibraryDocument,
    openHistoryAsDocument: addHistoryDocument,
    deleteHistoryItem,
    hydrateDocumentLibrary,
  } = useReadingLibrary(userId);
  const {
    readerPreferences,
    analysisLanguage,
    updateReaderPreference,
    updateAnalysisLanguage,
    hydrateReadingPreferences,
  } = useReadingPreferences(userId);
  const {
    anchorStorage,
    activeAnchor,
    activeAnchorId,
    anchors,
    selectionToolbarPlacement,
    showSelectionActions,
    dismissSelectionToolbar,
    resetSelectionState,
    confirmPendingSelection: confirmSelection,
    setActiveAnchorId: activateStoredAnchor,
    clearActiveAnchor: clearStoredActiveAnchor,
    activateAnchor: storeActiveAnchor,
    removeAnchor,
    removeDocumentAnchors,
    hydrateAnchorStorage,
  } = useReadingSelection({ userId, activeDocument });
  const {
    artifactStorage,
    activeArtifacts,
    activeArtifact,
    artifactCountByAnchorId,
    noteDraftContent,
    anchorMarkStatusById,
    selectArtifact,
    resetSelectedArtifact,
    deleteArtifact: removeArtifact,
    removeArtifactsForAnchor,
    removeArtifactsForDocument,
    updateNoteDraft,
    updateArtifacts,
    hydrateArtifactStorage,
  } = useArtifactCollection({
    userId,
    activeDocument,
    activeAnchor,
    activeAnchorId,
    anchors,
  });

  const localWorkspaceState = useMemo<LocalWorkspaceState>(() => ({
    documentLibrary,
    anchorStorage,
    artifactStorage,
    readerPreferences,
    analysisLanguage,
  }), [
    analysisLanguage,
    anchorStorage,
    artifactStorage,
    documentLibrary,
    readerPreferences,
  ]);
  const hydrateWorkspace = useCallback((state: LocalWorkspaceState) => {
    hydrateDocumentLibrary(state.documentLibrary);
    hydrateAnchorStorage(state.anchorStorage);
    hydrateArtifactStorage(state.artifactStorage);
    hydrateReadingPreferences(state.readerPreferences, state.analysisLanguage);
  }, [
    hydrateAnchorStorage,
    hydrateArtifactStorage,
    hydrateDocumentLibrary,
    hydrateReadingPreferences,
  ]);
  const cloudSync = useWorkspaceCloudSync({
    enabled: props.cloudSyncEnabled ?? false,
    userId,
    state: localWorkspaceState,
    onHydrate: hydrateWorkspace,
  });
  const viewModel = useMemo(
    () => buildWorkspaceViewModel({ hasApiKey, syncStatus: cloudSync.status }),
    [cloudSync.status, hasApiKey],
  );
  const sessionStatsByDocumentId = useMemo(() => {
    return buildReadingSessionStats(documents, anchorStorage, artifactStorage);
  }, [anchorStorage, artifactStorage, documents]);

  const resetTransientDocumentState = useCallback(() => {
    resetSelectionState();
    resetSelectedArtifact();
  }, [resetSelectedArtifact, resetSelectionState]);

  const importPastedText = () => {
    if (importPastedTextIntoLibrary()) {
      resetTransientDocumentState();
    }
  };

  const importTextFile = async (file: File | null) => {
    if (await importTextFileIntoLibrary(file)) {
      resetTransientDocumentState();
    }
  };

  const confirmPendingSelection = (): TextAnchor | null => {
    const anchor = confirmSelection();
    if (anchor) {
      resetSelectedArtifact();
    }
    return anchor;
  };

  const setActiveAnchorId = (anchorId: string) => {
    if (activateStoredAnchor(anchorId)) {
      resetSelectedArtifact();
    }
  };

  const abortTasksFor = (matchesTask: (artifactId: string, anchorId: string) => boolean) => {
    for (const task of Object.values(artifactStorage.tasksByRequestId)) {
      if (matchesTask(task.artifactId, task.anchorId)) {
        runningTasksRef.current[task.requestId]?.abort();
      }
    }
  };

  const deleteArtifact = (artifactId: string) => {
    abortTasksFor((taskArtifactId) => taskArtifactId === artifactId);
    removeArtifact(artifactId);
  };

  const deleteAnchor = (anchorId: string) => {
    if (!anchorStorage.anchorsById[anchorId]) {
      return;
    }

    abortTasksFor((_, taskAnchorId) => taskAnchorId === anchorId);
    removeAnchor(anchorId);
    removeArtifactsForAnchor(anchorId);
    resetSelectedArtifact();
  };

  const clearActiveAnchor = () => {
    clearStoredActiveAnchor();
    resetSelectedArtifact();
  };

  const activateAnchor = (anchor: TextAnchor) => {
    storeActiveAnchor(anchor);
    resetSelectedArtifact();
  };

  const failCloseReadBeforeRequest = (
    anchor: TextAnchor,
    title: string,
    message: string,
    type: Artifact['type'] = 'close_read',
  ) => {
    const artifact = {
      ...createStreamingArtifact({
        documentId: anchor.documentId,
        anchorId: anchor.id,
        title,
        requestId: createClientId('request'),
        type,
      }),
      status: 'failed' as const,
      errorMessage: message,
    };

    updateArtifacts((current) => prependArtifact(current, artifact));
  };

  const runCloseRead = async (anchor: TextAnchor, text: string, title: string) => {
    activateAnchor(anchor);

    if (!hasApiKey) {
      failCloseReadBeforeRequest(
        anchor,
        title,
        'Missing Gemini API key. Configure it in Settings.',
      );
      return;
    }

    const requestId = createClientId('request');
    const artifact = createStreamingArtifact({
      documentId: anchor.documentId,
      anchorId: anchor.id,
      title,
      requestId,
    });
    const abortController = new AbortController();
    runningTasksRef.current[requestId] = abortController;
    updateArtifacts((current) => prependArtifact(current, artifact));

    try {
      const finalResult = await streamAnalysis(
        {
          model,
          text,
          userLanguage: analysisLanguage,
          signal: abortController.signal,
        },
        {
          onChunk: (chunk) => {
            updateArtifacts((current) => appendArtifactContent(current, artifact.id, chunk));
          },
          onStage: () => undefined,
        },
      );
      updateArtifacts((current) => updateArtifact(current, artifact.id, (item) => ({
        ...item,
        content: finalResult,
        status: 'complete',
        updatedAt: new Date().toISOString(),
      })));
    } catch (error) {
      updateArtifacts((current) => updateArtifact(current, artifact.id, (item) => ({
        ...item,
        status: isAbortError(error) ? 'stopped' : 'failed',
        errorMessage: isAbortError(error) ? undefined : error instanceof Error ? error.message : String(error),
        updatedAt: new Date().toISOString(),
      })));
    } finally {
      clearRunningController(runningTasksRef.current, abortController);
    }
  };

  const runAnchorSkillForAnchor = async (anchor: TextAnchor, skill: AnchorSkill) => {
    if (!activeDocument) {
      return;
    }

    activateAnchor(anchor);
    const title = getArtifactTitleForSkill(skill);
    const artifactType = getArtifactTypeForSkill(skill);
    if (!hasApiKey) {
      failCloseReadBeforeRequest(
        anchor,
        title,
        'Missing Gemini API key. Configure it in Settings.',
        artifactType,
      );
      return;
    }

    const pendingRequestId = createClientId('pending');
    const artifact = createStreamingArtifact({
      documentId: activeDocument.id,
      anchorId: anchor.id,
      title,
      requestId: pendingRequestId,
      type: artifactType,
    });
    const abortController = new AbortController();
    runningTasksRef.current[pendingRequestId] = abortController;
    updateArtifacts((current) => prependArtifact(current, artifact));

    try {
      const finalResult = await runAnchorSkill(
        {
          model,
          document: activeDocument,
          anchor,
          skill,
          userLanguage: analysisLanguage,
          signal: abortController.signal,
        },
        {
          onChunk: (chunk) => {
            updateArtifacts((current) => appendArtifactContent(current, artifact.id, chunk));
          },
          onStage: () => undefined,
          onMetadata: (metadata) => {
            runningTasksRef.current[metadata.requestId] = abortController;
            updateArtifacts((current) => updateArtifact(current, artifact.id, (item) => ({
              ...item,
              requestId: metadata.requestId,
              traceId: metadata.traceId,
              updatedAt: new Date().toISOString(),
            })));
          },
        },
      );
      updateArtifacts((current) => updateArtifact(current, artifact.id, (item) => ({
        ...item,
        content: finalResult.result,
        requestId: finalResult.requestId,
        traceId: finalResult.traceId,
        status: 'complete',
        updatedAt: new Date().toISOString(),
      })));
    } catch (error) {
      updateArtifacts((current) => updateArtifact(current, artifact.id, (item) => ({
        ...item,
        status: isAbortError(error) ? 'stopped' : 'failed',
        errorMessage: isAbortError(error) ? undefined : error instanceof Error ? error.message : String(error),
        updatedAt: new Date().toISOString(),
      })));
    } finally {
      clearRunningController(runningTasksRef.current, abortController);
    }
  };

  const runExplainForActiveAnchor = async () => {
    await runAnchorSkillForActiveAnchor('explain');
  };

  const runAnchorSkillForActiveAnchor = async (skill: AnchorSkill) => {
    if (!activeAnchor) {
      return;
    }

    await runAnchorSkillForAnchor(activeAnchor, skill);
  };

  const runAnchorSkillForPendingSelection = async (skill: AnchorSkill) => {
    const anchor = confirmPendingSelection();
    if (!anchor) {
      return;
    }

    await runAnchorSkillForAnchor(anchor, skill);
  };

  const startNoteForPendingSelection = (): TextAnchor | null => {
    return confirmPendingSelection();
  };

  const runCloseReadDocument = async () => {
    if (!activeDocument) {
      return;
    }

    const anchor = createAnchorFromRange({
      documentId: activeDocument.id,
      documentText: activeDocument.text,
      startOffset: 0,
      endOffset: activeDocument.text.length,
      scope: 'document',
    });

    if (anchor) {
      await runCloseRead(anchor, activeDocument.text, 'Close Read Document');
    }
  };

  const runCloseReadParagraph = async (paragraph: DocumentParagraph) => {
    if (!activeDocument) {
      return;
    }

    const anchor = createAnchorFromRange({
      documentId: activeDocument.id,
      documentText: activeDocument.text,
      startOffset: paragraph.startOffset,
      endOffset: paragraph.endOffset,
      scope: 'paragraph',
    });

    if (anchor) {
      await runCloseRead(anchor, paragraph.text, 'Close Read Paragraph');
    }
  };

  const stopArtifact = (artifact: Artifact) => {
    if (!artifact.requestId) {
      return;
    }

    runningTasksRef.current[artifact.requestId]?.abort();
  };

  const retryArtifact = async (artifact: Artifact) => {
    const anchor = anchorStorage.anchorsById[artifact.anchorId];
    if (!activeDocument || !anchor) {
      return;
    }

    const resolvedAnchor = anchor.scope === 'document'
      ? { quote: activeDocument.text }
      : resolveAnchor(anchor, activeDocument.text);
    if (!resolvedAnchor) {
      failCloseReadBeforeRequest(anchor, artifact.title, 'Source text changed and this anchor can no longer be resolved.');
      return;
    }

    if (artifact.type === 'explanation') {
      await runAnchorSkillForAnchor(anchor, 'explain');
      return;
    }

    if (artifact.type === 'translation') {
      await runAnchorSkillForAnchor(anchor, 'translate');
      return;
    }

    if (artifact.type === 'vocabulary') {
      await runAnchorSkillForAnchor(anchor, 'vocab');
      return;
    }

    await runCloseRead(anchor, resolvedAnchor.quote, artifact.title);
  };

  const startNewDocument = () => {
    if (closeLibraryDocument()) {
      resetTransientDocumentState();
    }
  };

  const openDocument = (documentId: string) => {
    if (openLibraryDocument(documentId)) {
      resetTransientDocumentState();
    }
  };

  const renameDocument = (documentId: string, title: string) => {
    renameLibraryDocument(documentId, title);
  };

  const deleteDocument = (documentId: string) => {
    if (!documentLibrary.documentsById[documentId]) {
      return;
    }

    const documentAnchorIds = new Set(
      getAnchorsForDocument(anchorStorage.anchorsById, documentId).map((anchor) => anchor.id),
    );
    abortTasksFor((_, anchorId) => documentAnchorIds.has(anchorId));
    if (!removeLibraryDocument(documentId)) {
      return;
    }

    removeDocumentAnchors(documentId);
    removeArtifactsForDocument(documentId);
    resetTransientDocumentState();
  };

  const openHistoryAsDocument = (item: HistoryItem) => {
    if (addHistoryDocument(item)) {
      resetTransientDocumentState();
    }
  };

  return {
    viewModel,
    activeDocument,
    documents,
    sessionStatsByDocumentId,
    activeAnchor,
    anchors,
    activeAnchorId,
    activeArtifacts,
    activeArtifact,
    artifactCountByAnchorId,
    noteDraftContent,
    anchorMarkStatusById,
    history,
    workspaceError,
    importState,
    readerPreferences,
    analysisLanguage,
    selectionToolbarPlacement,
    setPasteText,
    importPastedText,
    importTextFile,
    showSelectionActions,
    dismissSelectionToolbar,
    runAnchorSkillForPendingSelection,
    startNoteForPendingSelection,
    setActiveAnchorId,
    selectArtifact,
    deleteArtifact,
    deleteAnchor,
    clearActiveAnchor,
    updateNoteDraft,
    runExplainForActiveAnchor,
    runAnchorSkillForActiveAnchor,
    runCloseReadDocument,
    runCloseReadParagraph,
    stopArtifact,
    retryArtifact,
    openDocument,
    renameDocument,
    deleteDocument,
    startNewDocument,
    openHistoryAsDocument,
    deleteHistoryItem,
    updateReaderPreference,
    updateAnalysisLanguage,
    clearDocument: startNewDocument,
    retryCloudSync: cloudSync.retry,
  };
}
