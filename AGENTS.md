# Engineering Rules

This repo uses React + Vite + TypeScript on the frontend and FastAPI + Pydantic on the backend.

This repository keeps one tracked `AGENTS.md` at the root. Add a subdirectory
file only when that subtree genuinely needs different rules; the nearest file
then takes precedence.

## Commands

- Backend uses `uv`
- Frontend uses `npm`

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

## Frontend Verification

For frontend changes, run from `frontend/`:

- `npm run lint`
- `npx tsc --noEmit`
- `npm test`
- `npm run build`

## Backend (`backend/`)

**Entry Point**: `app.py` - FastAPI application with CORS + GZip middleware.

**Structure**:
- `routers/` — API routes (`routes.py`) and SSE streaming (`sse.py`)
- `llm/` — `agent.py` (`TextAnalysisLangchain` class), `state.py`, `prompts.py`
- `schemas/` — Pydantic models (`analyze.py`)

**Auth**: Gemini API key is passed per-request via `X-Gemini-Key` header — no server-side key storage.

**Analysis Workflow** (in `llm/agent.py`, class `TextAnalysisLangchain`):
```
START → detect → [needs_correction?] → correct → interpret → END
                         ↓
                    interpret → END
```
- `detect`: Uses `gemini-2.5-flash-lite` with structured output to identify language, genre, and if correction is needed
- `correct`: Fixes OCR/typo errors using lite model
- `interpret`: Main analysis using `gemini-2.5-flash` (configurable)
- `analyze()` and `analyze_stream()` share the same detect, correct, and interpret stage implementations

Legacy analysis and history import remain supported compatibility paths. Do not
remove them without an explicit product and data-migration decision.

## Deployment

Deployed on **Fly.io**. Use `flyctl` CLI for deployment operations.

## Definition of Done

- Touched code remains typed, readable, and internally coherent.
- The happy path works end-to-end for the changed area.
- At least one obvious failure path is still handled.
- Relevant checks pass for the area that changed.
