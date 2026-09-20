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
import { describeReading, mergeReadingSession, preserveReadingPosition, readingContentFingerprint, stableFingerprint, type ReadingBaseline, type ReadingConflict } from './reading-session-merge';
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
  if (!journal?.knownSessionIds.includes(sessionId)) return Boolean(remote);
  const expected = journal.revisions?.[sessionId];
  return expected === undefined || expected !== (remote?.revision ?? 0);
}

function mergeSessions(
  local: ReadingSessionSnapshot[],
  remote: StoredReadingSession[],
  journal: WorkspaceSyncJournal | undefined,
  conflicts: ReadingConflict[],
): ReadingSessionSnapshot[] {
  const remoteById = new Map(remote.map((session) => [session.document.id, session]));
  const deletedIds = new Set(journal?.deletedSessionIds ?? []);
  const dirtyIds = new Set(journal?.dirtySessionIds ?? []);
  const merged = new Map<string, ReadingSessionSnapshot>(remote.map((session) => [session.document.id, session]));
  for (const id of deletedIds) {
    recordDeletionConflict(id, remoteById.get(id), journal, conflicts);
    merged.delete(id);
  }
  for (const session of local) {
    if (deletedIds.has(session.document.id)) continue;
    mergeLocalSession(merged, session, remoteById.get(session.document.id), dirtyIds, journal, conflicts);
  }
  return [...merged.values()];
}

function recordDeletionConflict(
  id: string,
  remote: StoredReadingSession | undefined,
  journal: WorkspaceSyncJournal | undefined,
  conflicts: ReadingConflict[],
): void {
  if (!remote || !hasRevisionConflict(id, remote, journal)) return;
  if (stableFingerprint(journal?.baselines?.[id]) === readingContentFingerprint(remote)) return;
  conflicts.push({
    sessionId: id,
    title: remote.document.title,
    localDeleted: true,
    remoteDeleted: false,
    items: [{ label: 'Deleted reading changed elsewhere', local: 'Deleted', remote: describeReading(remote) }],
  });
}

function mergeLocalSession(
  merged: Map<string, ReadingSessionSnapshot>,
  local: ReadingSessionSnapshot,
  remote: StoredReadingSession | undefined,
  dirtyIds: Set<string>,
  journal: WorkspaceSyncJournal | undefined,
  conflicts: ReadingConflict[],
): void {
  const id = local.document.id;
  if (!dirtyIds.has(id)) {
    const clean = mergeCleanSession(local, remote, journal);
    if (clean) merged.set(id, clean);
    return;
  }
  if (hasRevisionConflict(id, remote, journal)) {
    const resolved = reconcileLocalSession(local, remote, journal?.baselines?.[id], conflicts);
    if (resolved) merged.set(id, resolved);
    return;
  }
  merged.set(id, local);
}

function mergeCleanSession(
  local: ReadingSessionSnapshot,
  remote: StoredReadingSession | undefined,
  journal: WorkspaceSyncJournal | undefined,
): ReadingSessionSnapshot | undefined {
  if (remote) return preserveReadingPosition(remote, local);
  return journal?.knownSessionIds.includes(local.document.id) ? undefined : local;
}

function reconcileLocalSession(
  local: ReadingSessionSnapshot,
  remote: StoredReadingSession | undefined,
  base: ReadingBaseline | undefined,
  conflicts: ReadingConflict[],
): ReadingSessionSnapshot | undefined {
  if (!remote) {
    if (base && stableFingerprint(base) === readingContentFingerprint(local)) return;
    conflicts.push({
      sessionId: local.document.id,
      title: local.document.title,
      remoteDeleted: true,
      localDeleted: false,
      items: [{ label: 'Reading deleted elsewhere', local: describeReading(local), remote: 'Deleted' }],
    });
    return local;
  }
  const result = mergeReadingSession(local, remote, base);
  if (result.items.length) conflicts.push({
    sessionId: local.document.id,
    title: local.document.title,
    items: result.items,
    remoteDeleted: false,
    localDeleted: false,
  });
  return result.items.length ? local : result.session;
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
  conflicts: ReadingConflict[] = [],
): LocalWorkspaceState {
  const localSessions = buildReadingSessions(localState);
  const mergedSessions = mergeSessions(localSessions, cloudState.sessions, journal, conflicts);
  const preferences = !journal?.preferencesDirty
    ? cloudState.preferences
    : buildWorkspacePreferences(localState);
  return createLocalWorkspaceState(mergedSessions, preferences);
}

export function fingerprint(value: unknown): string {
  return JSON.stringify(value);
}
