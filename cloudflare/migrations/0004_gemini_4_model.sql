-- Widen the model constraint while retaining existing encrypted credentials.
CREATE TABLE user_settings_gemini_4 (
  user_id TEXT NOT NULL PRIMARY KEY
    REFERENCES "user" (id) ON DELETE CASCADE,
  model TEXT NOT NULL DEFAULT 'gemini-2.5-flash'
    CHECK (model IN ('gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-4-argon')),
  encrypted_api_key TEXT,
  api_key_iv TEXT,
  api_key_hint TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (
    (encrypted_api_key IS NULL AND api_key_iv IS NULL AND api_key_hint IS NULL)
    OR
    (encrypted_api_key IS NOT NULL AND api_key_iv IS NOT NULL AND api_key_hint IS NOT NULL)
  )
);

INSERT INTO user_settings_gemini_4 (
  user_id, model, encrypted_api_key, api_key_iv, api_key_hint, created_at, updated_at
)
SELECT user_id, model, encrypted_api_key, api_key_iv, api_key_hint, created_at, updated_at
FROM user_settings;

DROP TABLE user_settings;
ALTER TABLE user_settings_gemini_4 RENAME TO user_settings;
