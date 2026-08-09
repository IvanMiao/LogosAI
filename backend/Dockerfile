FROM node:22-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT=production
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_RELEASE
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN,required=false \
    SENTRY_AUTH_TOKEN="$(if [ -f /run/secrets/SENTRY_AUTH_TOKEN ]; then sed -n '1p' /run/secrets/SENTRY_AUTH_TOKEN; fi)" \
    VITE_SENTRY_RELEASE="$SENTRY_RELEASE" \
    npm run build

FROM python:3.13-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv export \
    --format requirements.txt \
    --frozen \
    --no-dev \
    --no-hashes \
    --no-emit-project \
    -o requirements.txt
RUN uv pip install --system --no-cache -r requirements.txt

COPY backend/ ./

COPY --from=frontend-builder /frontend/dist ./frontend_dist

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
