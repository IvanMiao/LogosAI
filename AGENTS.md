# Engineering Rules

This repo uses React + Vite + TypeScript on the frontend and FastAPI + Pydantic on the backend.
A Cloudflare Worker (Hono + Better Auth + D1) serves the app and owns auth and user data.

This repository keeps one tracked `AGENTS.md` at the root. Add a subdirectory
file only when that subtree genuinely needs different rules; the nearest file
then takes precedence.

## Commands

- Backend uses `uv` and Ruff; frontend and Cloudflare Worker use `npm`, ESLint for the frontend.

## Verification

Run the checks for each area you changed:

```bash
(cd backend && uv run pytest && uv run ruff check .)
(cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build)
(cd cloudflare && npm run check)
```

## Repo-Wide Non-Negotiables

- Keep changes small, reviewable, and reversible.
- Prefer explicit code over clever abstractions.
- Frontend readability is a hard requirement, not a nice-to-have.
- Do not introduce new dependencies unless they solve a concrete problem.
- Keep API contracts stable unless the task explicitly requires changing them.
- Do not mix feature work, broad refactors, and tooling churn in one patch unless unavoidable.

## Delivery Rules

- Make atomic commits: one logical change per commit.
- Preserve TypeScript strictness and Python typing.
- Prefer functional React components.
- Keep functions under 50 lines where practical.
- Hard limit of cyclomatic complexity: `<= 10`.
- Commit messages must not include a `Co-Authored-By` trailer.

## File Naming

- React component modules use `PascalCase.tsx`; generated primitives under
  `frontend/components/ui/` keep lowercase `kebab-case` names.
- React hooks use `useCamelCase.ts` or `useCamelCase.tsx`.
- Other TypeScript and JavaScript modules use `kebab-case`.
- TypeScript tests use `kebab-case.test.ts` or `kebab-case.test.tsx`.
- Python modules and tests use `snake_case.py`.
- Documentation and image assets use lowercase `kebab-case`.
- Keep ecosystem-defined names unchanged, including `README.md`, `AGENTS.md`,
  `Dockerfile`, `Makefile`, `package.json`, `index.*`, and `*.config.*`.

## Frontend Architecture

- Keep requests in `frontend/client-api/`; transport modules may depend on domain
  types, but must not depend on `app/`, `components/`, or `pages/`.
- Page hooks orchestrate workflows; `frontend/features/` owns domain logic and
  must not depend on `app/` or `pages/`.
- Page presentation components receive typed props and callbacks; they must not
  import `frontend/client-api/` directly.

## Backend (`backend/`)

**Entry Point**: `app.py` — FastAPI application.

**Structure**:
- `routers/routes.py` — Anchor actions (`/api/anchors/run`), Explain compatibility
  (`/api/anchors/explain`), Close Reading streaming (`/api/analyze/stream`), and
  synchronous analysis compatibility (`/api/analyze`)
- `routers/sse.py` — SSE event encoding
- `llm/` — `agent.py` (`TextAnalysisLangchain` class), `state.py`, `prompts.py`
- `schemas/` — Pydantic contracts for analysis (`analyze.py`) and Anchor actions
  (`anchors.py`)

**Auth**: The Worker decrypts the authenticated user’s stored Gemini key and passes
it via `X-Gemini-Key`. FastAPI does not persist keys; production also requires
the shared `X-LogosAI-Gateway` header.

Keep `analyze()` and `analyze_stream()` on shared detect, correct, and interpret
stage implementations. Model choices and workflow details belong in
[Project Reference](docs/project.md#ai-api-与契约).

Legacy analysis and history import remain supported compatibility paths. Do not
remove them without an explicit product and data-migration decision.

## Deployment

The Cloudflare Worker serves the browser app and API gateway; FastAPI runs on
**Fly.io**. Use the Worker npm/Wrangler commands for app deployment and `flyctl`
for the AI backend. See [operations](cloudflare/README.md).

## Documentation

Each kind of information has one owner; update it in place and link to it
instead of copying it. Keep documentation proportional to the change.

| Information | Owner |
| --- | --- |
| Run, local setup, deployment, secrets | `README.md`, `cloudflare/README.md` |
| Engineering rules, verification commands | `AGENTS.md` |
| Product/API facts, architecture, data rules | `docs/project.md` |
| Priorities, evidence gates, user evidence, open design questions | `docs/roadmap.md` |
| Durable workspace interaction rules | `docs/ux/workspace-journey-contract.md` and its tests |
| Lasting architecture/data decisions | `docs/adr/` |

- Presentation-only UI changes (spacing, color, copy) need only the PR
  description. Update the journey contract only when navigation, action
  semantics, state, persistence, accessibility, or failure handling changes.
- Per-change verification results go in the PR: environment/version, scenarios,
  result, and material gaps. Raw logs, screenshots, drafts, and notes go in
  ignored `docs/local/`; superseded material in ignored `docs/archive/`.
- Add a tracked design doc only for a substantial unresolved change that the PR
  or an existing owner cannot hold; after delivery, fold current behavior into
  its owner and remove the planning detail. Tracked docs must not depend on
  local-only files.

## Definition of Done

- Touched code remains typed, readable, and internally coherent.
- The happy path works end-to-end for the changed area.
- At least one obvious failure path is still handled.
- Relevant checks pass for the area that changed.
