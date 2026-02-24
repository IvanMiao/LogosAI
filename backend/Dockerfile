# Backend Dockerfile
FROM python:3.13-slim

WORKDIR /app

# Install uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy only dependency spec first (layer cache)
COPY pyproject.toml ./

# Install dependencies
RUN uv pip install --system --no-cache .

# Copy backend code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
