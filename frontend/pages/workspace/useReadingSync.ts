import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReadingConflict } from '@/features/reading/reading-session-merge';
import {
  createReadingSync,
  type ConflictResolution,
  type ReadingSync,
  type ReadingSyncSnapshot,
  type ReadingSyncStatus,
} from '@/features/reading/reading-sync';
import { createSyncJournalStore } from '@/features/reading/reading-sync-journal';
import {
  deleteCloudReadingSession,
  getCloudWorkspace,
  saveCloudReadingSession,
  saveCloudWorkspacePreferences,
} from '@/client-api/workspace-api';
import type { LocalWorkspaceState } from '@/features/reading/reading-cloud-state';
import type { CloudWorkspacePort } from '@/features/reading/reading-sync';

export interface WorkspaceCloudSync {
  status: ReadingSyncStatus;
  error: string;
  conflicts: ReadingConflict[];
  retry: () => void;
  resolveConflict: (conflict: ReadingConflict, choice: ConflictResolution) => string | null;
}

interface UseReadingSyncInput {
  enabled: boolean;
  userId: string;
  state: LocalWorkspaceState;
  replaceLocalState: (state: LocalWorkspaceState) => void;
}

const EMPTY_SNAPSHOT: ReadingSyncSnapshot = {
  status: 'saved',
  error: '',
  conflicts: [],
};

const cloudWorkspace: CloudWorkspacePort = {
  load: getCloudWorkspace,
  saveSession: saveCloudReadingSession,
  deleteSession: deleteCloudReadingSession,
  savePreferences: saveCloudWorkspacePreferences,
};

export function useReadingSync({
  enabled,
  userId,
  state,
  replaceLocalState,
}: UseReadingSyncInput): WorkspaceCloudSync {
  const [snapshot, setSnapshot] = useState<ReadingSyncSnapshot>(() => ({
    ...EMPTY_SNAPSHOT,
    status: enabled ? 'loading' : 'saved',
  }));
  const syncRef = useRef<ReadingSync | null>(null);
  const stateRef = useRef(state);
  const replaceRef = useRef(replaceLocalState);
  stateRef.current = state;
  replaceRef.current = replaceLocalState;

  useEffect(() => {
    if (!enabled) {
      setSnapshot((current) => ({ ...current, status: 'saved' }));
      return;
    }
    const sync = createReadingSync({
      cloud: cloudWorkspace,
      journal: createSyncJournalStore(userId),
      initialState: stateRef.current,
      replaceLocalState: (next) => replaceRef.current(next),
      onChange: setSnapshot,
    });
    syncRef.current = sync;
    sync.start();
    return () => {
      sync.stop();
      if (syncRef.current === sync) syncRef.current = null;
    };
  }, [enabled, userId]);

  useEffect(() => {
    syncRef.current?.update(state);
  }, [state]);

  const retry = useCallback(() => syncRef.current?.retry(), []);
  const resolveConflict = useCallback((
    conflict: ReadingConflict,
    choice: ConflictResolution,
  ) => syncRef.current?.resolveConflict(conflict, choice) ?? null, []);

  return { ...snapshot, retry, resolveConflict };
}
