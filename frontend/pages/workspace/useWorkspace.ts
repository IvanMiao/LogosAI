import { useMemo, useRef, useState } from 'react';
import { runAnchorSkill, type AnchorSkill } from '@/client-api/anchorApi';
import { streamAnalysis } from '@/client-api/analysisApi';
import type { HistoryItem } from '@/types';
import {
  createAnchorFromRange,
  createAnchorFromSelection,
  getActiveAnchorIdForDocument,
  readStoredAnchors,
  removeAnchorsForDocument,
  resolveAnchor,
  setActiveAnchorForDocument,
  writeStoredAnchors,
  type AnchorStorageState,
  type TextAnchor,
} from '@/features/anchors';
import {
  appendArtifactContent,
  createStreamingArtifact,
  getActiveArtifact,
  getArtifactsForAnchor,
  getNoteDraft,
  prependArtifact,
  readStoredArtifacts,
  removeArtifact,
  removeArtifactsForAnchor,
  removeArtifactsForDocument,
  updateArtifact,
  upsertNoteDraft,
  writeStoredArtifacts,
  type Artifact,
  type ArtifactStorageState,
} from '@/features/artifacts';
import {
  createWorkspaceDocument,
  type DocumentParagraph,
  isSupportedTextFile,
} from './workspace.helpers';
import {
  addDocumentToLibrary,
  closeLibraryDocument,
  listLibraryDocuments,
  openLibraryDocument,
  removeDocumentFromLibrary,
  renameLibraryDocument,
} from './workspace-library';
import {
  getActiveDocument,
  readStoredAnalysisLanguage,
  readStoredDocumentLibrary,
  readStoredReaderPreferences,
  writeStoredAnalysisLanguage,
  writeStoredDocumentLibrary,
  writeStoredReaderPreferences,
} from './workspace-storage';
import {
  readHistory,
  removeHistoryItem,
} from '@/utils/historyStorage';
import type {
  AnchorMarkStatus,
  AnalysisLanguage,
  ImportState,
  ReaderPreferences,
  SelectionToolbarPlacement,
  WorkspaceController,
  WorkspaceDocument,
  WorkspaceDocumentLibrary,
  WorkspacePageProps,
  WorkspaceViewModel,
} from './workspace.types';

function getAnchorsForDocument(
  anchorsById: Record<string, TextAnchor>,
  documentId: string | undefined,
): TextAnchor[] {
  if (!documentId) {
    return [];
  }

  return Object.values(anchorsById).filter((anchor) => anchor.documentId === documentId);
}

function getActiveAnchor(
  anchorsById: Record<string, TextAnchor>,
  activeAnchorId: string | null,
  documentId: string | undefined,
): TextAnchor | null {
  if (!activeAnchorId || !documentId) {
    return null;
  }

  const anchor = anchorsById[activeAnchorId];
  return anchor?.documentId === documentId ? anchor : null;
}

function getAnchorMarkStatusById({
  anchors,
  activeAnchorId,
  artifactStorage,
}: {
  anchors: TextAnchor[];
  activeAnchorId: string | null;
  artifactStorage: ArtifactStorageState;
}): Record<string, AnchorMarkStatus> {
  return anchors.reduce<Record<string, AnchorMarkStatus>>((statuses, anchor) => {
    const artifacts = getArtifactsForAnchor(artifactStorage, anchor.id);
    const hasDraft = Boolean(getNoteDraft(artifacts));
    const status = anchor.id === activeAnchorId ? 'active' : hasDraft ? 'draft' : 'saved';
    return { ...statuses, [anchor.id]: status };
  }, {});
}

function buildWorkspaceViewModel({
  hasApiKey,
}: Pick<WorkspacePageProps, 'hasApiKey'>): WorkspaceViewModel {
  return {
    apiKeyStatusLabel: hasApiKey ? 'API key ready' : 'API key missing',
    apiKeyStatusTone: hasApiKey ? 'ready' : 'missing',
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
  const { apiKey, hasApiKey, model } = props;
  const runningTasksRef = useRef<Record<string, AbortController>>({});
  const [documentLibrary, setDocumentLibrary] = useState<WorkspaceDocumentLibrary>(
    () => readStoredDocumentLibrary(),
  );
  const [importState, setImportState] = useState<ImportState>({
    pasteText: '',
    importError: '',
  });
  const [history, setHistory] = useState<HistoryItem[]>(() => readHistory());
  const [readerPreferences, setReaderPreferences] = useState<ReaderPreferences>(
    () => readStoredReaderPreferences(),
  );
  const [analysisLanguage, setAnalysisLanguage] = useState<AnalysisLanguage>(
    () => readStoredAnalysisLanguage(),
  );
  const [anchorStorage, setAnchorStorage] = useState<AnchorStorageState>(
    () => readStoredAnchors(),
  );
  const [artifactStorage, setArtifactStorage] = useState<ArtifactStorageState>(
    () => readStoredArtifacts(),
  );
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectionToolbarPlacement, setSelectionToolbarPlacement] =
    useState<SelectionToolbarPlacement | null>(null);
  const [workspaceError, setWorkspaceError] = useState('');

  const viewModel = useMemo(
    () => buildWorkspaceViewModel({ hasApiKey }),
    [hasApiKey],
  );
  const activeDocument = getActiveDocument(documentLibrary);
  const documents = useMemo(
    () => listLibraryDocuments(documentLibrary),
    [documentLibrary],
  );
  const activeAnchorId = getActiveAnchorIdForDocument(
    anchorStorage,
    activeDocument?.id,
  );
  const activeAnchor = getActiveAnchor(
    anchorStorage.anchorsById,
    activeAnchorId,
    activeDocument?.id,
  );
  const anchors = getAnchorsForDocument(anchorStorage.anchorsById, activeDocument?.id);
  const activeArtifacts = getArtifactsForAnchor(artifactStorage, activeAnchor?.id ?? null);
  const selectedArtifact = activeArtifacts.find((artifact) => artifact.id === selectedArtifactId);
  const activeArtifact = selectedArtifact ?? getActiveArtifact(activeArtifacts);
  const noteDraftContent = getNoteDraft(activeArtifacts)?.content ?? '';
  const artifactCountByAnchorId = Object.fromEntries(
    anchors.map((anchor) => [
      anchor.id,
      getArtifactsForAnchor(artifactStorage, anchor.id).length,
    ]),
  );
  const anchorMarkStatusById = getAnchorMarkStatusById({
    anchors,
    activeAnchorId,
    artifactStorage,
  });

  const setPasteText = (text: string) => {
    setImportState((current) => ({ ...current, pasteText: text, importError: '' }));
  };

  const writeAnchors = (state: AnchorStorageState) => {
    setAnchorStorage(state);
    writeStoredAnchors(state);
  };

  const writeArtifacts = (state: ArtifactStorageState) => {
    setArtifactStorage(state);
    writeStoredArtifacts(state);
  };

  const updateArtifacts = (
    updater: (current: ArtifactStorageState) => ArtifactStorageState,
  ) => {
    setArtifactStorage((current) => {
      const nextState = updater(current);
      writeStoredArtifacts(nextState);
      return nextState;
    });
  };

  const commitDocumentLibrary = (nextLibrary: WorkspaceDocumentLibrary): boolean => {
    if (!writeStoredDocumentLibrary(nextLibrary)) {
      setWorkspaceError('This change could not be saved. Check browser storage and try again.');
      return false;
    }

    setDocumentLibrary(nextLibrary);
    setWorkspaceError('');
    return true;
  };

  const resetTransientDocumentState = () => {
    setSelectionToolbarPlacement(null);
    setSelectedArtifactId(null);
  };

  const addDocument = (document: WorkspaceDocument) => {
    if (commitDocumentLibrary(addDocumentToLibrary(documentLibrary, document))) {
      resetTransientDocumentState();
    }
  };

  const importPastedText = () => {
    const text = importState.pasteText.trim();
    if (!text) {
      setImportState((current) => ({
        ...current,
        importError: 'Paste some text before importing.',
      }));
      return;
    }

    addDocument(createWorkspaceDocument(text, 'paste'));
    setImportState({ pasteText: '', importError: '' });
  };

  const importTextFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!isSupportedTextFile(file.name)) {
      setImportState((current) => ({
        ...current,
        importError: 'Only .txt and .md files are supported in Workspace Alpha.',
      }));
      return;
    }

    const text = (await file.text()).trim();
    if (!text) {
      setImportState((current) => ({ ...current, importError: 'The selected file is empty.' }));
      return;
    }

    addDocument(createWorkspaceDocument(text, 'file', file.name));
    setImportState({ pasteText: '', importError: '' });
  };

  const updateReaderPreference = <Key extends keyof ReaderPreferences>(
    key: Key,
    value: ReaderPreferences[Key],
  ) => {
    setReaderPreferences((current) => {
      const nextPreferences = { ...current, [key]: value };
      writeStoredReaderPreferences(nextPreferences);
      return nextPreferences;
    });
  };

  const updateAnalysisLanguage = (language: AnalysisLanguage) => {
    setAnalysisLanguage(language);
    writeStoredAnalysisLanguage(language);
  };

  const createSelectionAnchor = (
    selectedText: string,
    placement: SelectionToolbarPlacement,
  ) => {
    if (!activeDocument) {
      return;
    }

    const anchor = createAnchorFromSelection({
      documentId: activeDocument.id,
      documentText: activeDocument.text,
      selectedText,
    });
    if (!anchor) {
      return;
    }

    const nextState = setActiveAnchorForDocument({
      anchorsById: {
        ...anchorStorage.anchorsById,
        [anchor.id]: anchor,
      },
      activeAnchorId: anchorStorage.activeAnchorId,
      activeAnchorIdByDocumentId: anchorStorage.activeAnchorIdByDocumentId,
    }, activeDocument.id, anchor.id);

    writeAnchors(nextState);
    setSelectionToolbarPlacement(placement);
    setSelectedArtifactId(null);
  };

  const setActiveAnchorId = (anchorId: string) => {
    const anchor = anchorStorage.anchorsById[anchorId];
    if (!anchor || anchor.documentId !== activeDocument?.id) {
      return;
    }

    writeAnchors(setActiveAnchorForDocument(anchorStorage, activeDocument.id, anchorId));
    setSelectionToolbarPlacement(null);
    setSelectedArtifactId(null);
  };

  const dismissSelectionToolbar = () => {
    setSelectionToolbarPlacement(null);
  };

  const selectArtifact = (artifactId: string) => {
    if (activeArtifacts.some((artifact) => artifact.id === artifactId)) {
      setSelectedArtifactId(artifactId);
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
    writeArtifacts(removeArtifact(artifactStorage, artifactId));
    setSelectedArtifactId((currentId) => currentId === artifactId ? null : currentId);
  };

  const deleteAnchor = (anchorId: string) => {
    const anchor = anchorStorage.anchorsById[anchorId];
    if (!anchor) {
      return;
    }

    abortTasksFor((_, taskAnchorId) => taskAnchorId === anchorId);
    const nextAnchorsById = { ...anchorStorage.anchorsById };
    delete nextAnchorsById[anchorId];
    const nextStorage = {
      ...anchorStorage,
      anchorsById: nextAnchorsById,
    };
    const nextActiveStorage = activeAnchorId === anchorId
      ? setActiveAnchorForDocument(nextStorage, activeDocument?.id ?? anchor.documentId, null)
      : nextStorage;
    writeAnchors(nextActiveStorage);
    writeArtifacts(removeArtifactsForAnchor(artifactStorage, anchorId));
    setSelectionToolbarPlacement(null);
    setSelectedArtifactId(null);
  };

  const clearActiveAnchor = () => {
    if (activeDocument) {
      writeAnchors(setActiveAnchorForDocument(anchorStorage, activeDocument.id, null));
    }
    setSelectionToolbarPlacement(null);
    setSelectedArtifactId(null);
  };

  const activateAnchor = (anchor: TextAnchor) => {
    const nextStorage = {
      ...anchorStorage,
      anchorsById: {
        ...anchorStorage.anchorsById,
        [anchor.id]: anchor,
      },
    };
    writeAnchors(setActiveAnchorForDocument(nextStorage, anchor.documentId, anchor.id));
    setSelectionToolbarPlacement(null);
    setSelectedArtifactId(null);
  };

  const updateNoteDraft = (content: string) => {
    if (!activeDocument || !activeAnchor) {
      return;
    }

    writeArtifacts(upsertNoteDraft({
      storage: artifactStorage,
      documentId: activeDocument.id,
      anchorId: activeAnchor.id,
      content,
    }));
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
        requestId: `request-${Date.now()}`,
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

    const requestId = `request-${Date.now()}`;
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
          apiKey,
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

    const pendingRequestId = `pending-${Date.now()}`;
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
          apiKey,
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
    if (commitDocumentLibrary(closeLibraryDocument(documentLibrary))) {
      resetTransientDocumentState();
    }
  };

  const openDocument = (documentId: string) => {
    if (commitDocumentLibrary(openLibraryDocument(documentLibrary, documentId))) {
      resetTransientDocumentState();
    }
  };

  const renameDocument = (documentId: string, title: string) => {
    commitDocumentLibrary(renameLibraryDocument(documentLibrary, documentId, title));
  };

  const deleteDocument = (documentId: string) => {
    if (!documentLibrary.documentsById[documentId]) {
      return;
    }

    const documentAnchorIds = new Set(
      getAnchorsForDocument(anchorStorage.anchorsById, documentId).map((anchor) => anchor.id),
    );
    abortTasksFor((_, anchorId) => documentAnchorIds.has(anchorId));
    const nextLibrary = removeDocumentFromLibrary(documentLibrary, documentId);
    if (!commitDocumentLibrary(nextLibrary)) {
      return;
    }

    writeAnchors(removeAnchorsForDocument(anchorStorage, documentId));
    writeArtifacts(removeArtifactsForDocument(artifactStorage, documentId));
    resetTransientDocumentState();
  };

  const openHistoryAsDocument = (item: HistoryItem) => {
    addDocument(createWorkspaceDocument(
      item.prompt,
      'history',
      `Legacy analysis ${item.id}`,
    ));
  };

  const deleteHistoryItem = (id: number) => {
    setHistory(removeHistoryItem(id));
  };

  return {
    viewModel,
    activeDocument,
    documents,
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
    createSelectionAnchor,
    dismissSelectionToolbar,
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
  };
}
