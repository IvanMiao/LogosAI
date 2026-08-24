import type { TextAnchor } from '@/features/anchors';
import {
  getArtifactsForAnchor,
  getNoteDraft,
  type ArtifactStorageState,
} from '@/features/artifacts';
import type {
  AnchorMarkStatus,
  WorkspaceSessionArtifact,
} from './workspace-types';

interface AnchorMarkStatusInput {
  anchors: TextAnchor[];
  activeAnchorId: string | null;
  artifactStorage: ArtifactStorageState;
}

export function getAnchorMarkStatusById({
  anchors,
  activeAnchorId,
  artifactStorage,
}: AnchorMarkStatusInput): Record<string, AnchorMarkStatus> {
  return Object.fromEntries(anchors.map((anchor) => {
    const artifacts = getArtifactsForAnchor(artifactStorage, anchor.id);
    const hasDraft = Boolean(getNoteDraft(artifacts));
    const status = anchor.id === activeAnchorId
      ? 'active'
      : hasDraft ? 'draft' : 'saved';
    return [anchor.id, status];
  }));
}

export function getSessionArtifacts(
  artifactStorage: ArtifactStorageState,
  anchorsById: Record<string, TextAnchor>,
  documentId: string | undefined,
): WorkspaceSessionArtifact[] {
  if (!documentId) {
    return [];
  }

  return Object.values(artifactStorage.artifactsByAnchorId)
    .flat()
    .flatMap((artifact) => {
      const anchor = anchorsById[artifact.anchorId];
      return artifact.documentId === documentId && anchor ? [{ artifact, anchor }] : [];
    })
    .sort((left, right) => right.artifact.updatedAt.localeCompare(left.artifact.updatedAt));
}
