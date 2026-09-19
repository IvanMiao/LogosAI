import { useCallback, useEffect, useRef, useState } from 'react';
import { RemoteApiError } from '@/client-api/api-error';
import { deleteCloudReadingSession, getCloudWorkspace, saveCloudReadingSession,
  saveCloudWorkspacePreferences } from '@/client-api/workspace-api';
import { buildReadingSessions, buildWorkspacePreferences, fingerprint, type LocalWorkspaceState } from '@/features/reading/reading-cloud-state';
import { type ReadingConflict } from '@/features/reading/reading-session-merge';
import { readWorkspaceSyncJournal, writeWorkspaceSyncJournal, type WorkspaceSyncJournal } from '@/features/reading/reading-sync-journal';
import type { WorkspaceSyncStatus } from './workspace-types';
import { WorkspaceSyncState, type ConflictResolution } from '@/features/reading/reading-sync-state';

const SYNC_DEBOUNCE_MS = 1_500;
function isRevisionConflict(error: unknown): boolean {
  return error instanceof RemoteApiError && error.status === 409;
}
export interface WorkspaceCloudSync {
  status: WorkspaceSyncStatus;
  error: string;
  conflicts: ReadingConflict[];
  retry: () => void;
  resolveConflict: (conflict: ReadingConflict, choice: ConflictResolution) => void;
}
interface UseWorkspaceCloudSyncInput {
  enabled: boolean;
  userId: string;
  state: LocalWorkspaceState;
  onHydrate: (state: LocalWorkspaceState) => void;
}

// Include edits made while the workspace request was in flight.
function includeNewEdits(journal: WorkspaceSyncJournal, before: LocalWorkspaceState, after: LocalWorkspaceState): WorkspaceSyncJournal {
  const previous = new Map(buildReadingSessions(before).map((session) => [session.document.id, fingerprint(session)]));
  const sessions = buildReadingSessions(after);
  const currentIds = new Set(sessions.map((session) => session.document.id));
  return { ...journal,
    preferencesDirty: journal.preferencesDirty || fingerprint(buildWorkspacePreferences(before)) !== fingerprint(buildWorkspacePreferences(after)),
    dirtySessionIds: [...new Set([...journal.dirtySessionIds, ...sessions.filter((session) =>
      previous.get(session.document.id) !== fingerprint(session)).map((session) => session.document.id)])],
    deletedSessionIds: [...new Set([...journal.deletedSessionIds, ...[...previous.keys()].filter((id) => !currentIds.has(id))])],
  };
}

async function savePending(engine: WorkspaceSyncState, state: LocalWorkspaceState, active: () => boolean) {
  const pending = engine.pending(state);
  const changedSessions = pending.changedSessions.filter((session) => !engine.blocked(session.document.id));
  const deletedSessionIds = pending.deletedSessionIds.filter((id) => !engine.blocked(id));
  for (const session of changedSessions) {
    if (!active()) return;
    const saved = await saveCloudReadingSession(session, engine.revision(session.document.id));
    if (active()) engine.saved(session, saved);
  }
  for (const id of deletedSessionIds) {
    if (!active()) return;
    await deleteCloudReadingSession(id, engine.revision(id));
    if (active()) engine.deleted(id);
  }
  await savePreferences(engine, pending, active);
}

async function savePreferences(engine: WorkspaceSyncState, pending: ReturnType<WorkspaceSyncState['pending']>, active: () => boolean) {
  if (pending.preferencesChanged && active()) {
    await saveCloudWorkspacePreferences(pending.preferences);
    if (active()) engine.savedPreferences(pending.preferences);
  }
}

export function useWorkspaceCloudSync({ enabled, userId, state, onHydrate }: UseWorkspaceCloudSyncInput): WorkspaceCloudSync {
  const [status, setStatus] = useState<WorkspaceSyncStatus>('loading');
  const [error, setError] = useState('');
  const [storageFailed, setStorageFailed] = useState(false);
  const [conflicts, setConflicts] = useState<ReadingConflict[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const engineRef = useRef<WorkspaceSyncState | null>(null);
  const latestStateRef = useRef(state);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const generationRef = useRef(0);
  const autoRetryRef = useRef(0);
  const retryJournalRef = useRef<WorkspaceSyncJournal | null>(null);
  latestStateRef.current = state;
  const persistJournal = useCallback((engine: WorkspaceSyncState, current: LocalWorkspaceState) => {
    setStorageFailed(!writeWorkspaceSyncJournal(userId, engine.journal(current)));
  }, [userId]);

  useEffect(() => {
    const generation = ++generationRef.current;
    if (!enabled) { setStatus('saved'); setIsHydrated(false); return; }
    const before = latestStateRef.current;
    const journal = retryJournalRef.current ?? readWorkspaceSyncJournal(userId);
    retryJournalRef.current = null;
    const engine = new WorkspaceSyncState(journal, before);
    engineRef.current = engine;
    setStatus('loading'); setIsHydrated(false);
    void queueRef.current.catch(() => undefined).then(getCloudWorkspace).then((cloud) => {
      if (generation !== generationRef.current) return;
      const currentJournal = includeNewEdits(journal, before, latestStateRef.current);
      const merged = engine.hydrate(latestStateRef.current, cloud, currentJournal);
      latestStateRef.current = merged;
      onHydrate(merged);
      setConflicts(engine.conflicts);
      setError(''); setStatus(engine.conflicts.length ? 'conflict' : 'saved'); setIsHydrated(true);
    }).catch(() => {
      if (generation !== generationRef.current) return;
      setError('Cloud sync is offline. Keep this device’s changes until sync resumes.');
      setStatus('offline');
    });
    return () => { generationRef.current = generation + 1; };
  }, [enabled, onHydrate, retryVersion, userId]);

  const retry = useCallback(() => {
    const engine = engineRef.current;
    if (engine) retryJournalRef.current = engine.journal(latestStateRef.current);
    setRetryVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!enabled || !engine) return;
    persistJournal(engine, state);
    if (!isHydrated) return;
    const pending = engine.pending(state);
    const changes = pending.changedSessions.some((session) => !engine.blocked(session.document.id))
      || pending.deletedSessionIds.some((id) => !engine.blocked(id)) || pending.preferencesChanged;
    if (!changes) { setStatus(engine.conflicts.length ? 'conflict' : 'saved'); return; }
    setStatus('saving');
    const generation = generationRef.current;
    const active = () => generation === generationRef.current;
    const timeoutId = window.setTimeout(() => {
      const run = async () => {
        if (!active()) return;
        try {
          await savePending(engine, latestStateRef.current, active);
          if (!active()) return;
          autoRetryRef.current = 0;
          setError(''); setStatus(engine.conflicts.length ? 'conflict' : 'saved');
        } catch (syncError) {
          if (!active()) return;
          if (isRevisionConflict(syncError) && autoRetryRef.current < 1) {
            autoRetryRef.current += 1;
            retry();
          } else {
            setError(syncError instanceof Error ? syncError.message : 'Unable to sync. Your changes remain on this device.');
            setStatus('error');
          }
        } finally {
          if (active()) persistJournal(engine, latestStateRef.current);
        }
      };
      queueRef.current = queueRef.current.catch(() => undefined).then(run);
    }, SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [enabled, isHydrated, retry, state, conflicts, persistJournal]);

  const resolveConflict = useCallback((conflict: ReadingConflict, choice: ConflictResolution) => {
    const engine = engineRef.current;
    if (!engine || !engine.blocked(conflict.sessionId)) return;
    const merged = engine.resolve(latestStateRef.current, conflict, choice);
    latestStateRef.current = merged;
    onHydrate(merged);
    setConflicts([...engine.conflicts]);
    persistJournal(engine, merged);
  }, [onHydrate, persistJournal]);

  const visibleConflicts = engineRef.current?.review(state) ?? conflicts;
  return { status, error: storageFailed ? 'Sync recovery could not be saved on this device. Keep this page open until your changes are synced or reviewed.' : error, conflicts: visibleConflicts, resolveConflict, retry: () => { autoRetryRef.current = 0; retry(); } };
}
