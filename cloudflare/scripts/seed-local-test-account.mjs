import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ACCOUNT_URL = new URL('../fixtures/local-test-account.json', import.meta.url);
const WORKSPACE_URL = new URL('../fixtures/local-test-workspace.json', import.meta.url);
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

export function assertLoopbackBaseUrl(value) {
  const url = new URL(value);
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(`Refusing to seed a non-local origin: ${url.origin}`);
  }
  return url.origin;
}

export function createAuthRequestHeaders(origin) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Origin: assertLoopbackBaseUrl(origin),
  };
}

export function prepareWorkspaceFixture(fixture) {
  const document = fixture.session.document;
  return {
    ...fixture,
    session: {
      ...fixture.session,
      anchors: fixture.session.anchors.map((anchor) => anchor.scope === 'document'
        ? {
            ...anchor,
            quote: document.text,
            normalizedQuote: document.text.toLowerCase(),
            startOffset: 0,
            endOffset: document.text.length,
          }
        : anchor),
    },
  };
}

function getArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function readJson(url) {
  return JSON.parse(await readFile(fileURLToPath(url), 'utf8'));
}

async function getResponseMessage(response) {
  const body = await response.text();
  if (!body) return `${response.status} ${response.statusText}`;
  try {
    const parsed = JSON.parse(body);
    return parsed.message ?? parsed.error?.message ?? body;
  } catch {
    return body;
  }
}

function getCookieHeader(response) {
  const setCookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  return setCookies.map((value) => value.split(';', 1)[0]).join('; ');
}

async function requestJson(fetchImpl, url, init = {}) {
  const response = await fetchImpl(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`${url}: ${await getResponseMessage(response)}`);
  }
  return response;
}

async function waitForWorker(fetchImpl, baseUrl) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetchImpl(`${baseUrl}/api/public/auth-config`);
      if (response.ok) return;
    } catch {
      // The local worker is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Local Worker did not become ready at ${baseUrl}.`);
}

async function signIn(fetchImpl, baseUrl, origin, account) {
  return fetchImpl(`${baseUrl}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: createAuthRequestHeaders(origin),
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
}

async function createSession(fetchImpl, baseUrl, origin, account) {
  let response = await signIn(fetchImpl, baseUrl, origin, account);
  if (!response.ok) {
    response = await fetchImpl(`${baseUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: createAuthRequestHeaders(origin),
      body: JSON.stringify(account),
    });
  }
  if (!response.ok) {
    throw new Error(`Unable to prepare local test account: ${await getResponseMessage(response)}`);
  }
  const cookie = getCookieHeader(response);
  if (!cookie) throw new Error('Local test login did not return a session cookie.');
  return cookie;
}

async function resetWorkspace(fetchImpl, baseUrl, cookie, fixture) {
  const workspaceResponse = await requestJson(fetchImpl, `${baseUrl}/api/workspace`, {
    headers: { Cookie: cookie },
  });
  const workspace = await workspaceResponse.json();
  await Promise.all(workspace.sessions.map(({ document }) => requestJson(
    fetchImpl,
    `${baseUrl}/api/reading-sessions/${encodeURIComponent(document.id)}`,
    { method: 'DELETE', headers: { Cookie: cookie } },
  )));
  await requestJson(
    fetchImpl,
    `${baseUrl}/api/reading-sessions/${encodeURIComponent(fixture.session.document.id)}`,
    {
      method: 'PUT',
      headers: { Cookie: cookie },
      body: JSON.stringify(fixture.session),
    },
  );
  await requestJson(fetchImpl, `${baseUrl}/api/workspace/preferences`, {
    method: 'PUT',
    headers: { Cookie: cookie },
    body: JSON.stringify(fixture.preferences),
  });
}

export async function seedLocalTestAccount({
  baseUrl,
  origin,
  fetchImpl = fetch,
} = {}) {
  const safeBaseUrl = assertLoopbackBaseUrl(
    baseUrl ?? getArgument('--base-url') ?? 'http://127.0.0.1:8787',
  );
  const [account, rawFixture] = await Promise.all([
    readJson(ACCOUNT_URL),
    readJson(WORKSPACE_URL),
  ]);
  const fixture = prepareWorkspaceFixture(rawFixture);
  const safeOrigin = assertLoopbackBaseUrl(
    origin ?? getArgument('--origin') ?? 'http://localhost:5173',
  );
  await waitForWorker(fetchImpl, safeBaseUrl);
  const cookie = await createSession(fetchImpl, safeBaseUrl, safeOrigin, account);
  await resetWorkspace(fetchImpl, safeBaseUrl, cookie, fixture);
  return { account, sessionId: fixture.session.document.id };
}

async function main() {
  const result = await seedLocalTestAccount();
  console.log(`Local test account ready: ${result.account.email}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
