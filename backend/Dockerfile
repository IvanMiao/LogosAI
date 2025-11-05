# Backend Dockerfile
FROM python:3.13-slim

WORKDIR /app

# Copy project configuration file
COPY pyproject.toml ./

# Install dependencies
RUN pip install --no-cache-dir -e .

# Copy backend code to working directory (not backend subdirectory)
COPY backend/ ./

# Note: .env file is passed via environment variables, no need to copy into image

# Expose port
EXPOSE 8000

# Startup command (app.py is in current directory)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
