import { describe, expect, it } from 'vitest';
import { DEFAULT_READER_PREFERENCES } from '@/features/reading/reading-storage';
import { createLocalWorkspaceState, buildReadingSessions, mergeCloudWorkspace } from '@/features/reading/reading-cloud-state';
import { mergeReadingSession, readingBaseline, readingContentFingerprint, type ReadingConflict } from '@/features/reading/reading-session-merge';
import type { ReadingSessionSnapshot } from '@/features/reading';
import { WorkspaceSyncState } from '@/features/reading/reading-sync-state';

const now = '2026-09-19T10:00:00.000Z';
const preferences = { activeDocumentId: 'reading', readerPreferences: DEFAULT_READER_PREFERENCES, analysisLanguage: 'en' as const };
function reading(): ReadingSessionSnapshot {
  return {
    document: { id: 'reading', title: 'Reading', text: 'Read this.', sourceType: 'paste', createdAt: now, updatedAt: now },
    activeAnchorId: 'anchor',
    anchors: [{ id: 'anchor', documentId: 'reading', scope: 'selection', quote: 'Read', normalizedQuote: 'read',
      quoteHash: 'hash', startOffset: 0, endOffset: 4, createdAt: now }],
    artifacts: ['one', 'two'].map((id) => ({ id, anchorId: 'anchor', documentId: 'reading', type: 'note',
      title: id, content: `Note ${id}`, status: 'draft', createdAt: now, updatedAt: now })),
  };
}
const journal = () => ({ knownSessionIds: ['reading'], dirtySessionIds: ['reading'], deletedSessionIds: [],
  preferencesDirty: false, revisions: { reading: 1 }, baselines: { reading: readingBaseline(reading()) } });

function hydrate(local: ReadingSessionSnapshot, remote: ReadingSessionSnapshot, legacy = false) {
  const conflicts: ReadingConflict[] = [];
  const changes = journal();
  const merged = mergeCloudWorkspace(createLocalWorkspaceState([local], preferences),
    { preferences, sessions: [{ ...remote, revision: 2, syncedAt: now }] },
    legacy ? { ...changes, baselines: undefined, revisions: undefined } : changes, conflicts);
  return { sessions: buildReadingSessions(merged), conflicts };
}

describe('content-aware reading merge', () => {
  it.each([false, true])('deduplicates identical content with an old or absent revision (legacy=%s)', (legacy) => {
    const local = reading();
    local.artifacts.reverse();
    local.artifacts[0].updatedAt = '2026-09-19T11:00:00.000Z';
    const result = hydrate(local, reading(), legacy);
    expect(result.sessions).toHaveLength(1);
    expect(result.conflicts).toEqual([]);
    expect(readingContentFingerprint(local)).toBe(readingContentFingerprint(reading()));
  });

  it('keeps local reading position while accepting a new cloud note', () => {
    const local = reading();
    local.activeAnchorId = null;
    local.document.lastOpenedAt = '2026-09-19T12:00:00.000Z';
    const remote = reading(); remote.artifacts[0].content = 'Cloud note';
    const result = hydrate(local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.sessions[0]).toMatchObject({ activeAnchorId: null,
      document: { lastOpenedAt: local.document.lastOpenedAt }, artifacts: [{ content: 'Cloud note' }, {}] });
  });

  it('merges a local rename and cloud note edit', () => {
    const local = reading(); local.document.title = 'New title';
    const remote = reading(); remote.artifacts[0].content = 'Cloud note';
    const result = hydrate(local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.sessions[0].document.title).toBe('New title');
    expect(result.sessions[0].artifacts[0].content).toBe('Cloud note');
  });

  it('merges separate note edits and independent additions on the same passage', () => {
    const local = reading(); local.artifacts[0].content = 'Device note';
    local.artifacts.push({ ...local.artifacts[0], id: 'local-new' });
    const remote = reading(); remote.artifacts[1].content = 'Cloud note';
    remote.artifacts.push({ ...remote.artifacts[1], id: 'cloud-new' });
    const { session, items } = mergeReadingSession(local, remote, readingBaseline(reading()));
    expect(items).toEqual([]);
    expect(session.artifacts.map((artifact) => artifact.content)).toEqual(['Device note', 'Cloud note', 'Cloud note', 'Device note']);
  });

  it('requires review of the same note and preserves unrelated edits with either choice', () => {
    const local = reading(); local.artifacts[0].content = 'Device note'; local.document.title = 'Local title';
    const remote = reading(); remote.artifacts[0].content = 'Cloud note'; remote.artifacts[1].content = 'Independent cloud note';
    const base = readingBaseline(reading());
    expect(mergeReadingSession(local, remote, base).items).toHaveLength(1);
    for (const choice of ['local', 'remote'] as const) {
      const { session } = mergeReadingSession(local, remote, base, choice);
      expect(session.document.title).toBe('Local title');
      expect(session.artifacts[0].content).toBe(choice === 'local' ? 'Device note' : 'Cloud note');
      expect(session.artifacts[1].content).toBe('Independent cloud note');
    }
  });

  it('does not mix anchors and artifacts when deletion overlaps a note edit', () => {
    const local = reading(); local.artifacts[0].content = 'Important local note';
    const remote = reading(); remote.anchors = []; remote.artifacts = [];
    const result = mergeReadingSession(local, remote, readingBaseline(reading()));
    expect(result.items).toHaveLength(1);
    expect(result.items[0].label).toBe('Reading text and its notes');
    expect(result.session.artifacts[0].content).toBe('Important local note');
    expect(result.session.anchors).toHaveLength(1);
  });

  it('does not merge notes into a different source text', () => {
    const local = reading(); local.artifacts[0].content = 'Local annotation';
    const remote = reading(); remote.document.text = 'Different source'; remote.anchors = []; remote.artifacts = [];
    const result = mergeReadingSession(local, remote, readingBaseline(reading()));
    expect(result.items).toHaveLength(1);
    expect(result.session.document.text).toBe('Read this.');
  });

  it('holds legacy differences for review rather than guessing which side changed', () => {
    const local = reading(); local.artifacts[0].content = 'Unknown offline change';
    const result = hydrate(local, reading(), true);
    expect(result.conflicts).toHaveLength(1);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].artifacts[0].content).toBe('Unknown offline change');
  });
});

describe('recovery persistence and explicit resolution', () => {
  it('keeps a conflict blocked across a journal round-trip without creating copies', () => {
    const local = reading(); local.artifacts[0].content = 'Device note';
    const remote = reading(); remote.artifacts[0].content = 'Cloud note';
    const cloud = { preferences, sessions: [{ ...remote, revision: 2, syncedAt: now }] };
    const first = new WorkspaceSyncState(journal());
    const state = first.hydrate(createLocalWorkspaceState([local], preferences), cloud, journal());
    const savedJournal = JSON.parse(JSON.stringify(first.journal(state)));
    const reloaded = new WorkspaceSyncState(savedJournal);
    const restored = reloaded.hydrate(state, cloud, savedJournal);
    expect(reloaded.blocked('reading')).toBe(true);
    expect(buildReadingSessions(restored)).toHaveLength(1);
    const resolved = reloaded.resolve(restored, reloaded.conflicts[0], 'local');
    expect(buildReadingSessions(resolved)[0].artifacts[0].content).toBe('Device note');
    expect(reloaded.revision('reading')).toBe(2);
    expect(reloaded.conflicts).toEqual([]);
  });

  it('restores a remotely deleted reading only through an explicit new-reading choice', () => {
    const local = reading(); local.artifacts[0].content = 'Offline note';
    const engine = new WorkspaceSyncState(journal());
    const state = engine.hydrate(createLocalWorkspaceState([local], preferences), { preferences, sessions: [] }, journal());
    expect(engine.conflicts[0].remoteDeleted).toBe(true);
    expect(buildReadingSessions(state)[0].document.id).toBe('reading');
    const [recovered] = buildReadingSessions(engine.resolve(state, engine.conflicts[0], 'local'));
    expect(recovered.document.id).not.toBe('reading');
    expect(recovered.artifacts[0].content).toBe('Offline note');
    expect(recovered.artifacts[0].anchorId).toBe(recovered.anchors[0].id);
  });

  it('accepts a cloud deletion if local changes are only reading position', () => {
    const local = reading(); local.activeAnchorId = null;
    const engine = new WorkspaceSyncState(journal());
    const state = engine.hydrate(createLocalWorkspaceState([local], preferences), { preferences, sessions: [] }, journal());
    expect(engine.conflicts).toEqual([]);
    expect(buildReadingSessions(state)).toEqual([]);
  });

  it('replays a local deletion when the cloud changed only reading position', () => {
    const remote = reading(); remote.activeAnchorId = null;
    const changes = { ...journal(), dirtySessionIds: [], deletedSessionIds: ['reading'] };
    const engine = new WorkspaceSyncState(changes);
    const state = engine.hydrate(createLocalWorkspaceState([], preferences),
      { preferences, sessions: [{ ...remote, revision: 2, syncedAt: now }] }, changes);
    expect(engine.conflicts).toEqual([]);
    expect(engine.pending(state).deletedSessionIds).toEqual(['reading']);
    expect(engine.revision('reading')).toBe(2);
  });
});

it('keeps both conflicting note versions inside the existing reading', () => {
  const local = reading(); local.artifacts[0].content = 'Local note';
  const remote = reading(); remote.artifacts[0].content = 'Cloud note'; remote.artifacts[1].content = 'Independent cloud note';
  const engine = new WorkspaceSyncState(journal());
  const state = engine.hydrate(createLocalWorkspaceState([local], preferences),
    { preferences, sessions: [{ ...remote, revision: 2, syncedAt: now }] }, journal());
  const sessions = buildReadingSessions(engine.resolve(state, engine.conflicts[0], 'both'));
  expect(sessions).toHaveLength(1);
  expect(sessions[0].document.id).toBe('reading');
  expect(sessions[0].artifacts.map((artifact) => artifact.content)).toEqual(['Cloud note', 'Local note', 'Independent cloud note']);
  expect(new Set(sessions[0].artifacts.map((artifact) => artifact.id)).size).toBe(3);
});

it('keeps delete-versus-edit blocked after reload and accepts either explicit decision', () => {
  const remote = reading(); remote.artifacts[0].content = 'New cloud note';
  const changes = { ...journal(), dirtySessionIds: [], deletedSessionIds: ['reading'] };
  const cloud = { preferences, sessions: [{ ...remote, revision: 2, syncedAt: now }] };
  const engine = new WorkspaceSyncState(changes);
  const state = engine.hydrate(createLocalWorkspaceState([], preferences), cloud, changes);
  const stored = engine.journal(state);
  const reloaded = new WorkspaceSyncState(stored);
  const next = reloaded.hydrate(state, cloud, stored);
  expect(reloaded.blocked('reading')).toBe(true);
  expect(reloaded.pending(next).deletedSessionIds).toEqual(['reading']);
  const restored = reloaded.resolve(next, reloaded.conflicts[0], 'remote');
  expect(buildReadingSessions(restored)[0].artifacts[0].content).toBe('New cloud note');
  expect(reloaded.pending(restored).deletedSessionIds).toEqual([]);
  const deleted = engine.resolve(state, engine.conflicts[0], 'local');
  expect(engine.pending(deleted).deletedSessionIds).toEqual(['reading']);
  expect(engine.blocked('reading')).toBe(false);
  expect(engine.revision('reading')).toBe(2);
});
