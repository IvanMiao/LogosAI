import { describe, expect, it } from 'vitest';
import {
  createSentryOptions,
  scrubWorkerErrorEvent,
} from '../src/monitoring/sentry';
import type { CloudflareBindings } from '../src/env';

function createBindings(
  overrides: Partial<CloudflareBindings> = {},
): CloudflareBindings {
  return {
    LOGOSAI_DB: {} as D1Database,
    ASSETS: {} as Fetcher,
    FASTAPI_ORIGIN: 'https://api.example.test',
    BETTER_AUTH_URL: 'https://logosai.example.test',
    BETTER_AUTH_SECRET: 'auth-secret',
    CREDENTIALS_ENCRYPTION_KEY: 'credential-secret',
    TRUSTED_ORIGINS: 'https://logosai.example.test',
    ...overrides,
  };
}

describe('Worker Sentry monitoring', () => {
  it('stays disabled without a DSN', () => {
    expect(createSentryOptions(createBindings())).toBeUndefined();
  });

  it('uses private, errors-only defaults', () => {
    expect(createSentryOptions(createBindings({
      SENTRY_DSN: 'https://public@example.invalid/1',
      SENTRY_ENVIRONMENT: 'staging',
      SENTRY_RELEASE: 'logosai@1.2.3',
    }))).toMatchObject({
      dsn: 'https://public@example.invalid/1',
      environment: 'staging',
      release: 'logosai@1.2.3',
      sendDefaultPii: false,
      tracesSampleRate: 0,
      maxBreadcrumbs: 0,
    });
  });

  it('removes request content, identity, and sensitive fields', () => {
    const event = scrubWorkerErrorEvent({
      type: undefined,
      user: { id: 'reader-1' },
      request: {
        cookies: { session: 'secret' },
        data: { text: 'private source' },
        query_string: 'document=private',
        headers: { 'X-Gemini-Key': 'gemini-secret' },
      },
      extra: {
        prompt: 'private prompt',
        nested: { api_key: 'nested-secret' },
      },
    });

    expect(event.user).toBeUndefined();
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.data).toBeUndefined();
    expect(event.request?.query_string).toBeUndefined();
    expect(event.request?.headers).toMatchObject({
      'X-Gemini-Key': '[Filtered]',
    });
    expect(event.extra).toMatchObject({
      prompt: '[Filtered]',
      nested: { api_key: '[Filtered]' },
    });
  });
});
