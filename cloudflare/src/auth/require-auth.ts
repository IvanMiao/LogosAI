import type { Context, Next } from 'hono';
import type { CloudflareApp } from '../env';
import { createAuth } from './auth';

export async function requireAuthenticatedUser(
  context: Context<CloudflareApp>,
  next: Next,
): Promise<Response | void> {
  const auth = createAuth(context.env);
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  if (!session) {
    return context.json(
      { code: 'AUTH_REQUIRED', message: 'Sign in to continue.' },
      401,
    );
  }

  context.set('user', {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  });
  await next();
}
