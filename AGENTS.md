# Engineering Rules

This repo uses React + Vite + TypeScript on the frontend and FastAPI + Pydantic on the backend.
A Cloudflare Worker (Hono + Better Auth + D1) serves the app and owns auth and user data.

This repository keeps one tracked `AGENTS.md` at the root. Add a subdirectory
file only when that subtree genuinely needs different rules; the nearest file
then takes precedence.

## Commands

- Backend uses `uv`
- Frontend and Cloudflare Worker use `npm`
- Worker verification: run `npm run check` from `cloudflare/`

### Linting

- Backend: Ruff
- Frontend: ESLint

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

## Frontend Verification

For frontend changes, run from `frontend/`:

- `npm run lint`
- `npx tsc --noEmit`
- `npm test`
- `npm run build`

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

Keep documentation proportional to the change. A UI change does not by itself
require a new document or updates to every reference.

- Current product/API facts belong in `docs/project.md`, priorities in
  `docs/roadmap.md`, and durable workspace behavior in
  `docs/ux/workspace-journey-contract.md`. Update only the affected owner, in place;
  link to it instead of repeating its contents or appending a dated change log.
- Spacing, colors, alignment, copy, and other presentation-only changes normally
  need only a concise PR description and relevant verification. Update the UX
  contract only when navigation, action semantics, state, persistence, accessibility
  behavior, or failure handling changes; keep test details in executable tests.
- Put per-change validation results in the PR: environment/version, scenarios,
  result, and material gaps. Raw QA logs, screenshots, drafts, and research notes
  belong in ignored `docs/local/`; superseded material may stay in ignored
  `docs/archive/`. Neither directory is an implementation backlog.
- Before moving a document out of Git, retain unresolved blockers and necessary
  decisions in their owning tracked document or issue. Tracked docs must stand
  alone without local-only files. Git history preserves removed tracked content.
- Add a tracked design only for a substantial, unresolved cross-cutting change
  that cannot be explained clearly in the PR or an existing document. Keep its
  scope, decisions, open questions, and exit criteria concise. Use an ADR for
  lasting architecture/data decisions and their rationale. After implementation,
  fold current behavior into its owner and remove superseded planning detail.

The documentation placement guide is in [README](README.md#documentation).

## Definition of Done

- Touched code remains typed, readable, and internally coherent.
- The happy path works end-to-end for the changed area.
- At least one obvious failure path is still handled.
- Relevant checks pass for the area that changed.
