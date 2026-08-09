import { RemoteApiError } from './apiError';

export interface AuthProviderConfig {
  emailPassword: boolean;
  google: boolean;
  github: boolean;
}

export async function getAuthProviderConfig(): Promise<AuthProviderConfig> {
  const response = await fetch('/api/public/auth-config', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new RemoteApiError('Unable to load sign-in options.');
  }
  return response.json() as Promise<AuthProviderConfig>;
}
