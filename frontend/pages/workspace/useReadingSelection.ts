import { useCallback, useState } from 'react';
import {
  createAnchorFromSelection,
  getActiveAnchor,
  getActiveAnchorIdForDocument,
  getAnchorsForDocument,
  readStoredAnchors,
  removeAnchorsForDocument,
  setActiveAnchorForDocument,
  writeStoredAnchors,
  type AnchorStorageState,
  type TextAnchor,
} from '@/features/anchors';
import type { WorkspaceDocument } from '@/features/reading';
import type { PendingSelection, SelectionToolbarPlacement } from './workspace.types';

interface UseReadingSelectionInput {
  userId: string;
  activeDocument: WorkspaceDocument | null;
}

interface ReadingSelection {
  anchorStorage: AnchorStorageState;
  activeAnchor: TextAnchor | null;
  activeAnchorId: string | null;
  anchors: TextAnchor[];
  selectionToolbarPlacement: SelectionToolbarPlacement | null;
  showSelectionActions: (
    selection: PendingSelection,
    placement: SelectionToolbarPlacement,
  ) => void;
  dismissSelectionToolbar: () => void;
  resetSelectionState: () => void;
  confirmPendingSelection: () => TextAnchor | null;
  setActiveAnchorId: (anchorId: string) => boolean;
  clearActiveAnchor: () => void;
  activateAnchor: (anchor: TextAnchor) => void;
  removeAnchor: (anchorId: string) => TextAnchor | null;
  removeDocumentAnchors: (documentId: string) => void;
  hydrateAnchorStorage: (storage: AnchorStorageState) => void;
}

export function useReadingSelection({
  userId,
  activeDocument,
}: UseReadingSelectionInput): ReadingSelection {
  const [anchorStorage, setAnchorStorage] = useState<AnchorStorageState>(
    () => readStoredAnchors(userId),
  );
  const [selectionToolbarPlacement, setSelectionToolbarPlacement] =
    useState<SelectionToolbarPlacement | null>(null);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const activeAnchorId = getActiveAnchorIdForDocument(
    anchorStorage,
    activeDocument?.id,
  );
  const activeAnchor = getActiveAnchor(
    anchorStorage.anchorsById,
    activeAnchorId,
    activeDocument?.id,
  );
  const anchors = getAnchorsForDocument(
    anchorStorage.anchorsById,
    activeDocument?.id,
  );

  const writeAnchorStorage = useCallback((storage: AnchorStorageState) => {
    setAnchorStorage(storage);
    writeStoredAnchors(storage, userId);
  }, [userId]);

  const hydrateAnchorStorage = useCallback((storage: AnchorStorageState) => {
    setAnchorStorage(storage);
    writeStoredAnchors(storage, userId);
  }, [userId]);

  const showSelectionActions = useCallback((
    selection: PendingSelection,
    placement: SelectionToolbarPlacement,
  ) => {
    setPendingSelection(selection);
    setSelectionToolbarPlacement(placement);
  }, []);

  const dismissSelectionToolbar = useCallback(() => {
    setPendingSelection(null);
    setSelectionToolbarPlacement(null);
  }, []);

  const confirmPendingSelection = useCallback((): TextAnchor | null => {
    if (!activeDocument || !pendingSelection) {
      return null;
    }

    const anchor = createAnchorFromSelection({
      documentId: activeDocument.id,
      documentText: activeDocument.text,
      selectedText: pendingSelection.selectedText,
      startOffset: pendingSelection.startOffset,
      endOffset: pendingSelection.endOffset,
    });
    if (!anchor) {
      return null;
    }

    const nextStorage = setActiveAnchorForDocument({
      anchorsById: {
        ...anchorStorage.anchorsById,
        [anchor.id]: anchor,
      },
      activeAnchorId: anchorStorage.activeAnchorId,
      activeAnchorIdByDocumentId: anchorStorage.activeAnchorIdByDocumentId,
    }, activeDocument.id, anchor.id);
    writeAnchorStorage(nextStorage);
    dismissSelectionToolbar();
    return anchor;
  }, [
    activeDocument,
    anchorStorage,
    dismissSelectionToolbar,
    pendingSelection,
    writeAnchorStorage,
  ]);

  const setActiveAnchorId = useCallback((anchorId: string): boolean => {
    const anchor = anchorStorage.anchorsById[anchorId];
    if (!activeDocument || !anchor || anchor.documentId !== activeDocument.id) {
      return false;
    }

    writeAnchorStorage(setActiveAnchorForDocument(
      anchorStorage,
      activeDocument.id,
      anchorId,
    ));
    setSelectionToolbarPlacement(null);
    return true;
  }, [activeDocument, anchorStorage, writeAnchorStorage]);

  const clearActiveAnchor = useCallback(() => {
    if (activeDocument) {
      writeAnchorStorage(setActiveAnchorForDocument(
        anchorStorage,
        activeDocument.id,
        null,
      ));
    }
    setSelectionToolbarPlacement(null);
  }, [activeDocument, anchorStorage, writeAnchorStorage]);

  const activateAnchor = useCallback((anchor: TextAnchor) => {
    const nextStorage = {
      ...anchorStorage,
      anchorsById: {
        ...anchorStorage.anchorsById,
        [anchor.id]: anchor,
      },
    };
    writeAnchorStorage(setActiveAnchorForDocument(
      nextStorage,
      anchor.documentId,
      anchor.id,
    ));
    setSelectionToolbarPlacement(null);
  }, [anchorStorage, writeAnchorStorage]);

  const removeAnchor = useCallback((anchorId: string): TextAnchor | null => {
    const anchor = anchorStorage.anchorsById[anchorId];
    if (!anchor) {
      return null;
    }

    const nextAnchorsById = { ...anchorStorage.anchorsById };
    delete nextAnchorsById[anchorId];
    const nextStorage = {
      ...anchorStorage,
      anchorsById: nextAnchorsById,
    };
    const nextActiveStorage = activeAnchorId === anchorId
      ? setActiveAnchorForDocument(
        nextStorage,
        activeDocument?.id ?? anchor.documentId,
        null,
      )
      : nextStorage;
    writeAnchorStorage(nextActiveStorage);
    setSelectionToolbarPlacement(null);
    return anchor;
  }, [activeAnchorId, activeDocument?.id, anchorStorage, writeAnchorStorage]);

  const removeDocumentAnchors = useCallback((documentId: string) => {
    writeAnchorStorage(removeAnchorsForDocument(anchorStorage, documentId));
  }, [anchorStorage, writeAnchorStorage]);

  return {
    anchorStorage,
    activeAnchor,
    activeAnchorId,
    anchors,
    selectionToolbarPlacement,
    showSelectionActions,
    dismissSelectionToolbar,
    resetSelectionState: dismissSelectionToolbar,
    confirmPendingSelection,
    setActiveAnchorId,
    clearActiveAnchor,
    activateAnchor,
    removeAnchor,
    removeDocumentAnchors,
    hydrateAnchorStorage,
  };
}
