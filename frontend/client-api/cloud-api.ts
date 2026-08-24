import { readApiErrorMessage, RemoteApiError } from './api-error';

async function getErrorMessage(response: Response): Promise<string> {
  return readApiErrorMessage(
    response,
    `Request failed with status ${response.status}.`,
  );
}

export async function requestCloudJson<ResponseBody>(
  path: string,
  init?: RequestInit,
): Promise<ResponseBody> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body) headers.set('Content-Type', 'application/json');

  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers,
  });
  if (!response.ok) {
    throw new RemoteApiError(await getErrorMessage(response));
  }
  return response.json() as Promise<ResponseBody>;
}

export async function requestCloudEmpty(
  path: string,
  init: RequestInit,
): Promise<void> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
  });
  if (!response.ok) {
    throw new RemoteApiError(await getErrorMessage(response));
  }
}
