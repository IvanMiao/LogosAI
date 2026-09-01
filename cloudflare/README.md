# LogosAI Cloudflare Gateway

This Worker is the canonical browser origin for LogosAI. It serves the React
SPA from Worker Assets, authenticates the reader, stores user-owned data in D1,
decrypts that reader's Gemini key only for an AI request, and forwards that
request to FastAPI on Fly.io.

## File map

| Path | Responsibility | Talks to |
| --- | --- | --- |
| `src/app.ts` | Route table and public/protected boundary. | Every route module. |
| `src/auth/` | Better Auth configuration and session middleware. | D1 core auth tables. |
| `src/account/` | Model choice and encrypted Gemini key settings. | `security/`, `user_settings`. |
| `src/workspace/` | Reader preferences and aggregate workspace reads. | `reading/`, `workspace_preferences`. |
| `src/reading/` | Validate and replace one complete reading-session aggregate. | Session, anchor, and artifact tables. |
| `src/gateway/` | Allowlisted AI proxy and SPA asset fallback. | FastAPI and Worker Assets. |
| `src/security/` | AES-GCM encryption bound to the owning user ID. | Web Crypto API. |
| `src/http/` | Stable JSON errors. | Hono error handler. |
| `migrations/` | Better Auth and application D1 schema. | Wrangler migrations. |

The route table is intentionally centralized in `src/app.ts`. A new API is not
public or authenticated by accident: its middleware and destination are visible
in one place.

## Local setup

```bash
cd cloudflare
npm ci
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Replace these values in the ignored `.dev.vars` before starting:

- `BETTER_AUTH_SECRET`: a random value with at least 32 bytes;
- `CREDENTIALS_ENCRYPTION_KEY`: exactly 32 random bytes, base64 encoded;
- `GATEWAY_SHARED_SECRET`: the same random value used by local FastAPI as
  `LOGOSAI_GATEWAY_SECRET`.

Google and GitHub variables may remain empty locally. The login page asks
`/api/public/auth-config` which providers are configured and hides unavailable
buttons.

## Production resources

- Worker: `logosai-cloud`
- Canonical URL: `https://logosai.ymiao.dev`
- The `workers.dev` route is disabled in `wrangler.jsonc`.
- D1 database: `logosai-users`
- D1 ID: `b5d33fc3-5c6c-4646-a27f-5fe826eab5fd`
- D1 jurisdiction: EU (EEUR)

`npm run deploy` builds `../frontend` and deploys that `dist/` directory as
Worker Assets together with the API Worker. Apply committed migrations before a
schema-dependent deployment:

```bash
npm run db:migrate:remote
npm run check
npm run deploy
```

Write secrets through Wrangler; never add their values to `wrangler.jsonc`:

```bash
openssl rand -base64 48 | npx wrangler secret put BETTER_AUTH_SECRET
openssl rand -base64 32 | npx wrangler secret put CREDENTIALS_ENCRYPTION_KEY
npx wrangler secret put GATEWAY_SHARED_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

`GATEWAY_SHARED_SECRET` and Fly's `LOGOSAI_GATEWAY_SECRET` must contain the same
value. Setting the Fly secret makes direct requests to the public FastAPI
hostname fail before the Gemini key is processed.

## Error and performance monitoring

Worker monitoring is optional. Set `SENTRY_DSN` as a Wrangler secret to report
unexpected Worker, Hono, D1, and AI gateway failures, plus sampled request traces.
`SENTRY_ENVIRONMENT` defaults to `production`, and `SENTRY_RELEASE` should match
the deployed release when it is available.

```bash
npx wrangler secret put SENTRY_DSN
npx wrangler secret put SENTRY_ENVIRONMENT
npx wrangler secret put SENTRY_RELEASE
npx wrangler secret put SENTRY_TRACES_SAMPLE_RATE
```

Source text, notes, credentials, request bodies, cookies, query strings, database
parameters, stack-frame variables, and user identity are removed before Worker
events are sent to Sentry. Production traces are sampled at 10%; set
`SENTRY_TRACES_SAMPLE_RATE` from `0` to `1` to tune the rate (for example `0.25`
for 25%). Development defaults to 100%. Breadcrumbs stay disabled.

## OAuth applications

Create one web OAuth application in each provider and use these exact callback
URLs:

- Google: `https://logosai.ymiao.dev/api/auth/callback/google`
- GitHub: `https://logosai.ymiao.dev/api/auth/callback/github`

Use `https://logosai.ymiao.dev` as the application/homepage URL. Do not use the
old `workers.dev` callback URLs because that route is disabled. After writing
both values for a provider, redeploy the Worker and verify its button appears
on `/login`.

## Data and credential rules

- D1 is the durable source of truth; browser storage is a user-scoped working
  cache and offline fallback.
- A user-scoped sync journal records dirty sessions and deletion tombstones
  before the debounce window, so a quick reload cannot resurrect cloud data
  that the reader just changed or deleted locally.
- A reading session owns one source document, its source anchors, and all notes
  and AI entries attached to those anchors.
- The Gemini key is AES-GCM encrypted with a random IV and user-ID associated
  data. APIs return only a final-four-character hint.
- OAuth tokens use Better Auth's token encryption.
- Only four existing AI paths may reach FastAPI. Cookies, browser authorization
  headers, and origins are stripped before forwarding.
- A persisted `running` artifact is read back as `stopped`; a browser reload
  never claims that an abandoned stream is still running.

## Verification

```bash
npm run typecheck
npm test
```

For a local end-to-end smoke test, register through the UI, save an API key,
create a reading session, reload, and confirm the session and its entries return.
The account settings response must contain `hasApiKey` and `apiKeyHint`, never
the plaintext key.
