#!/bin/sh

set -eu

: "${FASTAPI_ORIGIN:?FASTAPI_ORIGIN is required}"
: "${BETTER_AUTH_URL:?BETTER_AUTH_URL is required}"
: "${TRUSTED_ORIGINS:?TRUSTED_ORIGINS is required}"
: "${BETTER_AUTH_SECRET:?BETTER_AUTH_SECRET is required}"
: "${CREDENTIALS_ENCRYPTION_KEY:?CREDENTIALS_ENCRYPTION_KEY is required}"
: "${GATEWAY_SHARED_SECRET:?GATEWAY_SHARED_SECRET is required}"

npx wrangler d1 migrations apply logosai-users \
  --local \
  --persist-to /data

exec npx wrangler dev \
  --local \
  --ip 0.0.0.0 \
  --port 8787 \
  --persist-to /data \
  --var "FASTAPI_ORIGIN:${FASTAPI_ORIGIN}" \
  --var "BETTER_AUTH_URL:${BETTER_AUTH_URL}" \
  --var "TRUSTED_ORIGINS:${TRUSTED_ORIGINS}" \
  --var "BETTER_AUTH_SECRET:${BETTER_AUTH_SECRET}" \
  --var "CREDENTIALS_ENCRYPTION_KEY:${CREDENTIALS_ENCRYPTION_KEY}" \
  --var "GATEWAY_SHARED_SECRET:${GATEWAY_SHARED_SECRET}"
