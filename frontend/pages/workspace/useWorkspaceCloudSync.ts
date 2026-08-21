import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteCloudReadingSession,
  getCloudWorkspace,
  saveCloudReadingSession,
  saveCloudWorkspacePreferences,
} from '@/client-api/workspaceApi';
import {
  buildReadingSessions,
  buildWorkspacePreferences,
  fingerprint,
  mergeCloudWorkspace,
  type LocalWorkspaceState,
} from '@/features/reading/reading-cloud-state';
import type { WorkspaceSyncStatus } from './workspace.types';
import {
  readWorkspaceSyncJournal,
  writeWorkspaceSyncJournal,
  type WorkspaceSyncJournal,
} from '@/features/reading/reading-sync-journal';

const SYNC_DEBOUNCE_MS = 1_500;

const LOCAL_COPY_REASSURANCE = 'Your changes remain saved on this device.';
const CLOUD_SYNC_OFFLINE_MESSAGE = `Cloud sync is offline. ${LOCAL_COPY_REASSURANCE}`;
const CLOUD_SYNC_FAILED_MESSAGE = `Unable to sync. ${LOCAL_COPY_REASSURANCE}`;

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
): WorkspaceSyncJournal {
  return {
    knownSessionIds,
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
  const hasLoadedFromCloudRef = useRef(false);
  const latestStateRef = useRef(state);
  const remoteSessionsRef = useRef(new Map<string, string>());
  const remotePreferencesRef = useRef('');
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  latestStateRef.current = state;

  useEffect(() => {
    if (!enabled) {
      setStatus('saved');
      setIsHydrated(false);
      return;
    }

    // A retry after a failed load must fetch again, otherwise the workspace can
    // never leave the offline state. A retry after a successful load only needs
    // to flush pending writes, so it must not re-enter loading and interrupt them.
    if (hasLoadedFromCloudRef.current) {
      return;
    }

    let active = true;
    const journal = readWorkspaceSyncJournal(userId);
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
        remotePreferencesRef.current = fingerprint(cloudState.preferences);
        onHydrate(mergeCloudWorkspace(
          latestStateRef.current,
          cloudState,
          journal,
        ));
        hasLoadedFromCloudRef.current = true;
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
        hasLoadedFromCloudRef.current = false;
        setError(CLOUD_SYNC_OFFLINE_MESSAGE);
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
      ...pending.changedSessions.map(saveCloudReadingSession),
      ...pending.deletedSessionIds.map(deleteCloudReadingSession),
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
      createSyncJournal(latestPending, [...remoteSessionsRef.current.keys()]),
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
      createSyncJournal(pending, [...remoteSessionsRef.current.keys()]),
    );
    if (!hasPendingChanges(pending)) {
      // Nothing to push is only good news when the cloud was actually reached.
      // Reporting "saved" after a failed load would be a false saved state.
      setStatus(hasLoadedFromCloudRef.current ? 'saved' : 'offline');
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
            ? `${syncError.message} ${LOCAL_COPY_REASSURANCE}`
            : CLOUD_SYNC_FAILED_MESSAGE);
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
    retry: () => setRetryVersion((version) => version + 1),
  };
}
