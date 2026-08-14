import type { Context } from 'hono';
import type { CloudflareApp } from '../env';
import { ApiError } from './api-error';

export function handleApiError(
  error: Error,
  context: Context<CloudflareApp>,
): Response {
  if (error instanceof ApiError) {
    return context.json(
      { code: error.code, message: error.message },
      error.status,
    );
  }

  console.error('Unhandled Cloudflare API error', {
    name: error.name,
    message: error.message,
  });
  return context.json(
    {
      code: 'INTERNAL_ERROR',
      message: 'Unable to complete this request. Try again.',
    },
    500,
  );
}
