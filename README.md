# LogosAI

[![Hugging Face Spaces](https://img.shields.io/badge/Hugging%20Face-Spaces-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black)](https://huggingface.co/spaces/IvanMiao/LogosAI)

**LogosAI** is an advanced AI-powered platform designed for deep language learning and the rigorous analysis of complex texts. Whether you are deconstructing intricate news articles, academic papers, or dense philosophical works, LogosAI empowers you to understand sophisticated narratives with precision and depth.

![LogosAI Interface](./UI2.png)

## Tech Stack

LogosAI leverages a modern, type-safe, and scalable technology stack:

*   **Frontend**: React, TypeScript, Tailwind CSS, Vite
*   **Backend**: Python, FastAPI, PostgreSQL, LangChain/LangGraph
*   **Infrastructure**: Docker, Docker Compose

![LogosAI Architecture](./UI3.png)

## Getting Started

You can run LogosAI using Docker (recommended) or set it up manually.

### Option 1: Docker (Recommended)

The easiest way to get up and running.

1.  **Configure Environment**:
    Copy `.env.copy` to `.env` and add your API credentials.

2.  **Launch**:
    ```bash
    docker compose up -d
    ```

### Option 2: Manual Installation

**Prerequisites**
*   Node.js (v18+)
*   Python (v3.13+)
*   PostgreSQL (v16+)

1.  **Configure Environment**:
    Copy `.env.copy` to `.env` and configure your API key and Database credentials.

2.  **Backend Setup**:
    Ensure PostgreSQL is running and accessible.

    ```bash
    uv sync
    cd backend
    uv run uvicorn app:app --reload
    ```
    The backend will be available at `http://127.0.0.1:8000`.

3.  **Frontend Setup**:
    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```
    The frontend will be available at `http://localhost:5173`.

## Recent Updates

*   **Architecture**: Implemented Dependency Injection and Singleton patterns in the backend for improved state management.
*   **Persistence**: Migrated to **PostgreSQL** for robust data storage.
*   **Type Safety**: Complete migration of the frontend codebase to **TypeScript**.

## Roadmap

*   [ ] Dark Mode Support
*   [ ] Streaming Response Output
*   [ ] Agentic Architecture Refactor
