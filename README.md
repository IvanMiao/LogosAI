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
- Create close readings for a paragraph or full document.
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
