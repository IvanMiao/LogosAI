-- Synthetic data compatible with 0001; never use a production export here.
INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES
  ('reader-a', 'Reader A', 'a@example.invalid', 0, 100, 200),
  ('reader-b', 'Reader B', 'b@example.invalid', 0, 100, 200);

INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt)
VALUES ('account-a', 'external-a', 'github', 'reader-a', 100, 200);

INSERT INTO "session" (id, expiresAt, token, createdAt, updatedAt, userId)
VALUES ('session-a', 9999999999999, 'fixture-only-session-token', 100, 200, 'reader-a');

INSERT INTO user_settings (
  user_id, model, encrypted_api_key, api_key_iv, api_key_hint, created_at, updated_at
) VALUES
  ('reader-a', 'gemini-2.5-pro', 'fixture-ciphertext', 'fixture-iv', 'test', 100, 200),
  ('reader-b', 'gemini-2.5-flash', NULL, NULL, NULL, 100, 200);

INSERT INTO workspace_preferences (
  user_id, active_document_id, reader_font_family, close_reading_font_family, created_at, updated_at
) VALUES
  ('reader-a', 'reading-a', 'sans', 'serif', 100, 200),
  ('reader-b', NULL, 'serif', 'serif', 100, 200);

INSERT INTO reading_session (
  id, user_id, title, source_text, source_type, created_at, updated_at,
  last_opened_at, active_anchor_id, revision, synced_at
) VALUES (
  'reading-a', 'reader-a', 'Original title', 'Original source text', 'paste',
  '2026-01-01', '2026-01-02', '2026-01-03', 'anchor-a', 1, 100
);

INSERT INTO reading_anchor (
  id, session_id, scope, quote, normalized_quote, quote_hash,
  start_offset, end_offset, created_at, position
) VALUES (
  'anchor-a', 'reading-a', 'selection', 'Original', 'original', 'fixture-hash',
  0, 8, '2026-01-01', 0
);

INSERT INTO reading_artifact (
  id, session_id, anchor_id, type, title, content, status, created_at, updated_at, position
) VALUES (
  'note-a', 'reading-a', 'anchor-a', 'note', 'Original note', 'Keep this note', 'draft',
  '2026-01-01', '2026-01-02', 0
);
