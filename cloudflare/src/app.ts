import { Hono } from 'hono';
import { accountRoutes } from './account/account-routes';
import { createAuth } from './auth/auth';
import { requireAuthenticatedUser } from './auth/require-auth';
import type { CloudflareApp } from './env';
import { proxyAiRequest } from './gateway/ai-gateway';
import { serveStaticAssets } from './gateway/static-assets';
import { handleApiError } from './http/error-response';
import { readingRoutes } from './reading/reading-routes';
import { workspaceRoutes } from './workspace/workspace-routes';

export function createApp(): Hono<CloudflareApp> {
  const app = new Hono<CloudflareApp>();

  app.get('/api/public/auth-config', (context) => context.json({
    emailPassword: true,
    google: Boolean(
      context.env.GOOGLE_CLIENT_ID && context.env.GOOGLE_CLIENT_SECRET,
    ),
    github: Boolean(
      context.env.GITHUB_CLIENT_ID && context.env.GITHUB_CLIENT_SECRET,
    ),
  }));

  app.all('/api/auth/*', (context) => (
    createAuth(context.env).handler(context.req.raw)
  ));

  app.use('/api/account/*', requireAuthenticatedUser);
  app.use('/api/workspace/*', requireAuthenticatedUser);
  app.use('/api/reading-sessions/*', requireAuthenticatedUser);
  app.route('/api/account', accountRoutes);
  app.route('/api/workspace', workspaceRoutes);
  app.route('/api/reading-sessions', readingRoutes);

  app.all('/api/analyze', requireAuthenticatedUser, proxyAiRequest);
  app.all('/api/analyze/stream', requireAuthenticatedUser, proxyAiRequest);
  app.all('/api/anchors/explain', requireAuthenticatedUser, proxyAiRequest);
  app.all('/api/anchors/run', requireAuthenticatedUser, proxyAiRequest);

  app.notFound((context) => {
    if (context.req.path.startsWith('/api/')) {
      return context.json(
        { code: 'NOT_FOUND', message: 'API route not found.' },
        404,
      );
    }
    return serveStaticAssets(context);
  });
  app.onError(handleApiError);
  return app;
}
