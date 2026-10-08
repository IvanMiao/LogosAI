import { useCallback, useContext, useState } from 'react';
import type { TextAnchor } from '@/features/anchors';
import {
  getActiveArtifact,
  getArtifactsForAnchor,
  getNoteDraft,
  removeArtifact,
  upsertNoteDraft,
  type Artifact,
  type ArtifactStorageState,
} from '@/features/artifacts';
import type { WorkspaceDocument } from '@/features/reading';
import {
  updateArtifactStorage as updateWorkspaceArtifactStorage,
} from '@/features/reading/reading-workspace';
import { getAnchorMarkStatusById } from './workspace-selectors';
import type { ReadingViewStore } from './reading-view-storage';
import { ReadingViewContext } from './reading-view-context';
import type { AnchorMarkStatus } from './workspace-types';
import type { ReadingWorkspaceStore } from './useReadingWorkspace';

interface UseArtifactCollectionInput {
  store: ReadingWorkspaceStore;
  activeDocument: WorkspaceDocument | null;
  activeAnchor: TextAnchor | null;
  activeAnchorId: string | null;
  anchors: TextAnchor[];
}

interface ArtifactCollection {
  artifactStorage: ArtifactStorageState;
  activeArtifacts: Artifact[];
  activeArtifact: Artifact | null;
  artifactCountByAnchorId: Record<string, number>;
  noteDraftContent: string;
  anchorMarkStatusById: Record<string, AnchorMarkStatus>;
  selectArtifact: (artifactId: string) => void;
  resetSelectedArtifact: () => void;
  deleteArtifact: (artifactId: string) => void;
  updateNoteDraft: (content: string) => void;
  updateArtifacts: (
    updater: (current: ArtifactStorageState) => ArtifactStorageState,
  ) => void;
}

export function useArtifactCollection({
  store,
  activeDocument,
  activeAnchor,
  activeAnchorId,
  anchors,
}: UseArtifactCollectionInput): ArtifactCollection {
  const { commit, state } = store;
  const artifactStorage = state.artifactStorage;
  const viewStore = useContext(ReadingViewContext)?.store;
  const [selectedIds, setSelectedIds] = useState<Record<string, string | null>>({});
  const documentId = activeDocument?.id ?? '';
  const selectedArtifactId = getSelectedId(selectedIds, documentId, viewStore);
  const setSelectedArtifactId = useCallback((id: string | null) => {
    setSelectedIds((current) => ({ ...current, [documentId]: id }));
    viewStore?.write(documentId, 'selectedArtifactId', id);
  }, [documentId, viewStore]);
  const activeArtifacts = getArtifactsForAnchor(artifactStorage, activeAnchor?.id ?? null);
  const selectedArtifact = activeArtifacts.find((artifact) => artifact.id === selectedArtifactId);
  const activeArtifact = selectedArtifact ?? getActiveArtifact(activeArtifacts);
  const noteDraftContent = getNoteDraft(activeArtifacts)?.content ?? '';
  const artifactCountByAnchorId = Object.fromEntries(anchors.map((anchor) => [
    anchor.id,
    getArtifactsForAnchor(artifactStorage, anchor.id).length,
  ]));
  const anchorMarkStatusById = getAnchorMarkStatusById({ anchors, activeAnchorId, artifactStorage });

  const updateArtifacts = useCallback((
    updater: (current: ArtifactStorageState) => ArtifactStorageState,
  ) => {
    commit((current) => updateWorkspaceArtifactStorage(current, updater));
  }, [commit]);

  const selectArtifact = useCallback((artifactId: string) => {
    const artifactExists = Object.values(artifactStorage.artifactsByAnchorId)
      .some((artifacts) => artifacts.some((artifact) => artifact.id === artifactId));
    if (artifactExists) setSelectedArtifactId(artifactId);
  }, [artifactStorage.artifactsByAnchorId, setSelectedArtifactId]);

  const resetSelectedArtifact = useCallback(() => {
    setSelectedArtifactId(null);
  }, [setSelectedArtifactId]);

  const deleteArtifact = useCallback((artifactId: string) => {
    updateArtifacts((current) => removeArtifact(current, artifactId));
    if (selectedArtifactId === artifactId) setSelectedArtifactId(null);
  }, [selectedArtifactId, setSelectedArtifactId, updateArtifacts]);

  const updateNoteDraft = useCallback((content: string) => {
    if (!activeDocument || !activeAnchor) return;
    updateArtifacts((current) => upsertNoteDraft({
      storage: current,
      documentId: activeDocument.id,
      anchorId: activeAnchor.id,
      content,
    }));
  }, [activeAnchor, activeDocument, updateArtifacts]);

  return {
    artifactStorage,
    activeArtifacts,
    activeArtifact,
    artifactCountByAnchorId,
    noteDraftContent,
    anchorMarkStatusById,
    selectArtifact,
    resetSelectedArtifact,
    deleteArtifact,
    updateNoteDraft,
    updateArtifacts,
  };
}

function getSelectedId(ids: Record<string, string | null>, documentId: string, store?: ReadingViewStore): unknown {
  return Object.prototype.hasOwnProperty.call(ids, documentId)
    ? ids[documentId]
    : store?.read(documentId).selectedArtifactId;
}
