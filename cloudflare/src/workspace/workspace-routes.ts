import { Hono } from 'hono';
import type { CloudflareApp } from '../env';
import { ApiError } from '../http/api-error';
import { listReadingSessions } from '../reading/reading-repository';
import { WorkspacePreferencesSchema } from './workspace-schema';
import {
  findWorkspacePreferences,
  saveWorkspacePreferences,
} from './workspace-repository';

export const workspaceRoutes = new Hono<CloudflareApp>();

workspaceRoutes.get('/', async (context) => {
  const user = context.get('user');
  const [preferences, sessions] = await Promise.all([
    findWorkspacePreferences(context.env.LOGOSAI_DB, user.id),
    listReadingSessions(context.env.LOGOSAI_DB, user.id),
  ]);
  return context.json({ preferences, sessions });
});

workspaceRoutes.put('/preferences', async (context) => {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new ApiError(422, 'INVALID_JSON', 'Send valid workspace preferences.');
  }

  const parsed = WorkspacePreferencesSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'INVALID_WORKSPACE_PREFERENCES',
      'Choose supported reader and language preferences.',
    );
  }

  const user = context.get('user');
  await saveWorkspacePreferences(
    context.env.LOGOSAI_DB,
    user.id,
    parsed.data,
  );
  return context.json({ preferences: parsed.data });
});
