#!/bin/sh

set -eu

npx wrangler d1 migrations apply logosai-users \
  --local \
  --persist-to /data

exec npx wrangler dev \
  --local \
  --ip 0.0.0.0 \
  --port 8787 \
  --persist-to /data \
  --env-file .dev.vars.docker
