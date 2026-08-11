import { createAuthForDatabase } from './auth';

const schemaDatabase = {
  prepare: () => ({
    bind() {
      return this;
    },
    async all() {
      return { results: [], meta: { changes: 0 } };
    },
  }),
  async batch() {
    return [];
  },
  async exec() {
    return { count: 0, duration: 0 };
  },
} as unknown as D1Database;

export const auth = createAuthForDatabase(schemaDatabase, {
  FASTAPI_ORIGIN: 'https://logosai.example',
  BETTER_AUTH_URL: 'https://logosai.example',
  BETTER_AUTH_SECRET: 'schema-generation-only-secret-value',
  CREDENTIALS_ENCRYPTION_KEY: 'schema-generation-only',
  TRUSTED_ORIGINS: 'https://logosai.example',
});
