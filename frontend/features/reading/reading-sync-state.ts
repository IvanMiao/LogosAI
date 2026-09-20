import { buildReadingSessions, buildWorkspacePreferences, createLocalWorkspaceState, fingerprint,
  mergeCloudWorkspace, type LocalWorkspaceState } from '@/features/reading/reading-cloud-state';
import { copyReadingSession } from '@/features/reading/reading-session-copy';
import { describeReading, keepBothArtifactVersions, mergeReadingSession, readingBaseline, stableFingerprint,
  type ReadingConflict, type ReadingConflictChoice } from '@/features/reading/reading-session-merge';
import type { WorkspaceSyncJournal } from '@/features/reading/reading-sync-journal';
import type { CloudWorkspaceState, ReadingSessionSnapshot, StoredReadingSession } from '@/features/reading';

function syncFingerprint(session: ReadingSessionSnapshot): string {
  return stableFingerprint({ content: readingBaseline(session), activeAnchorId: session.activeAnchorId,
    lastOpenedAt: session.document.lastOpenedAt });
}

export type ConflictResolution = ReadingConflictChoice | 'copy' | 'both';

/** The last confirmed remote state; pending user edits always live in the workspace. */
export class WorkspaceSyncState {
  remote = new Map<string, StoredReadingSession>();
  conflicts: ReadingConflict[] = [];
  private fingerprints = new Map<string, string>();
  private preferences = '';
  private known: WorkspaceSyncJournal;

  constructor(journal: WorkspaceSyncJournal, local?: LocalWorkspaceState) {
    this.known = { ...journal, revisions: { ...journal.revisions }, baselines: { ...journal.baselines } };
    this.fingerprints = new Map(journal.knownSessionIds.map((id) => [id, 'unknown']));
    if (local) this.seedCleanCache(local, journal);
  }

  private seedCleanCache(local: LocalWorkspaceState, journal: WorkspaceSyncJournal) {
    for (const session of buildReadingSessions(local)) {
      const id = session.document.id;
      if (journal.knownSessionIds.includes(id) && !journal.dirtySessionIds.includes(id)) {
        this.fingerprints.set(id, syncFingerprint(session));
      }
    }
    if (!journal.preferencesDirty) this.preferences = fingerprint(buildWorkspacePreferences(local));
  }

  pending(state: LocalWorkspaceState) {
    const sessions = buildReadingSessions(state);
    const ids = new Set(sessions.map((session) => session.document.id));
    const preferences = buildWorkspacePreferences(state);
    const activeId = preferences.activeDocumentId;
    if (activeId && this.blocked(activeId) && !this.remote.has(activeId)) preferences.activeDocumentId = null;
    return {
      changedSessions: sessions.filter((session) => this.fingerprints.get(session.document.id) !== syncFingerprint(session)),
      deletedSessionIds: [...this.fingerprints.keys()].filter((id) => !ids.has(id)),
      preferences,
      preferencesChanged: fingerprint(preferences) !== this.preferences,
    };
  }

  journal(state: LocalWorkspaceState): WorkspaceSyncJournal {
    const pending = this.pending(state);
    return { ...this.known,
      dirtySessionIds: pending.changedSessions.map((session) => session.document.id),
      deletedSessionIds: pending.deletedSessionIds,
      preferencesDirty: pending.preferencesChanged,
    };
  }

  hydrate(local: LocalWorkspaceState, cloud: CloudWorkspaceState, journal: WorkspaceSyncJournal): LocalWorkspaceState {
    this.conflicts = [];
    const merged = mergeCloudWorkspace(local, cloud, journal, this.conflicts);
    this.remote = new Map(cloud.sessions.map((session) => [session.document.id, session]));
    this.fingerprints = new Map(cloud.sessions.map((session) => [session.document.id, syncFingerprint(session)]));
    this.preferences = fingerprint(cloud.preferences);
    const blocked = new Set(this.conflicts.map((conflict) => conflict.sessionId));
    this.known = { ...journal, knownSessionIds: [...new Set([...this.remote.keys(), ...blocked])],
      revisions: {}, baselines: {} };
    for (const id of this.known.knownSessionIds) {
      if (blocked.has(id)) this.retainBaseline(id, journal);
      else this.confirmBaseline(id);
    }
    return merged;
  }

  private retainBaseline(id: string, journal: WorkspaceSyncJournal) {
    const revision = journal.revisions?.[id];
    const baseline = journal.baselines?.[id];
    if (revision !== undefined) this.known.revisions![id] = revision;
    if (baseline) this.known.baselines![id] = baseline;
  }

  private confirmBaseline(id: string) {
    const remote = this.remote.get(id);
    if (!remote) return;
    this.known.revisions![id] = remote.revision;
    this.known.baselines![id] = readingBaseline(remote);
  }

  revision(id: string): number { return this.remote.get(id)?.revision ?? this.known.revisions?.[id] ?? 0; }
  blocked(id: string): boolean { return this.conflicts.some((conflict) => conflict.sessionId === id); }

  saved(session: ReadingSessionSnapshot, result: { revision: number; syncedAt: string }) {
    const id = session.document.id;
    this.remote.set(id, { ...session, ...result });
    this.fingerprints.set(id, syncFingerprint(session));
    this.known.knownSessionIds = [...new Set([...this.known.knownSessionIds, id])];
    this.confirmBaseline(id);
  }

  deleted(id: string) {
    this.remote.delete(id);
    this.fingerprints.delete(id);
    this.known.knownSessionIds = this.known.knownSessionIds.filter((knownId) => knownId !== id);
    delete this.known.revisions![id];
    delete this.known.baselines![id];
  }

  savedPreferences(preferences: CloudWorkspaceState['preferences']) { this.preferences = fingerprint(preferences); }

  review(state: LocalWorkspaceState): ReadingConflict[] {
    const localById = new Map(buildReadingSessions(state).map((session) => [session.document.id, session]));
    return this.conflicts.map((conflict) => {
      const local = localById.get(conflict.sessionId);
      const remote = this.remote.get(conflict.sessionId);
      const items = local && remote
        ? mergeReadingSession(local, remote, this.known.baselines?.[conflict.sessionId]).items
        : [{ label: 'Reading deletion', local: local ? describeReading(local) : 'Deleted',
          remote: remote ? describeReading(remote) : 'Deleted' }];
      return { ...conflict, items, localDeleted: !local, remoteDeleted: !remote };
    });
  }

  resolve(state: LocalWorkspaceState, conflict: ReadingConflict, choice: ConflictResolution): LocalWorkspaceState {
    const sessions = buildReadingSessions(state);
    const local = sessions.find((session) => session.document.id === conflict.sessionId);
    const remote = this.remote.get(conflict.sessionId);
    const resolved = this.resolveSessions(local, remote, choice);
    const next = [...sessions.filter((session) => session.document.id !== conflict.sessionId), ...resolved];
    this.conflicts = this.conflicts.filter((item) => item.sessionId !== conflict.sessionId);
    if (remote) this.confirmBaseline(conflict.sessionId);
    else this.deleted(conflict.sessionId);
    const preferences = buildWorkspacePreferences(state);
    if (local && resolved.length && preferences.activeDocumentId === local.document.id) {
      preferences.activeDocumentId = resolved[resolved.length - 1].document.id;
    }
    return createLocalWorkspaceState(next, preferences);
  }

  private resolveSessions(local: ReadingSessionSnapshot | undefined, remote: StoredReadingSession | undefined,
    choice: ConflictResolution): ReadingSessionSnapshot[] {
    if (choice === 'copy' && local) return [...(remote ? [remote] : []), copyReadingSession(local)];
    if (!local || !remote) return resolveDeletion(local, remote, choice);
    const result = mergeReadingSession(local, remote, this.known.baselines?.[local.document.id], choice === 'remote' ? 'remote' : 'local');
    return [choice === 'both' ? keepBothArtifactVersions(result.session, local, remote, result.items) : result.session];
  }
}

function resolveDeletion(local: ReadingSessionSnapshot | undefined, remote: StoredReadingSession | undefined,
  choice: ConflictResolution): ReadingSessionSnapshot[] {
  if (!local) return choice === 'remote' && remote ? [remote] : [];
  return choice === 'remote' ? [] : [copyReadingSession(local)];
}
