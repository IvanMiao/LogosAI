import { Hono } from 'hono';
import type { CloudflareApp } from '../env';
import { ApiError } from '../http/api-error';
import {
  deleteReadingSession,
  saveReadingSession,
} from './reading.repository';
import { ReadingSessionSnapshotSchema } from './reading.schema';

export const readingRoutes = new Hono<CloudflareApp>();

readingRoutes.put('/:sessionId', async (context) => {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new ApiError(422, 'INVALID_JSON', 'Send a valid reading session.');
  }

  const parsed = ReadingSessionSnapshotSchema.safeParse(body);
  if (!parsed.success || parsed.data.document.id !== context.req.param('sessionId')) {
    throw new ApiError(
      422,
      'INVALID_READING_SESSION',
      'The reading session contains invalid or mismatched data.',
    );
  }

  const user = context.get('user');
  const result = await saveReadingSession(
    context.env.LOGOSAI_DB,
    user.id,
    parsed.data,
  );
  return context.json(result);
});

readingRoutes.delete('/:sessionId', async (context) => {
  const user = context.get('user');
  await deleteReadingSession(
    context.env.LOGOSAI_DB,
    user.id,
    context.req.param('sessionId'),
  );
  return context.body(null, 204);
});
