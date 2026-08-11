import { describe, expect, it } from 'vitest';
import {
  createSentryOptions,
  scrubWorkerErrorEvent,
  scrubWorkerEvent,
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

  it('uses private defaults with sampled production tracing', () => {
    expect(createSentryOptions(createBindings({
      SENTRY_DSN: 'https://public@example.invalid/1',
      SENTRY_ENVIRONMENT: 'staging',
      SENTRY_RELEASE: 'logosai@1.2.3',
    }))).toMatchObject({
      dsn: 'https://public@example.invalid/1',
      environment: 'staging',
      release: 'logosai@1.2.3',
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
      maxBreadcrumbs: 0,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpBodies: [],
        urlQueryParams: false,
        databaseQueryData: false,
      },
    });
  });

  it('accepts a bounded tracing sample rate and defaults to full development tracing', () => {
    expect(createSentryOptions(createBindings({
      SENTRY_DSN: 'https://public@example.invalid/1',
      SENTRY_ENVIRONMENT: 'development',
    }))?.tracesSampleRate).toBe(1);

    expect(createSentryOptions(createBindings({
      SENTRY_DSN: 'https://public@example.invalid/1',
      SENTRY_TRACES_SAMPLE_RATE: '0.25',
    }))?.tracesSampleRate).toBe(0.25);
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

  it('removes sensitive transaction fields before they are sent', () => {
    const event = scrubWorkerEvent({
      type: 'transaction',
      transaction: '/api/analyze',
      contexts: { trace: { trace_id: 'trace-id', span_id: 'span-id' } },
      extra: { document: 'private source' },
    });

    expect(event.extra).toMatchObject({ document: '[Filtered]' });
  });
});
