import type { ReadingBaseline } from './reading-session-merge';
import { readScopedStorage, writeScopedStorage } from '@/utils/scoped-storage';

const WORKSPACE_SYNC_JOURNAL_KEY = 'logosai.workspace.cloudSyncJournal:v1';

export interface WorkspaceSyncJournal {
  knownSessionIds: string[];
  dirtySessionIds: string[];
  deletedSessionIds: string[];
  preferencesDirty: boolean;
  revisions?: Record<string, number>;
  baselines?: Record<string, ReadingBaseline>;
}

const EMPTY_SYNC_JOURNAL: WorkspaceSyncJournal = {
  knownSessionIds: [],
  dirtySessionIds: [],
  deletedSessionIds: [],
  preferencesDirty: false,
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isReadingBaseline(value: unknown): value is ReadingBaseline {
  if (!value || typeof value !== 'object' || !('parts' in value)) return false;
  const parts = value.parts;
  if (!parts || typeof parts !== 'object' || Array.isArray(parts)) return false;
  return 'source' in parts && 'title' in parts && Object.values(parts).every((part) => typeof part === 'string');
}

function normalizeJournal(value: unknown): WorkspaceSyncJournal {
  if (!value || typeof value !== 'object') {
    return EMPTY_SYNC_JOURNAL;
  }
  const journal = value as Partial<WorkspaceSyncJournal>;
  if (
    !isStringArray(journal.knownSessionIds)
    || !isStringArray(journal.dirtySessionIds)
    || !isStringArray(journal.deletedSessionIds)
    || typeof journal.preferencesDirty !== 'boolean'
  ) {
    return EMPTY_SYNC_JOURNAL;
  }
  return { ...journal, ...normalizeBaselines(journal) } as WorkspaceSyncJournal;
}

function normalizeBaselines(journal: Partial<WorkspaceSyncJournal>): Partial<WorkspaceSyncJournal> {
  const revisions = Object.fromEntries(Object.entries(journal.revisions ?? {})
    .filter(([, revision]) => Number.isSafeInteger(revision) && revision >= 0));
  const baselines = Object.fromEntries(Object.entries(journal.baselines ?? {})
    .filter(([, baseline]) => isReadingBaseline(baseline)));
  return {
    ...(journal.revisions ? { revisions } : {}),
    ...(journal.baselines ? { baselines } : {}),
  };
}

export function readWorkspaceSyncJournal(userId: string): WorkspaceSyncJournal {
  try {
    const stored = readScopedStorage(WORKSPACE_SYNC_JOURNAL_KEY, userId);
    return stored ? normalizeJournal(JSON.parse(stored)) : EMPTY_SYNC_JOURNAL;
  } catch {
    return EMPTY_SYNC_JOURNAL;
  }
}

export function writeWorkspaceSyncJournal(
  userId: string,
  journal: WorkspaceSyncJournal,
): boolean {
  try {
    writeScopedStorage(
      WORKSPACE_SYNC_JOURNAL_KEY,
      JSON.stringify(journal),
      userId,
    );
    return true;
  } catch {
    return false;
  }
}
