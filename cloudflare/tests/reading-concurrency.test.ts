import schema from '../migrations/0001_auth_and_reading.sql?raw';
import guards from '../migrations/0003_reading_revision_guards.sql?raw';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Miniflare } from 'miniflare';
import { deleteReadingSession, listReadingSessions, saveReadingSession } from '../src/reading/reading-repository';
import type { ReadingSessionSnapshot } from '../src/reading/reading-types';

const runtime = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response(); } }',
  compatibilityDate: '2026-08-08', d1Databases: ['DB'] });
let database: D1Database;
const now = '2026-09-13T00:00:00.000Z';
function snapshot(id: string, content = 'Original note'): ReadingSessionSnapshot {
  return { document: { id, title: 'Reading', text: 'Read this sentence.', sourceType: 'paste', createdAt: now, updatedAt: now },
    activeAnchorId: `${id}-anchor`, anchors: [{ id: `${id}-anchor`, documentId: id, scope: 'paragraph',
      quote: 'Read this sentence.', normalizedQuote: 'read this sentence.', quoteHash: 'hash',
      startOffset: 0, endOffset: 19, createdAt: now }],
    artifacts: [{ id: `${id}-note`, anchorId: `${id}-anchor`, documentId: id, type: 'note', title: 'Note',
      content, status: 'draft', createdAt: now, updatedAt: now }] };
}
beforeAll(async () => {
  database = await runtime.getD1Database('DB') as unknown as D1Database;
  for (const sql of schema.replace(/--[^\n]*/g, '').split(';').filter((part) => part.trim())) await database.prepare(sql).run();
  for (const sql of guards.split('END;').filter((part) => part.trim())) await database.prepare(`${sql}END;`).run();
  await database.prepare('INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
    .bind('reader', 'Reader', 'reader@example.invalid', 0, 0, 0).run();
}, 30_000);
afterAll(() => runtime.dispose());

describe('atomic reading revisions', () => {
  it('rejects a stale rename without replacing a newer saved note', async () => {
    await saveReadingSession(database, 'reader', snapshot('stale'), 0);
    await saveReadingSession(database, 'reader', snapshot('stale', 'Newer note'), 1);
    const stale = snapshot('stale'); stale.document.title = 'Stale tab rename';
    await expect(saveReadingSession(database, 'reader', stale, 1)).rejects.toMatchObject({ status: 409 });
    const saved = (await listReadingSessions(database, 'reader')).find((session) => session.document.id === 'stale')!;
    expect(saved.artifacts[0].content).toBe('Newer note');
    expect(saved.revision).toBe(2);
  });

  it('allows only one simultaneous writer at the same revision', async () => {
    await saveReadingSession(database, 'reader', snapshot('race'), 0);
    const concurrentDatabase = synchronizeBatches(database);
    const results = await Promise.allSettled([
      saveReadingSession(concurrentDatabase, 'reader', snapshot('race', 'Writer A'), 1),
      saveReadingSession(concurrentDatabase, 'reader', snapshot('race', 'Writer B'), 1),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({ reason: { status: 409 } });
    const saved = (await listReadingSessions(database, 'reader')).find((session) => session.document.id === 'race')!;
    expect(saved.artifacts).toHaveLength(1);
    expect(['Writer A', 'Writer B']).toContain(saved.artifacts[0].content);
    expect(saved.revision).toBe(2);
  });

  it('rejects stale deletion and prevents a deleted reading from being resurrected', async () => {
    await saveReadingSession(database, 'reader', snapshot('deleted'), 0);
    await saveReadingSession(database, 'reader', snapshot('deleted', 'Newer note'), 1);
    await expect(deleteReadingSession(database, 'reader', 'deleted', 1)).rejects.toMatchObject({ status: 409 });
    expect(await deleteReadingSession(database, 'reader', 'deleted', 2)).toBe(true);
    await expect(saveReadingSession(database, 'reader', snapshot('deleted'), 2)).rejects.toMatchObject({ status: 409 });
    expect((await listReadingSessions(database, 'reader')).find((session) => session.document.id === 'deleted')).toBeUndefined();
  });
});

// Both requests must pass the initial read before either transaction writes.
function synchronizeBatches(database: D1Database): D1Database {
  let release!: () => void;
  let arrivals = 0;
  const ready = new Promise<void>((resolve) => { release = resolve; });
  return new Proxy(database, {
    get(target, key) {
      if (key === 'batch') return async (statements: D1PreparedStatement[]) => {
        if (++arrivals === 2) release();
        await ready;
        return target.batch(statements);
      };
      const value = Reflect.get(target, key);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
