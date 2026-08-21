import { useCallback, useState } from 'react';
import type { TextAnchor } from '@/features/anchors';
import {
  getActiveArtifact,
  getArtifactsForAnchor,
  getNoteDraft,
  readStoredArtifacts,
  removeArtifact,
  removeArtifactsForAnchor,
  removeArtifactsForDocument,
  upsertNoteDraft,
  writeStoredArtifacts,
  type Artifact,
  type ArtifactStorageState,
} from '@/features/artifacts';
import type { WorkspaceDocument } from '@/features/reading';
import type { AnchorMarkStatus } from './workspace.types';

interface UseArtifactCollectionInput {
  userId: string;
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
  removeArtifactsForAnchor: (anchorId: string) => void;
  removeArtifactsForDocument: (documentId: string) => void;
  updateNoteDraft: (content: string) => void;
  updateArtifacts: (
    updater: (current: ArtifactStorageState) => ArtifactStorageState,
  ) => void;
  hydrateArtifactStorage: (storage: ArtifactStorageState) => void;
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

export function useArtifactCollection({
  userId,
  activeDocument,
  activeAnchor,
  activeAnchorId,
  anchors,
}: UseArtifactCollectionInput): ArtifactCollection {
  const [artifactStorage, setArtifactStorage] = useState<ArtifactStorageState>(
    () => readStoredArtifacts(userId),
  );
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const activeArtifacts = getArtifactsForAnchor(artifactStorage, activeAnchor?.id ?? null);
  const selectedArtifact = activeArtifacts.find(
    (artifact) => artifact.id === selectedArtifactId,
  );
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

  const updateArtifacts = useCallback((
    updater: (current: ArtifactStorageState) => ArtifactStorageState,
  ) => {
    setArtifactStorage((current) => {
      const nextState = updater(current);
      writeStoredArtifacts(nextState, userId);
      return nextState;
    });
  }, [userId]);

  const hydrateArtifactStorage = useCallback((storage: ArtifactStorageState) => {
    setArtifactStorage(storage);
    writeStoredArtifacts(storage, userId);
  }, [userId]);

  const selectArtifact = useCallback((artifactId: string) => {
    if (activeArtifacts.some((artifact) => artifact.id === artifactId)) {
      setSelectedArtifactId(artifactId);
    }
  }, [activeArtifacts]);

  const resetSelectedArtifact = useCallback(() => {
    setSelectedArtifactId(null);
  }, []);

  const deleteArtifact = useCallback((artifactId: string) => {
    updateArtifacts((current) => removeArtifact(current, artifactId));
    setSelectedArtifactId((currentId) => currentId === artifactId ? null : currentId);
  }, [updateArtifacts]);

  const clearArtifactsForAnchor = useCallback((anchorId: string) => {
    updateArtifacts((current) => removeArtifactsForAnchor(current, anchorId));
  }, [updateArtifacts]);

  const clearArtifactsForDocument = useCallback((documentId: string) => {
    updateArtifacts((current) => removeArtifactsForDocument(current, documentId));
  }, [updateArtifacts]);

  const updateNoteDraft = useCallback((content: string) => {
    if (!activeDocument || !activeAnchor) {
      return;
    }

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
    removeArtifactsForAnchor: clearArtifactsForAnchor,
    removeArtifactsForDocument: clearArtifactsForDocument,
    updateNoteDraft,
    updateArtifacts,
    hydrateArtifactStorage,
  };
}
