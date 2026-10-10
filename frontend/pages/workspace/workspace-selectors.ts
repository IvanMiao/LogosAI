import type { TextAnchor } from '@/features/anchors';
import {
  getArtifactsForAnchor,
  getNoteDraft,
  type ArtifactStorageState,
} from '@/features/artifacts';
import type {
  AnchorMarkStatus,
  WorkspacePageProps,
  WorkspaceSessionArtifact,
  WorkspaceSyncStatus,
  WorkspaceViewModel,
} from './workspace-types';

export function buildWorkspaceViewModel({
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
    conflict: 'Sync needs review. Local changes are kept on this device.',
  };
  return {
    apiKeyStatusLabel: hasApiKey ? 'API key ready' : 'API key missing',
    apiKeyStatusTone: hasApiKey ? 'ready' : 'missing',
    cloudSyncLabel: syncLabelByStatus[syncStatus],
    cloudSyncTone: syncStatus,
  };
}

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
