import { reportUnexpectedError } from '@/monitoring/sentry';

export class RemoteApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RemoteApiError';
  }
}

interface ApiErrorBody {
  detail?: unknown;
  message?: unknown;
}

function getBodyErrorMessage(body: ApiErrorBody): string | null {
  if (typeof body.message === 'string' && body.message) {
    return body.message;
  }
  if (typeof body.detail === 'string' && body.detail) {
    return body.detail;
  }
  return null;
}

export async function readApiErrorMessage(
  response: Response,
  fallback = `HTTP Error! Status: ${response.status}`,
): Promise<string> {
  try {
    const body = await response.json() as ApiErrorBody;
    return getBodyErrorMessage(body) ?? fallback;
  } catch {
    return fallback;
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
