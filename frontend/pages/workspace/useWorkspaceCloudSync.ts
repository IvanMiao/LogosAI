import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteCloudReadingSession,
  getCloudWorkspace,
  saveCloudReadingSession,
  saveCloudWorkspacePreferences,
} from '@/client-api/workspace-api';
import {
  buildReadingSessions,
  buildWorkspacePreferences,
  fingerprint,
  mergeCloudWorkspace,
  type LocalWorkspaceState,
} from '@/features/reading/reading-cloud-state';
import type { WorkspaceSyncStatus } from './workspace-types';
import {
  readWorkspaceSyncJournal,
  writeWorkspaceSyncJournal,
  type WorkspaceSyncJournal,
} from '@/features/reading/reading-sync-journal';

const SYNC_DEBOUNCE_MS = 1_500;

export interface WorkspaceCloudSync {
  status: WorkspaceSyncStatus;
  error: string;
  retry: () => void;
}

interface UseWorkspaceCloudSyncInput {
  enabled: boolean;
  userId: string;
  state: LocalWorkspaceState;
  onHydrate: (state: LocalWorkspaceState) => void;
}

interface PendingWorkspaceSync {
  changedSessions: ReturnType<typeof buildReadingSessions>;
  deletedSessionIds: string[];
  preferences: ReturnType<typeof buildWorkspacePreferences>;
  preferencesChanged: boolean;
}

function sessionFingerprintMap(state: LocalWorkspaceState): Map<string, string> {
  return new Map(buildReadingSessions(state).map((session) => [
    session.document.id,
    fingerprint(session),
  ]));
}

function getPendingSync(
  state: LocalWorkspaceState,
  remoteSessions: Map<string, string>,
  remotePreferences: string,
): PendingWorkspaceSync {
  const sessions = buildReadingSessions(state);
  const currentIds = new Set(sessions.map((session) => session.document.id));
  const preferences = buildWorkspacePreferences(state);

  return {
    changedSessions: sessions.filter((session) => (
      remoteSessions.get(session.document.id) !== fingerprint(session)
    )),
    deletedSessionIds: [...remoteSessions.keys()]
      .filter((sessionId) => !currentIds.has(sessionId)),
    preferences,
    preferencesChanged: remotePreferences !== fingerprint(preferences),
  };
}

function hasPendingChanges(pending: PendingWorkspaceSync): boolean {
  return pending.changedSessions.length > 0
    || pending.deletedSessionIds.length > 0
    || pending.preferencesChanged;
}

function createSyncJournal(
  pending: PendingWorkspaceSync,
  knownSessionIds: string[],
  revisions: Map<string, number>,
): WorkspaceSyncJournal {
  return {
    knownSessionIds,
    revisions: Object.fromEntries(revisions),
    dirtySessionIds: pending.changedSessions.map((session) => session.document.id),
    deletedSessionIds: pending.deletedSessionIds,
    preferencesDirty: pending.preferencesChanged,
  };
}

export function useWorkspaceCloudSync({
  enabled,
  userId,
  state,
  onHydrate,
}: UseWorkspaceCloudSyncInput): WorkspaceCloudSync {
  const [status, setStatus] = useState<WorkspaceSyncStatus>('loading');
  const [error, setError] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const latestStateRef = useRef(state);
  const remoteSessionsRef = useRef(new Map<string, string>());
  const remotePreferencesRef = useRef('');
  const revisionsRef = useRef(new Map<string, number>());
  const retryJournalRef = useRef<WorkspaceSyncJournal | null>(null);
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  latestStateRef.current = state;

  useEffect(() => {
    if (!enabled) {
      setStatus('saved');
      setIsHydrated(false);
      return;
    }

    let active = true;
    const journal = retryJournalRef.current ?? readWorkspaceSyncJournal(userId);
    retryJournalRef.current = null;
    revisionsRef.current = new Map(Object.entries(journal.revisions ?? {}));
    setStatus('loading');
    setIsHydrated(false);
    void getCloudWorkspace()
      .then((cloudState) => {
        if (!active) return;
        remoteSessionsRef.current = new Map(cloudState.sessions.map((session) => [
          session.document.id,
          fingerprint({
            document: session.document,
            activeAnchorId: session.activeAnchorId,
            anchors: session.anchors,
            artifacts: session.artifacts,
          }),
        ]));
        revisionsRef.current = new Map(cloudState.sessions.map((session) => [session.document.id, session.revision]));
        remotePreferencesRef.current = fingerprint(cloudState.preferences);
        onHydrate(mergeCloudWorkspace(
          latestStateRef.current,
          cloudState,
          journal,
        ));
        setError('');
        setStatus('saved');
        setIsHydrated(true);
      })
      .catch(() => {
        if (!active) return;
        remoteSessionsRef.current = new Map(
          journal.knownSessionIds.map((sessionId) => [sessionId, 'unknown']),
        );
        remotePreferencesRef.current = journal.preferencesDirty
          ? 'unknown'
          : fingerprint(buildWorkspacePreferences(latestStateRef.current));
        setError('Cloud sync is offline. Your changes remain saved on this device.');
        setStatus('offline');
        setIsHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [enabled, onHydrate, retryVersion, userId]);

  const syncCurrentState = useCallback(async () => {
    const pending = getPendingSync(
      state,
      remoteSessionsRef.current,
      remotePreferencesRef.current,
    );

    await Promise.all([
      ...pending.changedSessions.map(async (session) => {
        const id = session.document.id;
        const saved = await saveCloudReadingSession(session, revisionsRef.current.get(id) ?? 0);
        revisionsRef.current.set(id, saved.revision);
        remoteSessionsRef.current.set(id, fingerprint(session));
      }),
      ...pending.deletedSessionIds.map(async (id) => {
        await deleteCloudReadingSession(id, revisionsRef.current.get(id) ?? 0);
        revisionsRef.current.delete(id);
        remoteSessionsRef.current.delete(id);
      }),
    ]);
    if (pending.preferencesChanged) {
      await saveCloudWorkspacePreferences(pending.preferences);
    }

    remoteSessionsRef.current = sessionFingerprintMap(state);
    remotePreferencesRef.current = fingerprint(pending.preferences);
    const latestPending = getPendingSync(
      latestStateRef.current,
      remoteSessionsRef.current,
      remotePreferencesRef.current,
    );
    writeWorkspaceSyncJournal(
      userId,
      createSyncJournal(latestPending, [...remoteSessionsRef.current.keys()], revisionsRef.current),
    );
  }, [state, userId]);

  const enqueueSync = useCallback(() => {
    const queuedSync = syncQueueRef.current
      .catch(() => undefined)
      .then(syncCurrentState);
    syncQueueRef.current = queuedSync;
    return queuedSync;
  }, [syncCurrentState]);

  useEffect(() => {
    if (!enabled || !isHydrated) return;
    const pending = getPendingSync(
      state,
      remoteSessionsRef.current,
      remotePreferencesRef.current,
    );
    writeWorkspaceSyncJournal(
      userId,
      createSyncJournal(pending, [...remoteSessionsRef.current.keys()], revisionsRef.current),
    );
    if (!hasPendingChanges(pending)) {
      setStatus('saved');
      return;
    }

    let active = true;
    setStatus('saving');
    const timeoutId = window.setTimeout(() => {
      void enqueueSync()
        .then(() => {
          if (!active) return;
          setError('');
          setStatus('saved');
        })
        .catch((syncError) => {
          if (!active) return;
          setError(syncError instanceof Error
            ? syncError.message
            : 'Unable to sync. Your changes remain saved on this device.');
          setStatus('error');
        });
    }, SYNC_DEBOUNCE_MS);
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [enabled, enqueueSync, isHydrated, retryVersion, state, userId]);

  return {
    status,
    error,
    retry: () => {
      retryJournalRef.current = createSyncJournal(
        getPendingSync(latestStateRef.current, remoteSessionsRef.current, remotePreferencesRef.current),
        [...remoteSessionsRef.current.keys()], revisionsRef.current,
      );
      setRetryVersion((version) => version + 1);
    },
  };
}
