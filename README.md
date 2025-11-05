# LogosAI

[![Deploy to Hugging Face](https://img.shields.io/badge/🤗%20Hugging%20Face-Spaces-yellow)](https://huggingface.co/spaces/IvanMiao/LogosAI)

LogosAI is an AI-powered tool designed for deep language learning, capable of analyzing complex texts ranging from news articles to philosophical works.


![LogosAI Screenshot](./pageUI.png)


## Tech Stack

**Frontend:**
React, Vite, Tailwind CSS, shadcn/ui, Lucide Icons

**Backend:**
FastAPI, SQLite, Pydantic

## Getting Started

### Option 1 - Docker

1. Copy `.env.copy` to `.env`, then add your API key to the env file

2. Excute this command:
```bash
docker compose up -d
```

### Option 2 Manuel Installation

**Prerequisites**

-   Node.js (v18 or higher)
-   Python (v3.13 or higher)

1.  Copy `.env.copy` to `.env`, then add your API key to the env file

2.  **Backend Setup:**

    ```bash
    uv sync

    cd backend
    uv run uvicorn app:app --reload
    ```

    The backend will be running at `http://127.0.0.1:8000`.

3.  **Frontend Setup:**
    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```
    The frontend development server will be running at `http://localhost:5173`.

## TODO

- [ ] Dark mode
- [ ] Stream output
- [ ] Agent with LangChain/LangGraph
