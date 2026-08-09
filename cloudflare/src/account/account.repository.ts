import type { AnalysisModel, StoredUserSettings } from './account.types';

interface UserSettingsRow {
  user_id: string;
  model: AnalysisModel;
  encrypted_api_key: string | null;
  api_key_iv: string | null;
  api_key_hint: string | null;
  updated_at: number;
}

function mapSettingsRow(row: UserSettingsRow): StoredUserSettings {
  return {
    userId: row.user_id,
    model: row.model,
    encryptedApiKey: row.encrypted_api_key,
    apiKeyIv: row.api_key_iv,
    apiKeyHint: row.api_key_hint,
    updatedAt: row.updated_at,
  };
}

export async function findUserSettings(
  database: D1Database,
  userId: string,
): Promise<StoredUserSettings | null> {
  const row = await database
    .prepare(
      `SELECT user_id, model, encrypted_api_key, api_key_iv, api_key_hint,
              updated_at
         FROM user_settings
        WHERE user_id = ?`,
    )
    .bind(userId)
    .first<UserSettingsRow>();

  return row ? mapSettingsRow(row) : null;
}

export async function saveUserSettings({
  database,
  userId,
  model,
  encryptedApiKey,
  apiKeyIv,
  apiKeyHint,
}: {
  database: D1Database;
  userId: string;
  model: AnalysisModel;
  encryptedApiKey: string | null;
  apiKeyIv: string | null;
  apiKeyHint: string | null;
}): Promise<void> {
  const now = Date.now();
  await database
    .prepare(
      `INSERT INTO user_settings (
         user_id, model, encrypted_api_key, api_key_iv, api_key_hint,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         model = excluded.model,
         encrypted_api_key = excluded.encrypted_api_key,
         api_key_iv = excluded.api_key_iv,
         api_key_hint = excluded.api_key_hint,
         updated_at = excluded.updated_at`,
    )
    .bind(
      userId,
      model,
      encryptedApiKey,
      apiKeyIv,
      apiKeyHint,
      now,
      now,
    )
    .run();
}

export async function clearUserApiKey(
  database: D1Database,
  userId: string,
): Promise<void> {
  await database
    .prepare(
      `UPDATE user_settings
          SET encrypted_api_key = NULL,
              api_key_iv = NULL,
              api_key_hint = NULL,
              updated_at = ?
        WHERE user_id = ?`,
    )
    .bind(Date.now(), userId)
    .run();
}
