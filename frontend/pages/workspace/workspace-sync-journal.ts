import { readScopedStorage, writeScopedStorage } from '@/utils/scopedStorage';

const WORKSPACE_SYNC_JOURNAL_KEY = 'logosai.workspace.cloudSyncJournal:v1';

export interface WorkspaceSyncJournal {
  knownSessionIds: string[];
  dirtySessionIds: string[];
  deletedSessionIds: string[];
  preferencesDirty: boolean;
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

function normalizeJournal(value: unknown): WorkspaceSyncJournal {
  if (!value || typeof value !== 'object') return EMPTY_SYNC_JOURNAL;
  const journal = value as Partial<WorkspaceSyncJournal>;
  if (
    !isStringArray(journal.knownSessionIds)
    || !isStringArray(journal.dirtySessionIds)
    || !isStringArray(journal.deletedSessionIds)
    || typeof journal.preferencesDirty !== 'boolean'
  ) {
    return EMPTY_SYNC_JOURNAL;
  }
  return journal as WorkspaceSyncJournal;
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
): void {
  try {
    writeScopedStorage(
      WORKSPACE_SYNC_JOURNAL_KEY,
      JSON.stringify(journal),
      userId,
    );
  } catch {
    // The workspace remains usable when browser storage is unavailable.
  }
}
