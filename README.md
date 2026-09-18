<div align="center">
  <img src="./docs/logo.png" alt="LogosAI Logo" width="280" />
</div>

# LogosAI

LogosAI is a source-grounded AI reading workspace for difficult texts. Import a
text, select a passage for help, run a close reading, and keep notes and AI
outputs attached to the source context.

## What it does

- Import pasted text and local `.txt` or `.md` files.
- Explain, translate, define vocabulary, and annotate selected passages.
- Explain paragraphs and create close readings for full documents.
- Keep reading sessions, notes, and AI entries with the signed-in user.

## Run locally

The recommended path uses Docker Compose:

```bash
make up
```

Open <http://localhost:5173>. Use `make logs` to follow service output and
`make down` to stop the stack.

For hot reload, run the backend, Cloudflare gateway, and frontend separately.
The gateway setup, required local secrets, and commands are in
[Cloudflare Operations](./cloudflare/README.md#local-setup).

## Local test account

The Docker stack seeds this account with a sample reading session:

```text
Email:    local-test@logosai.invalid
Password: LogosAI-local-test-2026!
```

Restarting `make up` resets its data. Use a separate account for personal local
work.

## Verify changes

Backend:

```bash
cd backend
uv run pytest
uv run ruff check .
```

Frontend:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Cloudflare gateway:

```bash
cd cloudflare
npm run check
```

## Documentation

- [Cloudflare Operations](./cloudflare/README.md): local gateway setup,
  deployment, OAuth, and secrets.
- [Project Reference](./docs/project.md): product boundaries, architecture, and
  runtime contracts.
- [Roadmap](./docs/roadmap.md): priorities and evidence gates.
- [Cloud architecture ADR](./docs/adr/0001-cloud-auth-and-reading-sessions.md):
  auth, data ownership, and credential boundaries.
- [Workspace Journey Contract](./docs/ux/workspace-journey-contract.md): current
  interaction rules and test entry points.
- [Workspace Evolution](./docs/ux/reading-workspace-evolution.md): remaining design
  decisions and slice dependencies, subject to the Roadmap.
- [User Evidence](./docs/user-evidence.md): historical reports, hypotheses, and
  evidence limits.
- [Evaluation samples](./docs/evals/workspace_alpha.jsonl): versioned test inputs,
  consumed by the backend dataset validator; these are not QA logs.

Start with this README, Project Reference, and Roadmap. Each document owns one
kind of information; link to that owner instead of copying it.

| Material | Where it belongs |
| --- | --- |
| Setup, current contracts, priorities, accepted architecture decisions, reusable evaluation inputs | Tracked in the owning document or dataset; include affected updates in the same PR |
| Minor UI polish, change rationale, verification results | PR description; a UI change does not require a new UX document |
| A changed interaction or failure rule | A concise edit to the Journey Contract and relevant tests |
| Substantial unresolved design spanning multiple changes | A concise tracked proposal only when the PR or existing docs are insufficient; consolidate after delivery |
| Raw browser logs, screenshots, drafts, research and personal notes | Ignored `docs/local/` |
| Superseded designs, old QA and learning material | Git history; optional ignored `docs/archive/` copy |

PR verification should state the environment/version, relevant scenarios, result,
and material gaps. Before archiving, promote unresolved blockers and lasting
decisions to their owner or an issue. Local-only files are optional working
material, not required references or an implementation backlog. Detailed editing
rules live in [AGENTS.md](./AGENTS.md#documentation).
