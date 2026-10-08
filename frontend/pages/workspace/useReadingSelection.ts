import { useCallback, useState } from 'react';
import {
  createAnchorFromSelection,
  getActiveAnchor,
  getActiveAnchorIdForDocument,
  getAnchorsForDocument,
  type AnchorStorageState,
  type TextAnchor,
} from '@/features/anchors';
import type { WorkspaceDocument } from '@/features/reading';
import {
  activateAnchor as activateWorkspaceAnchor,
  setActiveAnchor as setWorkspaceActiveAnchor,
} from '@/features/reading/reading-workspace';
import type { ReadingWorkspaceStore } from './useReadingWorkspace';
import type { PendingSelection, SelectionToolbarPlacement } from './workspace-types';

interface UseReadingSelectionInput {
  store: ReadingWorkspaceStore;
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
}

export function useReadingSelection({
  store,
  activeDocument,
}: UseReadingSelectionInput): ReadingSelection {
  const { commit, state } = store;
  const anchorStorage = state.anchorStorage;
  const [selectionToolbarPlacement, setSelectionToolbarPlacement] =
    useState<SelectionToolbarPlacement | null>(null);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const activeAnchorId = getActiveAnchorIdForDocument(anchorStorage, activeDocument?.id);
  const activeAnchor = getActiveAnchor(anchorStorage.anchorsById, activeAnchorId, activeDocument?.id);
  const anchors = getAnchorsForDocument(anchorStorage.anchorsById, activeDocument?.id);

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
    if (!activeDocument || !pendingSelection) return null;
    const anchor = createAnchorFromSelection({
      documentId: activeDocument.id,
      documentText: activeDocument.text,
      selectedText: pendingSelection.selectedText,
      startOffset: pendingSelection.startOffset,
      endOffset: pendingSelection.endOffset,
    });
    if (!anchor) return null;
    commit((current) => activateWorkspaceAnchor(current, anchor));
    dismissSelectionToolbar();
    return anchor;
  }, [activeDocument, commit, dismissSelectionToolbar, pendingSelection]);

  const setActiveAnchorId = useCallback((anchorId: string): boolean => {
    let validAnchor = false;
    const saved = commit((current) => {
      const anchor = current.anchorStorage.anchorsById[anchorId];
      if (!activeDocument || !anchor || anchor.documentId !== activeDocument.id) return current;
      validAnchor = true;
      return setWorkspaceActiveAnchor(current, activeDocument.id, anchorId);
    });
    if (!validAnchor || !saved) return false;
    setSelectionToolbarPlacement(null);
    return true;
  }, [activeDocument, commit]);

  const clearActiveAnchor = useCallback(() => {
    if (activeDocument) {
      commit((current) => setWorkspaceActiveAnchor(current, activeDocument.id, null));
    }
    setSelectionToolbarPlacement(null);
  }, [activeDocument, commit]);

  const activateAnchor = useCallback((anchor: TextAnchor) => {
    commit((current) => activateWorkspaceAnchor(current, anchor));
    setSelectionToolbarPlacement(null);
  }, [commit]);

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
  };
}
