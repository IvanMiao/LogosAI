import * as Sentry from '@sentry/react';
import type { ErrorEvent } from '@sentry/react';

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

let monitoringInitialized = false;

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
        ? '[Filtered]'
        : scrubValue(nestedValue),
    ]),
  );
}

export function scrubErrorEvent(event: ErrorEvent): ErrorEvent {
  const scrubbedEvent = scrubValue(event) as ErrorEvent;
  delete scrubbedEvent.user;

  if (scrubbedEvent.request) {
    delete scrubbedEvent.request.cookies;
    delete scrubbedEvent.request.data;
    delete scrubbedEvent.request.query_string;
  }

  return scrubbedEvent;
}

export function initializeErrorMonitoring(): boolean {
  if (monitoringInitialized) {
    return true;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) {
    return false;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    beforeSend: scrubErrorEvent,
    integrations: (defaultIntegrations) => defaultIntegrations.filter(
      (integration) => integration.name !== 'BrowserSession',
    ),
  });
  monitoringInitialized = true;
  return true;
}

export function reportUnexpectedError(
  error: unknown,
  tags: Record<string, string>,
): void {
  if (!monitoringInitialized) {
    return;
  }

  Sentry.withScope((scope) => {
    Object.entries(tags).forEach(([key, value]) => scope.setTag(key, value));
    Sentry.captureException(error);
  });
}

initializeErrorMonitoring();
