import type { Context } from 'hono';
import type { CloudflareApp } from '../env';
import { ApiError } from '../http/api-error';

function createOriginHeaders(request: Request): Headers {
  const headers = new Headers(request.headers);
  headers.delete('authorization');
  headers.delete('cookie');
  headers.delete('host');
  return headers;
}

export async function proxyAppOrigin(
  context: Context<CloudflareApp>,
): Promise<Response> {
  if (context.req.method !== 'GET' && context.req.method !== 'HEAD') {
    throw new ApiError(404, 'NOT_FOUND', 'Route not found.');
  }

  const requestUrl = new URL(context.req.url);
  const targetUrl = new URL(
    `${requestUrl.pathname}${requestUrl.search}`,
    context.env.APP_ORIGIN,
  );

  try {
    return await fetch(targetUrl, {
      method: context.req.method,
      headers: createOriginHeaders(context.req.raw),
      redirect: 'manual',
    });
  } catch {
    throw new ApiError(
      502,
      'APP_ORIGIN_UNAVAILABLE',
      'LogosAI is temporarily unavailable. Try again in a moment.',
    );
  }
}
