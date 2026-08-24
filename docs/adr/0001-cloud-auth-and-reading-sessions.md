# ADR 0001: Cloudflare auth and durable reading sessions

- 状态：Accepted
- 日期：2026-08-09
- 决策者：Product owner + engineering

## Context

The existing browser-only workspace could preserve reading work on one device,
but it had no account boundary, cross-device continuation, or safe way to keep a
per-user Gemini key. The product owner explicitly requested account login via
email/password, Google, or GitHub; Cloudflare-hosted user data; convenient
reading-session management; and very clear code ownership.

The existing FastAPI analysis service is working and should not be
rewritten merely to add identity and storage.

## Decision

Use a Cloudflare Worker as the canonical application and API origin:

```text
Browser
  │ same-origin cookies and /api requests
  ▼
Cloudflare Worker (Hono)
  ├── Worker Assets ────────────► React SPA and hashed static files
  ├── Better Auth ───────────────► D1 auth tables
  ├── account/workspace/reading ─► D1 application tables
  ├── allowlisted AI gateway ────► FastAPI on Fly.io ─► Gemini
```

### Identity

Better Auth owns users, accounts, sessions, verification records, password
hashes, and Google/GitHub OAuth. Email/password registration is always enabled;
each social provider is enabled only when both of its production credentials
exist. Session cookies are HTTP-only and secure in production.

### User credentials

The Worker encrypts each Gemini key using AES-256-GCM with a unique 96-bit IV.
The user ID is authenticated associated data, so a ciphertext copied to another
account cannot be decrypted there. D1 stores ciphertext, IV, and a display-only
last-four hint. The plaintext exists only while forwarding an authenticated AI
request and is never returned to the browser.

FastAPI accepts `X-Gemini-Key` from the Worker. When
`LOGOSAI_GATEWAY_SECRET` is configured, every `/api` route also requires the
shared `X-LogosAI-Gateway` header. This retains a simple local-development path
while closing the direct Fly API path in production.

### Reading data

`reading_session` is the durable aggregate root. It owns:

- the imported source text and user-visible title;
- document, paragraph, and selection anchors;
- notes, explanations, translations, vocabulary entries, and close reads;
- active source identity and a server revision.

The API validates and replaces one full aggregate in a D1 batch. Ownership is
checked before every write or delete. Workspace preferences are stored
separately per user.

The frontend keeps the established `WorkspaceDocument`, `TextAnchor`, and
`Artifact` domain types to avoid a broad refactor. `ReadingSessionSnapshot` is
the explicit cloud boundary that groups them. Browser storage remains a
user-scoped immediate cache. After login the client merges the initial cloud
snapshot, then debounces changed session aggregates back to D1. Failed sync is
visible and retryable; local work remains available. A small per-user sync
journal persists dirty session IDs and deletion tombstones immediately, so a
reload during the debounce window prefers unsynced local intent instead of
resurrecting older cloud state.

## Consequences

Positive:

- Auth and user data have one same-origin security boundary.
- Static React assets are globally cached and deploy with the Worker, rather
  than taking an extra request through Fly.io.
- The AI service remains focused on model orchestration.
- Each directory has one reason to change and route ownership is inspectable
  from `cloudflare/src/app.ts`.
- An unavailable Cloudflare sync does not immediately destroy in-browser work.
- OAuth providers can be added operationally without changing the UI contract.

Costs and limits:

- Production must use the Worker URL or a future Worker custom domain; Fly only
  exposes the protected AI origin and is not a browser entry point.
- The current sync is aggregate replacement with debounced, last-writer-wins
  behavior. Revision-aware conflict UI is deferred until concurrent editing is
  observed.
- Source text and notes rely on Cloudflare's platform encryption at rest; only
  the Gemini credential has additional application-level encryption. This is
  not end-to-end encryption.
- Google and GitHub require externally created OAuth applications and cannot be
  made operational from repository code alone.

## Rejected alternatives

- **Direct D1 REST calls from FastAPI:** D1's REST API is an administrative
  control-plane interface and would put Cloudflare credentials on Fly. A Worker
  binding is the intended application data path.
- **Move model orchestration into the Worker:** this would duplicate the tested
  FastAPI workflow and mix identity, persistence, and AI execution.
- **Keep API keys only in localStorage:** this prevents safe cross-device use and
  exposes long-lived credentials to any successful browser script injection.
- **Adopt a separate hosted auth vendor:** unnecessary while Better Auth supports
  D1 and the requested email/social flows in the same Worker boundary.

## Operational checks

The production path is ready only when:

1. remote D1 migrations are applied;
2. Better Auth, credential-encryption, and gateway secrets are set by CLI;
3. the same gateway secret is set on Fly;
4. OAuth callbacks use the canonical Worker origin;
5. the React build is attached as Worker Assets during Worker deployment;
6. Worker, frontend, and backend checks pass;
7. email registration, login, key settings, session reload, and sign-out are
   smoke-tested against the deployed Worker.
