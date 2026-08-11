import type { Context } from 'hono';
import type { CloudflareApp } from '../env';
import { ApiError } from '../http/api-error';

function hasFileExtension(pathname: string): boolean {
  const finalSegment = pathname.split('/').at(-1) ?? '';
  return finalSegment.includes('.');
}

/**
 * Serve the React SPA from the Worker Assets binding.
 *
 * Actual files are served by Cloudflare before the Worker runs. This fallback
 * handles SPA routes such as `/login`, while missing asset-like paths stay 404.
 */
export function serveStaticAssets(context: Context<CloudflareApp>): Promise<Response> {
  if (context.req.method !== 'GET' && context.req.method !== 'HEAD') {
    throw new ApiError(404, 'NOT_FOUND', 'Route not found.');
  }

  if (hasFileExtension(context.req.path)) {
    throw new ApiError(404, 'NOT_FOUND', 'Route not found.');
  }

  return context.env.ASSETS.fetch(context.req.raw);
}
