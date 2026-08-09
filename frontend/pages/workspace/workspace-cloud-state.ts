import type {
  CloudWorkspaceState,
  ReadingSessionSnapshot,
  WorkspacePreferencesPayload,
} from '@/client-api/workspaceApi';
import type { AnchorStorageState, TextAnchor } from '@/features/anchors';
import type { Artifact, ArtifactStorageState } from '@/features/artifacts';
import type {
  AnalysisLanguage,
  ReaderPreferences,
  WorkspaceDocumentLibrary,
} from './workspace.types';
import type { WorkspaceSyncJournal } from './workspace-sync-journal';

export interface LocalWorkspaceState {
  documentLibrary: WorkspaceDocumentLibrary;
  anchorStorage: AnchorStorageState;
  artifactStorage: ArtifactStorageState;
  readerPreferences: ReaderPreferences;
  analysisLanguage: AnalysisLanguage;
}

function getSessionAnchors(
  anchorStorage: AnchorStorageState,
  documentId: string,
): TextAnchor[] {
  return Object.values(anchorStorage.anchorsById)
    .filter((anchor) => anchor.documentId === documentId);
}

function getSessionArtifacts(
  artifactStorage: ArtifactStorageState,
  documentId: string,
): Artifact[] {
  return Object.values(artifactStorage.artifactsByAnchorId)
    .flat()
    .filter((artifact) => artifact.documentId === documentId);
}

export function buildReadingSessions(
  state: LocalWorkspaceState,
): ReadingSessionSnapshot[] {
  return Object.values(state.documentLibrary.documentsById).map((document) => ({
    document,
    activeAnchorId: state.anchorStorage.activeAnchorIdByDocumentId?.[document.id]
      ?? (state.documentLibrary.activeDocumentId === document.id
        ? state.anchorStorage.activeAnchorId
        : null),
    anchors: getSessionAnchors(state.anchorStorage, document.id),
    artifacts: getSessionArtifacts(state.artifactStorage, document.id),
  }));
}

export function buildWorkspacePreferences(
  state: LocalWorkspaceState,
): WorkspacePreferencesPayload {
  return {
    activeDocumentId: state.documentLibrary.activeDocumentId,
    readerPreferences: state.readerPreferences,
    analysisLanguage: state.analysisLanguage,
  };
}

function getSessionUpdatedAt(session: ReadingSessionSnapshot): number {
  const timestamps = [
    session.document.updatedAt,
    session.document.lastOpenedAt,
    ...session.anchors.map((anchor) => anchor.createdAt),
    ...session.artifacts.map((artifact) => artifact.updatedAt),
  ].filter((value): value is string => Boolean(value));
  return Math.max(...timestamps.map((value) => Date.parse(value)), 0);
}

function chooseNewerSession(
  local: ReadingSessionSnapshot,
  remote: ReadingSessionSnapshot,
): ReadingSessionSnapshot {
  return getSessionUpdatedAt(local) > getSessionUpdatedAt(remote) ? local : remote;
}

function mergeSessions(
  local: ReadingSessionSnapshot[],
  remote: ReadingSessionSnapshot[],
  journal?: WorkspaceSyncJournal,
): ReadingSessionSnapshot[] {
  const deletedIds = new Set(journal?.deletedSessionIds ?? []);
  const dirtyIds = new Set(journal?.dirtySessionIds ?? []);
  const merged = new Map(
    remote
      .filter((session) => !deletedIds.has(session.document.id))
      .map((session) => [session.document.id, session]),
  );
  for (const localSession of local) {
    const remoteSession = merged.get(localSession.document.id);
    merged.set(
      localSession.document.id,
      remoteSession && !dirtyIds.has(localSession.document.id)
        ? chooseNewerSession(localSession, remoteSession)
        : localSession,
    );
  }
  return [...merged.values()];
}

function createArtifactTask(artifact: Artifact) {
  if (!artifact.requestId) return null;
  return {
    requestId: artifact.requestId,
    anchorId: artifact.anchorId,
    artifactId: artifact.id,
    status: artifact.status,
    traceId: artifact.traceId,
  };
}

function groupArtifactsByAnchor(
  artifacts: Artifact[],
): Record<string, Artifact[]> {
  return artifacts.reduce<Record<string, Artifact[]>>((grouped, artifact) => {
    grouped[artifact.anchorId] = [
      ...(grouped[artifact.anchorId] ?? []),
      artifact,
    ];
    return grouped;
  }, {});
}

export function createLocalWorkspaceState(
  sessions: ReadingSessionSnapshot[],
  preferences: WorkspacePreferencesPayload,
): LocalWorkspaceState {
  const documentsById = Object.fromEntries(
    sessions.map((session) => [session.document.id, session.document]),
  );
  const anchors = sessions.flatMap((session) => session.anchors);
  const artifacts = sessions.flatMap((session) => session.artifacts);
  const activeDocumentId = preferences.activeDocumentId
    && documentsById[preferences.activeDocumentId]
    ? preferences.activeDocumentId
    : sessions[0]?.document.id ?? null;

  return {
    documentLibrary: { activeDocumentId, documentsById },
    anchorStorage: {
      anchorsById: Object.fromEntries(anchors.map((anchor) => [anchor.id, anchor])),
      activeAnchorId: sessions.find(
        (session) => session.document.id === activeDocumentId,
      )?.activeAnchorId ?? null,
      activeAnchorIdByDocumentId: Object.fromEntries(
        sessions.map((session) => [session.document.id, session.activeAnchorId]),
      ),
    },
    artifactStorage: {
      artifactsByAnchorId: groupArtifactsByAnchor(artifacts),
      tasksByRequestId: Object.fromEntries(
        artifacts
          .map(createArtifactTask)
          .filter((task) => task !== null)
          .map((task) => [task.requestId, task]),
      ),
    },
    readerPreferences: preferences.readerPreferences,
    analysisLanguage: preferences.analysisLanguage,
  };
}

export function mergeCloudWorkspace(
  localState: LocalWorkspaceState,
  cloudState: CloudWorkspaceState,
  journal?: WorkspaceSyncJournal,
): LocalWorkspaceState {
  const localSessions = buildReadingSessions(localState);
  const mergedSessions = mergeSessions(localSessions, cloudState.sessions, journal);
  const preferences = cloudState.sessions.length > 0 && !journal?.preferencesDirty
    ? cloudState.preferences
    : buildWorkspacePreferences(localState);
  return createLocalWorkspaceState(mergedSessions, preferences);
}

export function fingerprint(value: unknown): string {
  return JSON.stringify(value);
}
