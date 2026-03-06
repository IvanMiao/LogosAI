FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

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
