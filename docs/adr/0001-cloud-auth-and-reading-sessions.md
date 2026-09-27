# ADR 0001: Cloudflare auth and durable reading sessions

- 状态：Accepted
- 日期：2026-08-09
- 决策者：Product owner + engineering
- 文档核对：2026-09-19；保留原决策，标明后续并发保护演进

## Context

The existing browser-only workspace could preserve reading work on one device,
but it had no account boundary, cross-device continuation, or safe way to keep a
per-user Gemini key. The product owner explicitly requested account login via
email/password, Google, or GitHub; Cloudflare-hosted user data; convenient
reading-session management; and very clear code ownership.

The existing FastAPI analysis service was working and should not be
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
each social provider is enabled only when both of its configured credentials
exist. Session cookies are HTTP-only and secure in production.

### User credentials

The Worker encrypts each Gemini key using AES-256-GCM with a random 96-bit IV.
The user ID is authenticated associated data, so a ciphertext copied to another
account cannot be decrypted there. D1 stores ciphertext, IV, and a display-only
last-four hint. The Worker receives plaintext when the user saves the key and
decrypts it for AI requests. Neither the Worker nor FastAPI persists plaintext;
settings reads return only key presence and the hint.

FastAPI accepts `X-Gemini-Key` from the Worker. When
`LOGOSAI_GATEWAY_SECRET` is configured, every `/api` route also requires the
shared `X-LogosAI-Gateway` header. Production must set matching values for FastAPI's
`LOGOSAI_GATEWAY_SECRET` and the Worker's `GATEWAY_SHARED_SECRET`.
If the FastAPI secret is absent, it skips the check regardless of environment;
the code does not automatically enforce the production configuration.

### Reading data

`reading_session` is the durable aggregate root. It owns:

- the imported source text and user-visible title;
- document, paragraph, and selection anchors;
- notes, explanations, translations, vocabulary entries, and close reads;
- active anchor identity and a server revision.

The API validates and replaces one full aggregate in a D1 batch. Ownership is
checked before every write or delete. Workspace preferences are stored
separately per user.

`ReadingSessionSnapshot` groups the existing document, anchor, and artifact
types at the cloud boundary. The browser merges cloud data with a user-scoped
cache and debounces aggregate writes. A local sync journal records dirty IDs
and deletion tombstones before the debounce window; failed sync is visible and
retryable. This journal preserves local intent across reloads, not cross-device
conflict resolution. Reading view snapshots remain device-local; see the
[journey contract](../ux/workspace-journey-contract.md).

## Consequences

Positive:

- Auth and user data have one same-origin security boundary.
- Static React assets are globally cached and deploy with the Worker, rather
  than taking an extra request through Fly.io.
- The AI service remains focused on model orchestration.
- Route ownership is explicit in `cloudflare/src/app.ts`.
- An unavailable Cloudflare sync does not immediately destroy in-browser work.
- OAuth providers can be added operationally without changing the UI contract.

Costs and limits:

- The configured browser origin is `https://logosai.ymiao.dev`; `workers.dev`
  is disabled. Fly is the AI origin and requires the gateway configuration above.
- The initial aggregate sync used last-writer-wins writes without revision
  checks, allowing stale clients to overwrite work. PRs #49/#50 subsequently
  added conditional writes and conflict copies. The browser now merges independent
  content edits against a saved baseline and asks for a decision on overlapping
  edits; D1 writes still replace the aggregate conditionally. The current protocol
  and recorded acceptance are maintained in [Project Reference](../project.md#云写入版本前提).
- Source text and notes rely on Cloudflare's platform encryption at rest; only
  the Gemini credential has additional application-level encryption. This is
  not end-to-end encryption.
- Google and GitHub require externally created OAuth applications and cannot be
  made operational from repository code alone.

## Rejected alternatives

- **Direct D1 REST calls from FastAPI:** this would require Cloudflare API
  credentials on Fly and split data access across services. The Worker binding
  keeps application data access inside the chosen auth boundary.
- **Move model orchestration into the Worker:** this would duplicate the tested
  FastAPI workflow and mix identity, persistence, and AI execution.
- **Keep API keys only in localStorage:** this prevents safe cross-device use and
  exposes long-lived credentials to any successful browser script injection.
- **Adopt a separate hosted auth vendor:** unnecessary while Better Auth supports
  D1 and the requested email/social flows in the same Worker boundary.

## Operational checks

Deployment prerequisites and commands are maintained in
[Cloudflare Operations](../../cloudflare/README.md); verification commands are in
[README](../../README.md#verify-changes). Production readiness also requires a
recorded smoke test of registration/login, enabled OAuth providers, key settings,
session reload, and sign-out against the deployed origin. This ADR records the
architecture decision, not completion of those checks.
