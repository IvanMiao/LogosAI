import schema from '../migrations/0001_auth_and_reading.sql?raw';
import migration from '../migrations/0004_gemini_4_model.sql?raw';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { Miniflare } from 'miniflare';
import { accountRoutes } from '../src/account/account-routes';
import type { CloudflareApp, CloudflareBindings } from '../src/env';
import { handleApiError } from '../src/http/error-response';

const runtime = new Miniflare({
  modules: true,
  script: 'export default { fetch() { return new Response(); } }',
  compatibilityDate: '2026-08-08',
  d1Databases: ['DB'],
});
let database: D1Database;
let migratedSettings: Record<string, unknown> | null;
const app = new Hono<CloudflareApp>();
app.use('*', async (context, next) => {
  context.set('user', { id: 'reader', name: 'Reader', email: 'reader@example.invalid' });
  await next();
});
app.route('/api/account', accountRoutes);
app.onError(handleApiError);

async function executeSql(sql: string): Promise<void> {
  for (const statement of sql.replace(/--[^\n]*/g, '').split(';').filter((part) => part.trim())) {
    await database.prepare(statement).run();
  }
}

beforeAll(async () => {
  database = await runtime.getD1Database('DB') as unknown as D1Database;
  await executeSql(schema);
  await database.prepare('INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
    .bind('reader', 'Reader', 'reader@example.invalid', 0, 0, 0).run();
  await database.prepare('INSERT INTO user_settings VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind('reader', 'gemini-2.5-pro', 'encrypted-value', 'test-iv', '•••• alue', 100, 200).run();
  await executeSql(migration);
  migratedSettings = await database.prepare('SELECT * FROM user_settings').first();
}, 30_000);
afterAll(() => runtime.dispose());

function request(method = 'GET', body?: object) {
  return app.request('/api/account/settings', {
    method,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  }, { LOGOSAI_DB: database } as CloudflareBindings);
}

describe('account model persistence', () => {
  it('preserves every existing settings field through the model migration', () => {
    expect(migratedSettings).toEqual({
      user_id: 'reader', model: 'gemini-2.5-pro', encrypted_api_key: 'encrypted-value',
      api_key_iv: 'test-iv', api_key_hint: '•••• alue', created_at: 100, updated_at: 200,
    });
  });

  it.each(['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-4-argon'])(
    'saves and reloads %s without replacing the encrypted key', async (model) => {
      const response = await request('PUT', { model });
      expect(response.status).toBe(200);
      const publicSettings = { model, hasApiKey: true, apiKeyHint: '•••• alue', updatedAt: expect.any(String) };
      expect(await response.json()).toEqual({ settings: publicSettings });
      expect(await (await request()).json()).toEqual({ settings: publicSettings });
      expect(await database.prepare('SELECT encrypted_api_key, api_key_iv, created_at FROM user_settings').first())
        .toEqual({ encrypted_api_key: 'encrypted-value', api_key_iv: 'test-iv', created_at: 100 });
    },
  );

  it('rejects unrecognized model names in the API and database', async () => {
    const response = await request('PUT', { model: 'gemini-4' });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: 'INVALID_SETTINGS' });
    await expect(database.prepare('UPDATE user_settings SET model = ?').bind('gemini-4').run())
      .rejects.toThrow(/CHECK constraint/);
  });

  it('retains the credential consistency and user foreign key constraints', async () => {
    await expect(database.prepare('UPDATE user_settings SET api_key_iv = NULL').run())
      .rejects.toThrow(/CHECK constraint/);
    await database.prepare('DELETE FROM "user" WHERE id = ?').bind('reader').run();
    expect(await database.prepare('SELECT * FROM user_settings').first()).toBeNull();
  });
});
