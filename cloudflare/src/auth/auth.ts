import { betterAuth } from 'better-auth';
import type { CloudflareBindings } from '../env';
import { splitTrustedOrigins } from '../env';

type AuthEnvironment = Omit<CloudflareBindings, 'LOGOSAI_DB'>;

interface GitHubProfile {
  id?: string | number;
  email?: string | null;
}

/**
 * Better Auth requires every user to have an email address. GitHub can omit
 * it even after `user:email` is requested, so retain its stable account ID in
 * a reserved, non-deliverable address instead of rejecting the reader.
 */
export function mapGitHubProfileToUser(profile: GitHubProfile): { email: string } {
  const email = profile.email?.trim();
  if (email) return { email };

  if (profile.id === undefined || profile.id === null || profile.id === '') {
    throw new Error('GitHub did not provide a stable account ID.');
  }

  return { email: `github-${profile.id}@github.oauth.invalid` };
}

export function getSocialProviders(env: AuthEnvironment) {
  return {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            mapProfileToUser: mapGitHubProfileToUser,
          },
        }
      : {}),
  };
}

export function createAuthForDatabase(
  database: D1Database,
  env: AuthEnvironment,
) {
  return betterAuth({
    appName: 'LogosAI',
    basePath: '/api/auth',
    baseURL: env.BETTER_AUTH_URL,
    database,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: splitTrustedOrigins(env.TRUSTED_ORIGINS),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    socialProviders: getSocialProviders(env),
    account: {
      encryptOAuthTokens: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    advanced: {
      database: {
        generateId: 'uuid',
      },
      useSecureCookies: env.BETTER_AUTH_URL.startsWith('https://'),
    },
  });
}

export function createAuth(env: CloudflareBindings) {
  return createAuthForDatabase(env.LOGOSAI_DB, env);
}

export type LogosAuth = ReturnType<typeof createAuth>;
