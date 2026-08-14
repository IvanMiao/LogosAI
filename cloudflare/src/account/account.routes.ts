import { Hono } from 'hono';
import { z } from 'zod';
import type { CloudflareApp } from '../env';
import { ApiError } from '../http/api-error';
import {
  createSecretHint,
  encryptUserSecret,
} from '../security/secret-encryption';
import {
  clearUserApiKey,
  findUserSettings,
  saveUserSettings,
} from './account.repository';
import type { UserSettings } from './account.types';

const SettingsInputSchema = z
  .object({
    model: z.enum(['gemini-2.5-flash', 'gemini-2.5-pro']),
    apiKey: z.string().trim().min(10).max(512).optional(),
  })
  .strict();

function toPublicSettings(
  settings: Awaited<ReturnType<typeof findUserSettings>>,
): UserSettings {
  if (!settings) {
    return {
      model: 'gemini-2.5-flash',
      hasApiKey: false,
      apiKeyHint: null,
      updatedAt: null,
    };
  }

  return {
    model: settings.model,
    hasApiKey: Boolean(settings.encryptedApiKey && settings.apiKeyIv),
    apiKeyHint: settings.apiKeyHint,
    updatedAt: new Date(settings.updatedAt).toISOString(),
  };
}

export const accountRoutes = new Hono<CloudflareApp>();

accountRoutes.get('/settings', async (context) => {
  const user = context.get('user');
  const settings = await findUserSettings(context.env.LOGOSAI_DB, user.id);
  return context.json({ settings: toPublicSettings(settings) });
});

accountRoutes.put('/settings', async (context) => {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new ApiError(422, 'INVALID_JSON', 'Send valid account settings.');
  }

  const parsed = SettingsInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'INVALID_SETTINGS',
      'Enter a valid API key and select a supported model.',
    );
  }

  const user = context.get('user');
  const current = await findUserSettings(context.env.LOGOSAI_DB, user.id);
  const encrypted = parsed.data.apiKey
    ? await encryptUserSecret(
        parsed.data.apiKey,
        context.env.CREDENTIALS_ENCRYPTION_KEY,
        user.id,
      )
    : null;

  await saveUserSettings({
    database: context.env.LOGOSAI_DB,
    userId: user.id,
    model: parsed.data.model,
    encryptedApiKey: encrypted?.ciphertext ?? current?.encryptedApiKey ?? null,
    apiKeyIv: encrypted?.iv ?? current?.apiKeyIv ?? null,
    apiKeyHint: parsed.data.apiKey
      ? createSecretHint(parsed.data.apiKey)
      : current?.apiKeyHint ?? null,
  });

  const saved = await findUserSettings(context.env.LOGOSAI_DB, user.id);
  return context.json({ settings: toPublicSettings(saved) });
});

accountRoutes.delete('/api-key', async (context) => {
  const user = context.get('user');
  await clearUserApiKey(context.env.LOGOSAI_DB, user.id);
  return context.body(null, 204);
});
