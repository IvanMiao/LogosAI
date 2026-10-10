import type { ReadingBaseline } from './reading-session-merge';

export interface WorkspaceSyncJournal {
  knownSessionIds: string[];
  dirtySessionIds: string[];
  deletedSessionIds: string[];
  preferencesDirty: boolean;
  revisions?: Record<string, number>;
  baselines?: Record<string, ReadingBaseline>;
}
