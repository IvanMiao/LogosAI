import { useCallback, useRef, useState } from 'react';
import type { LocalWorkspaceState } from '@/features/reading/reading-cloud-state';
import {
  readLocalWorkspace,
  writeLocalWorkspace,
} from '@/features/reading/reading-workspace-storage';

const SAVE_ERROR = 'This change could not be saved. Check browser storage and try again.';

export interface ReadingWorkspaceStore {
  state: LocalWorkspaceState;
  error: string;
  commit: (change: (state: LocalWorkspaceState) => LocalWorkspaceState) => boolean;
  replace: (state: LocalWorkspaceState) => void;
}

export function useReadingWorkspace(userId: string): ReadingWorkspaceStore {
  const [state, setState] = useState(() => readLocalWorkspace(userId));
  const [error, setError] = useState('');
  const stateRef = useRef(state);

  const commit = useCallback((
    change: (current: LocalWorkspaceState) => LocalWorkspaceState,
  ): boolean => {
    const current = stateRef.current;
    const next = change(current);
    if (next === current) {
      setError('');
      return true;
    }
    if (!writeLocalWorkspace(current, next, userId)) {
      setError(SAVE_ERROR);
      return false;
    }
    stateRef.current = next;
    setState(next);
    setError('');
    return true;
  }, [userId]);

  const replace = useCallback((next: LocalWorkspaceState): void => {
    writeLocalWorkspace(stateRef.current, next, userId);
    stateRef.current = next;
    setState(next);
    setError('');
  }, [userId]);

  return { state, error, commit, replace };
}
