#!/bin/sh

set -eu

npx wrangler d1 migrations apply logosai-users \
  --local \
  --persist-to /data

npx wrangler dev \
  --local \
  --ip 0.0.0.0 \
  --port 8787 \
  --persist-to /data \
  --env-file .dev.vars.docker &

worker_pid=$!
cleanup() {
  if kill -0 "$worker_pid" 2>/dev/null; then
    kill "$worker_pid"
    wait "$worker_pid" || true
  fi
}
trap cleanup EXIT INT TERM

node ./scripts/seed-local-test-account.mjs \
  --base-url http://127.0.0.1:8787 \
  --origin http://localhost:5173
touch /tmp/logosai-local-test-account-ready

wait "$worker_pid"
