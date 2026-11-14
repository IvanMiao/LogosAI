import assert from 'node:assert/strict';

export function assertMigratedFixture(database) {
  const [settings, preferences, reading, anchor, note, auth] = database.query(`
    SELECT * FROM user_settings ORDER BY user_id;
    SELECT user_id, active_document_id, reader_font_linked, reader_line_width
      FROM workspace_preferences ORDER BY user_id;
    SELECT id, title, source_text, active_anchor_id, revision FROM reading_session;
    SELECT id, session_id, quote, start_offset, end_offset FROM reading_anchor;
    SELECT id, session_id, anchor_id, content, status FROM reading_artifact;
    SELECT s.userId, s.token, a.providerId, a.accountId FROM "session" s
      JOIN account a ON s.userId = a.userId;
  `);
  assert.deepEqual(settings, [
    { user_id: 'reader-a', model: 'gemini-2.5-pro', encrypted_api_key: 'fixture-ciphertext',
      api_key_iv: 'fixture-iv', api_key_hint: 'test', created_at: 100, updated_at: 200 },
    { user_id: 'reader-b', model: 'gemini-2.5-flash', encrypted_api_key: null,
      api_key_iv: null, api_key_hint: null, created_at: 100, updated_at: 200 },
  ]);
  assert.deepEqual(preferences, [
    { user_id: 'reader-a', active_document_id: 'reading-a', reader_font_linked: 0, reader_line_width: 760 },
    { user_id: 'reader-b', active_document_id: null, reader_font_linked: 1, reader_line_width: 760 },
  ]);
  assert.deepEqual(reading, [{ id: 'reading-a', title: 'Original title',
    source_text: 'Original source text', active_anchor_id: 'anchor-a', revision: 1 }]);
  assert.deepEqual(anchor, [{ id: 'anchor-a', session_id: 'reading-a',
    quote: 'Original', start_offset: 0, end_offset: 8 }]);
  assert.deepEqual(note, [{ id: 'note-a', session_id: 'reading-a', anchor_id: 'anchor-a',
    content: 'Keep this note', status: 'draft' }]);
  assert.deepEqual(auth, [{ userId: 'reader-a', token: 'fixture-only-session-token',
    providerId: 'github', accountId: 'external-a' }]);
}

export function assertDatabaseConstraints(database) {
  database.expectFailure("UPDATE reading_session SET revision = revision WHERE id = 'reading-a'",
    /READING_REVISION_CONFLICT/);
  database.expectFailure(`INSERT INTO reading_session (
    id, user_id, title, source_text, source_type, created_at, updated_at, revision, synced_at
  ) VALUES ('invalid-revision', 'reader-a', 'Title', 'Text', 'paste', '2026-01-01', '2026-01-01', 2, 100)`,
  /READING_REVISION_CONFLICT/);
  database.query("UPDATE reading_session SET revision = revision + 1 WHERE id = 'reading-a'");
  database.expectFailure("UPDATE user_settings SET model = 'invalid' WHERE user_id = 'reader-a'",
    /CHECK constraint failed/);
  database.expectFailure("UPDATE user_settings SET api_key_iv = NULL WHERE user_id = 'reader-a'",
    /CHECK constraint failed/);
  database.expectFailure(`INSERT INTO user_settings (user_id, created_at, updated_at)
    VALUES ('missing-user', 100, 200)`, /FOREIGN KEY constraint failed/);
  database.query("UPDATE user_settings SET model = 'gemini-4-hydrogen' WHERE user_id = 'reader-a'");
  const [settings] = database.query(`SELECT model, encrypted_api_key, api_key_iv, api_key_hint
    FROM user_settings WHERE user_id = 'reader-a'`);
  assert.deepEqual(settings, [{ model: 'gemini-4-hydrogen', encrypted_api_key: 'fixture-ciphertext',
    api_key_iv: 'fixture-iv', api_key_hint: 'test' }]);
  database.query('DELETE FROM "user" WHERE id = \'reader-a\'');
  const remaining = database.query(`
    SELECT id FROM "user";
    SELECT user_id FROM user_settings;
    SELECT user_id FROM workspace_preferences;
    SELECT id FROM "session";
    SELECT id FROM account;
    SELECT id FROM reading_session;
    SELECT id FROM reading_anchor;
    SELECT id FROM reading_artifact;
    PRAGMA foreign_key_check;
  `);
  assert.deepEqual(remaining, [[{ id: 'reader-b' }], [{ user_id: 'reader-b' }],
    [{ user_id: 'reader-b' }], [], [], [], [], [], []]);
}
