import type { Artifact, ArtifactStorageState, NoteArtifact } from './artifact.types';

const EMPTY_ARTIFACT_STORAGE: ArtifactStorageState = {
  artifactsByAnchorId: {},
  tasksByRequestId: {},
};

function createArtifactId(anchorId: string, type: string): string {
  return `${type}-${anchorId}-${Date.now()}`;
}

export function createEmptyArtifactStorage(): ArtifactStorageState {
  return EMPTY_ARTIFACT_STORAGE;
}

export function getArtifactsForAnchor(
  storage: ArtifactStorageState,
  anchorId: string | null,
): Artifact[] {
  if (!anchorId) {
    return [];
  }

  return storage.artifactsByAnchorId[anchorId] ?? [];
}

export function getActiveArtifact(artifacts: Artifact[]): Artifact | null {
  if (artifacts.length === 0) {
    return null;
  }

  return artifacts[0];
}

export function getPastArtifacts(artifacts: Artifact[]): Artifact[] {
  return artifacts.slice(1);
}

function isNoteDraft(artifact: Artifact): artifact is NoteArtifact {
  return artifact.type === 'note' && artifact.status === 'draft';
}

export function getNoteDraft(artifacts: Artifact[]): NoteArtifact | null {
  return artifacts.find(isNoteDraft) ?? null;
}

export function upsertNoteDraft({
  storage,
  documentId,
  anchorId,
  content,
}: {
  storage: ArtifactStorageState;
  documentId: string;
  anchorId: string;
  content: string;
}): ArtifactStorageState {
  const artifacts = storage.artifactsByAnchorId[anchorId] ?? [];
  const existingDraft = getNoteDraft(artifacts);
  const now = new Date().toISOString();
  const nextDraft: NoteArtifact = existingDraft
    ? { ...existingDraft, content, updatedAt: now }
    : {
      id: createArtifactId(anchorId, 'note'),
      documentId,
      anchorId,
      type: 'note',
      title: 'Note',
      content,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
  const otherArtifacts = artifacts.filter((artifact) => artifact.id !== nextDraft.id);

  return {
    artifactsByAnchorId: {
      ...storage.artifactsByAnchorId,
      [anchorId]: [nextDraft, ...otherArtifacts],
    },
    tasksByRequestId: storage.tasksByRequestId,
  };
}

export function prependArtifact(
  storage: ArtifactStorageState,
  artifact: Artifact,
): ArtifactStorageState {
  const artifacts = storage.artifactsByAnchorId[artifact.anchorId] ?? [];
  const task = artifact.requestId
    ? {
      [artifact.requestId]: {
        requestId: artifact.requestId,
        anchorId: artifact.anchorId,
        artifactId: artifact.id,
        status: artifact.status,
        traceId: artifact.traceId,
      },
    }
    : {};

  return {
    artifactsByAnchorId: {
      ...storage.artifactsByAnchorId,
      [artifact.anchorId]: [artifact, ...artifacts],
    },
    tasksByRequestId: {
      ...storage.tasksByRequestId,
      ...task,
    },
  };
}

export function updateArtifact(
  storage: ArtifactStorageState,
  artifactId: string,
  update: (artifact: Artifact) => Artifact,
): ArtifactStorageState {
  const artifactsByAnchorId: ArtifactStorageState['artifactsByAnchorId'] = {};
  let updatedArtifact: Artifact | undefined;

  for (const [anchorId, artifacts] of Object.entries(storage.artifactsByAnchorId)) {
    artifactsByAnchorId[anchorId] = artifacts.map((artifact) => {
      if (artifact.id !== artifactId) {
        return artifact;
      }

      const nextArtifact = update(artifact);
      updatedArtifact = nextArtifact;
      return nextArtifact;
    });
  }

  const retainedTasks: ArtifactStorageState['tasksByRequestId'] = {};
  for (const [requestId, task] of Object.entries(storage.tasksByRequestId)) {
    if (task.artifactId !== artifactId) {
      retainedTasks[requestId] = task;
    }
  }

  const tasksByRequestId = updatedArtifact?.requestId
    ? {
      ...retainedTasks,
      [updatedArtifact.requestId]: {
        requestId: updatedArtifact.requestId,
        anchorId: updatedArtifact.anchorId,
        artifactId: updatedArtifact.id,
        status: updatedArtifact.status,
        traceId: updatedArtifact.traceId,
      },
    }
    : retainedTasks;

  return { artifactsByAnchorId, tasksByRequestId };
}

export function appendArtifactContent(
  storage: ArtifactStorageState,
  artifactId: string,
  delta: string,
): ArtifactStorageState {
  return updateArtifact(storage, artifactId, (artifact) => ({
    ...artifact,
    content: `${artifact.content}${delta}`,
    updatedAt: new Date().toISOString(),
  }));
}

export function createStreamingArtifact({
  documentId,
  anchorId,
  title,
  requestId,
  type = 'close_read',
}: {
  documentId: string;
  anchorId: string;
  title: string;
  requestId: string;
  type?: Artifact['type'];
}): Artifact {
  const now = new Date().toISOString();

  return {
    id: createArtifactId(anchorId, type),
    documentId,
    anchorId,
    type,
    title,
    content: '',
    status: 'running',
    requestId,
    createdAt: now,
    updatedAt: now,
  };
}
