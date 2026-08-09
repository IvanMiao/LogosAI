export interface CloudflareBindings {
  LOGOSAI_DB: D1Database;
  APP_ORIGIN: string;
  FASTAPI_ORIGIN: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CREDENTIALS_ENCRYPTION_KEY: string;
  TRUSTED_ORIGINS: string;
  GATEWAY_SHARED_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

export interface CloudflareVariables {
  user: AuthenticatedUser;
}

export type CloudflareApp = {
  Bindings: CloudflareBindings;
  Variables: CloudflareVariables;
};

export function splitTrustedOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
