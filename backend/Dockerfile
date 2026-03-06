FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY README.md ./README.md
COPY backend/pyproject.toml backend/uv.lock* ./
COPY backend/app.py backend/cli.py backend/database.py backend/service.py backend/use_cases.py backend/__init__.py ./
COPY backend/schema ./schema
COPY backend/workflow ./workflow
RUN uv pip install --system --no-cache .

COPY --from=frontend-builder /frontend/dist ./frontend_dist

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
