<div align="center">
  <img src="./docs/logo.png" alt="LogosAI Logo" width="280" />
</div>

# LogosAI

LogosAI is a source-grounded AI reading workspace for difficult texts. Readers
can import a text, ask for help on a selected passage, run a close reading, and
keep notes and AI outputs attached to their source context.

The current Workspace Alpha supports:

- pasted text and local `.txt` / `.md` files;
- a reader with persistent typography preferences;
- selection-level Explain, Translate, Vocab, and Note actions;
- document- and paragraph-level Close Read;
- email/password accounts, with Google and GitHub OAuth when configured;
- Cloudflare D1 reading sessions that keep source text, selections, notes, and
  AI reading entries together;
- per-user Gemini BYOK encrypted by the Cloudflare Worker before D1 storage;
- a user-scoped local cache for immediate restoration and offline-safe edits.

The Cloudflare Worker is the public application and API origin. It owns auth,
user data, and credentials, then forwards authenticated AI requests to the
FastAPI service on Fly.io. FastAPI never stores the Gemini key.

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Radix UI
- Backend: Python 3.13, FastAPI, Pydantic, LangChain
- Cloud: Cloudflare Workers, D1, Hono, Better Auth
- Models: Gemini 2.5 Flash or Pro; Flash Lite for detection and correction
- Delivery: React static assets, auth, and D1 on Cloudflare Workers; FastAPI on Fly.io

## Local Development

The quickest path requires only Docker with Compose:

```bash
make up
```

Open `http://localhost:5173`. This builds and starts the complete local stack:

- the React production bundle, served by a local Cloudflare Worker;
- Better Auth, the local D1 database, and Workspace APIs;
- the FastAPI AI service, reachable internally through the Worker.

`make up` waits until both services are healthy. D1 data survives restarts in a
Docker volume. Use `make logs` to follow output and `make down` to stop the
stack. The checked-in defaults are deliberately local-only; never reuse them
for a deployed environment.

For development with hot reload, use the three-process workflow below.
Prerequisites are Node.js 20+, Python 3.13, [`uv`](https://docs.astral.sh/uv/),
`npm`, and a logged-in Wrangler CLI.

Start the backend:

```bash
cd backend
uv sync
uv run uvicorn app:app --reload
```

Prepare and start the Cloudflare gateway in a second terminal:

```bash
cd cloudflare
npm ci
cp .dev.vars.example .dev.vars
# Replace the three local secret placeholders in .dev.vars.
npm run db:migrate:local
npm run dev
```

Start the frontend in a third terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api/*` to the Worker at
`http://127.0.0.1:8787`; the Worker forwards only AI routes to FastAPI at
`http://127.0.0.1:8000`. Create an account, then add a Gemini API key from
Settings before using AI actions. Local notes work without a key.

Cloudflare setup, OAuth callback URLs, production secrets, migrations, and
deployment order are documented in [Cloudflare Operations](./cloudflare/README.md). Optional
observability configuration is described in [Project Reference](./docs/project.md).

The equivalent command without Make is:

```bash
docker compose up --build --detach --wait
```

## Error Monitoring

Sentry error monitoring is optional. With no DSN configured, all SDKs remain
disabled and the application behaves as before.

- Backend runtime: set `SENTRY_DSN`; optionally set `SENTRY_ENVIRONMENT` and
  `SENTRY_RELEASE`. `SENTRY_TRACES_SAMPLE_RATE` defaults to `0`. LLM spans
  include pipeline, stage, model, latency, time-to-first-token, token usage,
  and outcome. Set `SENTRY_CAPTURE_LLM_CONTENT=true` to additionally send
  bounded prompts and responses; `SENTRY_LLM_CONTENT_MAX_CHARS` defaults to
  `4000` and is capped at `20000`.
- Frontend build: set `VITE_SENTRY_DSN`; optionally set
  `VITE_SENTRY_ENVIRONMENT`. Set `SENTRY_ORG`, `SENTRY_PROJECT`,
  `SENTRY_RELEASE`, and the build-only `SENTRY_AUTH_TOKEN` to upload source
  maps during `cd cloudflare && npm run deploy`.
- Cloudflare Worker: set `SENTRY_DSN` as a Wrangler secret; optionally set
  `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, and `SENTRY_TRACES_SAMPLE_RATE` as
  Wrangler secrets. The Worker captures unexpected Hono, D1, and AI gateway
  failures plus sampled performance traces.

The Worker defaults to 10% production tracing (100% in development); replay,
session tracking, and breadcrumbs are off. Request bodies, cookies, user identity,
document fields, notes, and Gemini credentials are removed before events are
sent. Backend LLM content is the only deliberate exception and is sent only
when `SENTRY_CAPTURE_LLM_CONTENT=true`. Source maps are deleted from the
production bundle after a successful upload.

## Verification

Backend:

```bash
cd backend
uv run pytest
uv run ruff check .
uv run python -m evals.workspace_alpha
```

The eval command validates dataset structure only; it is not a model-quality
evaluation.

Frontend:

```bash
cd frontend
npm run lint
npm test
npm run build
```

## Documentation

- [Project Reference](./docs/project.md): current product boundaries,
  architecture, domain language, and runtime contracts.
- [Roadmap](./docs/roadmap.md): the only source of truth for priorities,
  evidence gates, and deferred work.
- [Cloud architecture ADR](./docs/adr/0001-cloud-auth-and-reading-sessions.md):
  auth, D1 ownership, credential handling, and request boundaries.
