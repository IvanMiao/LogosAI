import { buildReadingSessions, buildWorkspacePreferences, fingerprint, type LocalWorkspaceState } from './reading-cloud-state';
import {
  type ReadingConflict,
} from './reading-session-merge';
import {
  WorkspaceSyncState,
  type ConflictResolution,
} from './reading-sync-state';
import type { WorkspaceSyncJournal } from './reading-sync-types';
import type {
  CloudWorkspaceState,
  ReadingSessionSnapshot,
  WorkspacePreferencesPayload,
} from './reading-session-types';

export type { ConflictResolution } from './reading-sync-state';

export type ReadingSyncStatus = 'loading' | 'saved' | 'saving' | 'offline' | 'error' | 'conflict';

export interface CloudWorkspacePort {
  load(): Promise<CloudWorkspaceState>;
  saveSession(
    session: ReadingSessionSnapshot,
    revision: number,
  ): Promise<{ revision: number; syncedAt: string }>;
  deleteSession(sessionId: string, revision: number): Promise<void>;
  savePreferences(preferences: WorkspacePreferencesPayload): Promise<unknown>;
}

export interface SyncJournalStore {
  read(): WorkspaceSyncJournal;
  write(journal: WorkspaceSyncJournal): boolean;
}

export interface ReadingSyncSnapshot {
  status: ReadingSyncStatus;
  error: string;
  conflicts: ReadingConflict[];
}

export interface ReadingSyncOptions {
  cloud: CloudWorkspacePort;
  journal: SyncJournalStore;
  initialState: LocalWorkspaceState;
  replaceLocalState: (state: LocalWorkspaceState) => void;
  onChange: (snapshot: ReadingSyncSnapshot) => void;
  debounceMs?: number;
}

export interface ReadingSync {
  start(): void;
  update(state: LocalWorkspaceState): void;
  retry(): void;
  resolveConflict(conflict: ReadingConflict, choice: ConflictResolution): string | null;
  stop(): void;
}

const SYNC_DEBOUNCE_MS = 1_500;
const STORAGE_FAILURE = 'Sync recovery could not be saved on this device. '
  + 'Keep this page open until your changes are synced or reviewed.';
const OFFLINE_ERROR = 'Cloud sync is offline. Keep this device’s changes until sync resumes.';

function isRevisionConflict(error: unknown): boolean {
  return error instanceof Error && 'status' in error
    && (error as Error & { status?: unknown }).status === 409;
}

function includeNewEdits(
  journal: WorkspaceSyncJournal,
  before: LocalWorkspaceState,
  after: LocalWorkspaceState,
): WorkspaceSyncJournal {
  const previous = new Map(buildReadingSessions(before)
    .map((session) => [session.document.id, fingerprint(session)]));
  const sessions = buildReadingSessions(after);
  const currentIds = new Set(sessions.map((session) => session.document.id));
  return {
    ...journal,
    preferencesDirty: journal.preferencesDirty
      || fingerprint(buildWorkspacePreferences(before)) !== fingerprint(buildWorkspacePreferences(after)),
    dirtySessionIds: [...new Set([...journal.dirtySessionIds, ...sessions
      .filter((session) => previous.get(session.document.id) !== fingerprint(session))
      .map((session) => session.document.id)])],
    deletedSessionIds: [...new Set([...journal.deletedSessionIds, ...[...previous.keys()]
      .filter((id) => !currentIds.has(id))])],
  };
}

async function savePending(
  cloud: CloudWorkspacePort,
  engine: WorkspaceSyncState,
  state: LocalWorkspaceState,
  active: () => boolean,
): Promise<void> {
  const pending = engine.pending(state);
  const changedSessions = pending.changedSessions.filter((session) => !engine.blocked(session.document.id));
  const deletedSessionIds = pending.deletedSessionIds.filter((id) => !engine.blocked(id));
  for (const session of changedSessions) {
    if (!active()) return;
    const saved = await cloud.saveSession(session, engine.revision(session.document.id));
    if (active()) engine.saved(session, saved);
  }
  for (const id of deletedSessionIds) {
    if (!active()) return;
    await cloud.deleteSession(id, engine.revision(id));
    if (active()) engine.deleted(id);
  }
  await savePreferences(cloud, engine, pending.preferences, pending.preferencesChanged, active);
}

async function savePreferences(
  cloud: CloudWorkspacePort,
  engine: WorkspaceSyncState,
  preferences: WorkspacePreferencesPayload,
  changed: boolean,
  active: () => boolean,
): Promise<void> {
  if (!changed || !active()) return;
  await cloud.savePreferences(preferences);
  if (active()) engine.savedPreferences(preferences);
}

class ReadingSyncController implements ReadingSync {
  private latestState: LocalWorkspaceState;
  private engine: WorkspaceSyncState | null = null;
  private status: ReadingSyncStatus = 'loading';
  private error = '';
  private storageFailed = false;
  private conflicts: ReadingConflict[] = [];
  private isHydrated = false;
  private started = false;
  private generation = 0;
  private autoRetryCount = 0;
  private retryJournal: WorkspaceSyncJournal | null = null;
  private queue: Promise<void> = Promise.resolve();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: ReadingSyncOptions) {
    this.latestState = options.initialState;
  }

  start = (): void => {
    this.started = true;
    this.generation += 1;
    this.clearTimer();
    this.isHydrated = false;
    const generation = this.generation;
    const before = this.latestState;
    const journal = this.retryJournal ?? this.options.journal.read();
    this.retryJournal = null;
    this.engine = new WorkspaceSyncState(journal, before);
    this.status = 'loading';
    this.persistJournal(this.engine, before);
    this.emit();
    this.loadWorkspace(generation, before, journal, this.engine);
  };

  update = (state: LocalWorkspaceState): void => {
    this.latestState = state;
    const engine = this.engine;
    if (!this.started || !engine) return;
    this.clearTimer();
    this.persistJournal(engine, state);
    if (!this.isHydrated) {
      this.emit();
      return;
    }
    if (!this.hasChanges(engine, state)) {
      this.status = engine.conflicts.length ? 'conflict' : 'saved';
      this.emit();
      return;
    }
    this.status = 'saving';
    this.emit();
    this.scheduleSave(engine, this.generation);
  };

  retry = (): void => {
    this.autoRetryCount = 0;
    this.restartFromJournal();
  };

  resolveConflict = (conflict: ReadingConflict, choice: ConflictResolution): string | null => {
    const engine = this.engine;
    if (!engine || !engine.blocked(conflict.sessionId)) return null;
    const merged = engine.resolve(this.latestState, conflict, choice);
    this.latestState = merged;
    this.options.replaceLocalState(merged);
    this.conflicts = [...engine.conflicts];
    this.persistJournal(engine, merged);
    this.update(merged);
    return buildWorkspacePreferences(merged).activeDocumentId;
  };

  stop = (): void => {
    this.started = false;
    this.generation += 1;
    this.clearTimer();
  };

  private emit(): void {
    const conflicts = this.engine?.review(this.latestState) ?? this.conflicts;
    this.options.onChange({
      status: this.status,
      error: this.storageFailed ? STORAGE_FAILURE : this.error,
      conflicts,
    });
  }

  private persistJournal(engine: WorkspaceSyncState, state: LocalWorkspaceState): void {
    this.storageFailed = !this.options.journal.write(engine.journal(state));
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  private hasChanges(engine: WorkspaceSyncState, state: LocalWorkspaceState): boolean {
    const pending = engine.pending(state);
    return pending.changedSessions.some((session) => !engine.blocked(session.document.id))
      || pending.deletedSessionIds.some((id) => !engine.blocked(id))
      || pending.preferencesChanged;
  }

  private loadWorkspace(
    generation: number,
    before: LocalWorkspaceState,
    journal: WorkspaceSyncJournal,
    engine: WorkspaceSyncState,
  ): void {
    void this.queue.catch(() => undefined).then(() => this.options.cloud.load()).then((cloud) => {
      if (!this.isCurrent(generation)) return;
      const currentJournal = includeNewEdits(journal, before, this.latestState);
      const merged = engine.hydrate(this.latestState, cloud, currentJournal);
      this.latestState = merged;
      this.conflicts = engine.conflicts;
      this.options.replaceLocalState(merged);
      this.error = '';
      this.status = engine.conflicts.length ? 'conflict' : 'saved';
      this.isHydrated = true;
      this.update(merged);
    }).catch(() => {
      if (!this.isCurrent(generation)) return;
      this.error = OFFLINE_ERROR;
      this.status = 'offline';
      this.emit();
    });
  }

  private scheduleSave(engine: WorkspaceSyncState, generation: number): void {
    const delay = this.options.debounceMs ?? SYNC_DEBOUNCE_MS;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.queue = this.queue.catch(() => undefined)
        .then(() => this.saveChanges(engine, generation));
    }, delay);
  }

  private async saveChanges(engine: WorkspaceSyncState, generation: number): Promise<void> {
    const active = () => this.isCurrent(generation);
    if (!active()) return;
    try {
      await savePending(this.options.cloud, engine, this.latestState, active);
      if (!active()) return;
      this.autoRetryCount = 0;
      this.error = '';
      this.status = engine.conflicts.length ? 'conflict' : 'saved';
      this.emit();
    } catch (error) {
      if (!active()) return;
      if (isRevisionConflict(error) && this.autoRetryCount < 1) {
        this.autoRetryCount += 1;
        this.restartFromJournal();
      } else {
        this.error = error instanceof Error
          ? error.message
          : 'Unable to sync. Your changes remain on this device.';
        this.status = 'error';
        this.emit();
      }
    } finally {
      if (active()) {
        this.persistJournal(engine, this.latestState);
        this.emit();
      }
    }
  }

  private restartFromJournal(): void {
    if (this.engine) this.retryJournal = this.engine.journal(this.latestState);
    this.start();
  }

  private isCurrent(generation: number): boolean {
    return this.started && generation === this.generation;
  }
}

export function createReadingSync(options: ReadingSyncOptions): ReadingSync {
  return new ReadingSyncController(options);
}
