import { Hono } from 'hono';
import type { CloudflareApp } from '../env';
import { ApiError } from '../http/api-error';
import {
  deleteReadingSession,
  saveReadingSession,
} from './reading-repository';
import { ReadingSessionSnapshotSchema } from './reading-schema';

function readExpectedRevision(value: string | undefined): number {
  if (!value || !/^"\d+"$/.test(value)) {
    throw new ApiError(428, 'REVISION_REQUIRED', 'Reload LogosAI before saving this reading.');
  }
  const revision = Number(value.slice(1, -1));
  if (!Number.isSafeInteger(revision)) {
    throw new ApiError(422, 'INVALID_REVISION', 'Send a valid reading revision.');
  }
  return revision;
}

export const readingRoutes = new Hono<CloudflareApp>();

readingRoutes.put('/:sessionId', async (context) => {
  const expectedRevision = readExpectedRevision(context.req.header('If-Match'));
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
    expectedRevision,
  );
  return context.json(result);
});

readingRoutes.delete('/:sessionId', async (context) => {
  const user = context.get('user');
  await deleteReadingSession(
    context.env.LOGOSAI_DB,
    user.id,
    context.req.param('sessionId'),
    readExpectedRevision(context.req.header('If-Match')),
  );
  return context.body(null, 204);
});
