import type { ReadingBaseline } from './reading-session-merge';
import { readScopedStorage, writeScopedStorage } from '@/utils/scoped-storage';
import type { SyncJournalStore } from './reading-sync';
import type { WorkspaceSyncJournal as SyncJournal } from './reading-sync-types';
export type { WorkspaceSyncJournal } from './reading-sync-types';

const WORKSPACE_SYNC_JOURNAL_KEY = 'logosai.workspace.cloudSyncJournal:v1';

const EMPTY_SYNC_JOURNAL: SyncJournal = {
  knownSessionIds: [],
  dirtySessionIds: [],
  deletedSessionIds: [],
  preferencesDirty: false,
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isReadingBaseline(value: unknown): value is ReadingBaseline {
  if (!value || typeof value !== 'object') return false;
  const baseline = value as { version?: unknown; parts?: unknown };
  if (baseline.version !== 2) return false;
  const parts = baseline.parts;
  if (!parts || typeof parts !== 'object' || Array.isArray(parts)) return false;
  return 'source' in parts && 'title' in parts && Object.values(parts).every((part) => typeof part === 'string');
}

function normalizeJournal(value: unknown): SyncJournal {
  if (!value || typeof value !== 'object') {
    return EMPTY_SYNC_JOURNAL;
  }
  const journal = value as Partial<SyncJournal>;
  if (
    !isStringArray(journal.knownSessionIds)
    || !isStringArray(journal.dirtySessionIds)
    || !isStringArray(journal.deletedSessionIds)
    || typeof journal.preferencesDirty !== 'boolean'
  ) {
    return EMPTY_SYNC_JOURNAL;
  }
  return { ...journal, ...normalizeBaselines(journal) } as SyncJournal;
}

function normalizeBaselines(journal: Partial<SyncJournal>): Partial<SyncJournal> {
  const revisions = Object.fromEntries(Object.entries(journal.revisions ?? {})
    .filter(([, revision]) => Number.isSafeInteger(revision) && revision >= 0));
  const baselines = Object.fromEntries(Object.entries(journal.baselines ?? {})
    .filter(([, baseline]) => isReadingBaseline(baseline)));
  return {
    ...(journal.revisions ? { revisions } : {}),
    ...(journal.baselines ? { baselines } : {}),
  };
}

export function readWorkspaceSyncJournal(userId: string): SyncJournal {
  try {
    const stored = readScopedStorage(WORKSPACE_SYNC_JOURNAL_KEY, userId);
    return stored ? normalizeJournal(JSON.parse(stored)) : EMPTY_SYNC_JOURNAL;
  } catch {
    return EMPTY_SYNC_JOURNAL;
  }
}

export function writeWorkspaceSyncJournal(
  userId: string,
  journal: SyncJournal,
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

export function createSyncJournalStore(userId: string): SyncJournalStore {
  return {
    read: () => readWorkspaceSyncJournal(userId),
    write: (journal) => writeWorkspaceSyncJournal(userId, journal),
  };
}
