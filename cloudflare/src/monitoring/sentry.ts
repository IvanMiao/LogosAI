import * as Sentry from '@sentry/cloudflare';
import type { CloudflareBindings } from '../env';

const FILTERED = '[Filtered]';
const DEFAULT_PRODUCTION_TRACE_RATE = 0.1;
const DEVELOPMENT_TRACE_RATE = 1;
const SENSITIVE_FIELD_NAMES = new Set([
  'api-key',
  'apikey',
  'authorization',
  'cookie',
  'document',
  'gemini-key',
  'note',
  'prompt',
  'quote',
  'set-cookie',
  'text',
  'x-gemini-key',
]);

function normalizeFieldName(fieldName: string): string {
  return fieldName.toLowerCase().replace(/_/g, '-');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      SENSITIVE_FIELD_NAMES.has(normalizeFieldName(key))
        ? FILTERED
        : scrubValue(nestedValue),
    ]),
  );
}

function resolveTraceSampleRate(env: CloudflareBindings): number {
  const configuredRate = Number(env.SENTRY_TRACES_SAMPLE_RATE);
  if (Number.isFinite(configuredRate) && configuredRate >= 0 && configuredRate <= 1) {
    return configuredRate;
  }

  return env.SENTRY_ENVIRONMENT === 'development'
    ? DEVELOPMENT_TRACE_RATE
    : DEFAULT_PRODUCTION_TRACE_RATE;
}

export function scrubWorkerEvent<T extends Sentry.Event>(event: T): T {
  const scrubbedEvent = scrubValue(event) as T;
  delete scrubbedEvent.user;

  if (scrubbedEvent.request) {
    delete scrubbedEvent.request.cookies;
    delete scrubbedEvent.request.data;
    delete scrubbedEvent.request.query_string;
  }

  return scrubbedEvent;
}

export function scrubWorkerErrorEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  return scrubWorkerEvent(event);
}

export function createSentryOptions(
  env: CloudflareBindings,
): Sentry.CloudflareOptions | undefined {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) {
    return undefined;
  }

  return {
    dsn,
    environment: env.SENTRY_ENVIRONMENT || 'production',
    release: env.SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    },
    tracesSampleRate: resolveTraceSampleRate(env),
    maxBreadcrumbs: 0,
    beforeSend: scrubWorkerErrorEvent,
    beforeSendTransaction: scrubWorkerEvent,
  };
}
