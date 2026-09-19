import { getActiveAnchorIdForDocument, type AnchorStorageState, type TextAnchor } from '@/features/anchors';
import type { Artifact, ArtifactStorageState } from '@/features/artifacts';
import type {
  AnalysisLanguage,
  ReaderPreferences,
  WorkspaceDocumentLibrary,
} from './reading-types';
import type {
  CloudWorkspaceState,
  StoredReadingSession,
  ReadingSessionSnapshot,
  WorkspacePreferencesPayload,
} from './reading-session-types';
import { copyConflictingReading } from './reading-conflict-copy';
import type { WorkspaceSyncJournal } from './reading-sync-journal';

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
): Array<Omit<Artifact, 'stage'>> {
  return Object.values(artifactStorage.artifactsByAnchorId)
    .flat()
    .filter((artifact) => artifact.documentId === documentId)
    .map((artifact) => {
      const snapshotArtifact = { ...artifact };
      delete snapshotArtifact.stage;
      return snapshotArtifact;
    });
}

export function buildReadingSessions(
  state: LocalWorkspaceState,
): ReadingSessionSnapshot[] {
  return Object.values(state.documentLibrary.documentsById).map((document) => ({
    document,
    activeAnchorId: getActiveAnchorIdForDocument(state.anchorStorage, document.id),
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

function hasRevisionConflict(
  sessionId: string,
  remote: StoredReadingSession | undefined,
  journal?: WorkspaceSyncJournal,
): boolean {
  if (!journal?.knownSessionIds.includes(sessionId)) return false;
  const expected = journal.revisions?.[sessionId];
  return expected === undefined || expected !== (remote?.revision ?? 0);
}

function mergeSessions(
  local: ReadingSessionSnapshot[],
  remote: StoredReadingSession[],
  journal?: WorkspaceSyncJournal,
): ReadingSessionSnapshot[] {
  const remoteById = new Map(remote.map((session) => [session.document.id, session]));
  const deletedIds = new Set(journal?.deletedSessionIds ?? []);
  const dirtyIds = new Set(journal?.dirtySessionIds ?? []);
  const merged = new Map<string, ReadingSessionSnapshot>(remote.map((session) => [session.document.id, session]));
  for (const id of deletedIds) {
    if (!hasRevisionConflict(id, remoteById.get(id), journal)) merged.delete(id);
  }
  for (const session of local) {
    if (deletedIds.has(session.document.id)) continue;
    mergeLocalSession(merged, session, remoteById.get(session.document.id), dirtyIds, journal);
  }
  return [...merged.values()];
}

function mergeLocalSession(
  merged: Map<string, ReadingSessionSnapshot>,
  local: ReadingSessionSnapshot,
  remote: StoredReadingSession | undefined,
  dirtyIds: Set<string>,
  journal?: WorkspaceSyncJournal,
): void {
  const id = local.document.id;
  const dirty = dirtyIds.has(id);
  if (!remote && journal?.knownSessionIds.includes(id) && !dirty) return;
  if (dirty && hasRevisionConflict(id, remote, journal)) {
    const copy = copyConflictingReading(local);
    merged.set(copy.document.id, copy);
    return;
  }
  merged.set(id, remote && !dirty ? remote : local);
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
  const preferences = !journal?.preferencesDirty
    ? cloudState.preferences
    : buildWorkspacePreferences(localState);
  return createLocalWorkspaceState(mergedSessions, preferences);
}

export function fingerprint(value: unknown): string {
  return JSON.stringify(value);
}
