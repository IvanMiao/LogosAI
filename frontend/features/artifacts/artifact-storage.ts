import type { Artifact, ArtifactStorageState } from './artifact.types';

const ARTIFACT_STORAGE_KEY = 'logosai.workspace.artifacts:v1';

const EMPTY_ARTIFACT_STORAGE: ArtifactStorageState = {
  artifactsByAnchorId: {},
  tasksByRequestId: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isArtifact(value: unknown): value is Artifact {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string'
    && typeof value.documentId === 'string'
    && typeof value.anchorId === 'string'
    && typeof value.type === 'string'
    && typeof value.title === 'string'
    && typeof value.content === 'string'
    && typeof value.status === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
  );
}

function isArtifactStorageState(value: unknown): value is ArtifactStorageState {
  if (!isRecord(value) || !isRecord(value.artifactsByAnchorId)) {
    return false;
  }

  const artifactsAreValid = Object.values(value.artifactsByAnchorId).every((artifacts) => (
    Array.isArray(artifacts) && artifacts.every(isArtifact)
  ));
  const tasksAreValid = value.tasksByRequestId === undefined || isRecord(value.tasksByRequestId);

  return artifactsAreValid && tasksAreValid;
}

export function readStoredArtifacts(): ArtifactStorageState {
  try {
    const rawValue = localStorage.getItem(ARTIFACT_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : null;
    if (!isArtifactStorageState(parsedValue)) {
      return EMPTY_ARTIFACT_STORAGE;
    }

    return {
      artifactsByAnchorId: parsedValue.artifactsByAnchorId,
      tasksByRequestId: parsedValue.tasksByRequestId ?? {},
    };
  } catch {
    return EMPTY_ARTIFACT_STORAGE;
  }
}

export function writeStoredArtifacts(state: ArtifactStorageState): void {
  try {
    localStorage.setItem(ARTIFACT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can fail in private browsing or when quota is exhausted.
  }
}
