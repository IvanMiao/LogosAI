export {
  appendArtifactContent,
  createEmptyArtifactStorage,
  createStreamingArtifact,
  getActiveArtifact,
  getArtifactsForAnchor,
  getNoteDraft,
  getPastArtifacts,
  prependArtifact,
  removeArtifact,
  removeArtifactsForAnchor,
  removeArtifactsForDocument,
  updateArtifact,
  upsertNoteDraft,
} from './artifact-core';
export {
  readStoredArtifacts,
  writeStoredArtifacts,
} from './artifact-storage';
export type {
  Artifact,
  ArtifactStatus,
  ArtifactStorageState,
  ArtifactTask,
  ArtifactType,
  NoteArtifact,
} from './artifact-types';
