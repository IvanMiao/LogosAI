import * as Sentry from '@sentry/cloudflare';
import type { CloudflareBindings } from '../env';

const FILTERED = '[Filtered]';
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

export function scrubWorkerErrorEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  const scrubbedEvent = scrubValue(event) as Sentry.ErrorEvent;
  delete scrubbedEvent.user;

  if (scrubbedEvent.request) {
    delete scrubbedEvent.request.cookies;
    delete scrubbedEvent.request.data;
    delete scrubbedEvent.request.query_string;
  }

  return scrubbedEvent;
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
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    beforeSend: scrubWorkerErrorEvent,
  };
}
