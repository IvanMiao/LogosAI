import { reportUnexpectedError } from '@/monitoring/sentry';

export class RemoteApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RemoteApiError';
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function reportUnexpectedApiError(
  error: unknown,
  operation: string,
): void {
  if (error instanceof RemoteApiError || isAbortError(error)) {
    return;
  }

  reportUnexpectedError(error, { operation });
}
