from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from workflow.agent import TextAnalysisAgent, TextAnalysisLangchain
from workflow.agent import MultiAgentState
from schema.analyze_schema import AnalysisRequest, AnalysisResponse
from schema.analyze_schema import HistoryResponse, HistoryItem
from dotenv import load_dotenv
from database import init_db, get_db_connection
import os


load_dotenv()

init_db()

# Use new LangChain agent system
agent = TextAnalysisLangchain(gemini_key=os.getenv("GEMINI_API_KEY"))

# legacy_agent = TextAnalysisAgent(gemini_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

# FastAPI Documentation: CORS (Cross-Origin Resource Sharing)
origins = [
    "http://localhost",
    "http://localhost:3000",  # Docker frontend
    "http://localhost:8080",
    "http://localhost:5173",  # Vite dev server
    "null"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.post("/analyze", response_model=AnalysisResponse)
async def get_analyse_info(request: AnalysisRequest):
    try:
        initial_state: MultiAgentState = {
            "messages": [],
            "text": request.text,
            "text_language": "",
            "genre": "",
            "needs_correction": False,
            "corrected_text": None,
            "interpretation": None,
            "user_language": request.user_language.upper()
        }

        final_state = agent.graph.invoke(initial_state)

        result = final_state.get("interpretation", "")

        if not result:
            raise HTTPException(status_code=500, detail="Analysis failed - no interpretation generated")

        # Save to database
        conn = get_db_connection()
        conn.execute('INSERT INTO history (prompt, result) VALUES (?, ?)', (request.text, result))
        conn.commit()
        conn.close()

        return AnalysisResponse(result=result, success=True)
    except Exception as e:
        return AnalysisResponse(result="", success=False, error=str(e))


@app.get("/history", response_model=HistoryResponse)
async def get_history():
    try:
        conn = get_db_connection()
        rows = conn.execute('SELECT id, prompt, result, timestamp FROM history ORDER BY timestamp DESC').fetchall()
        conn.close()

        history = [{"id": row["id"], "prompt": row["prompt"], "result": row["result"], "timestamp": row["timestamp"]} for row in rows]
        return HistoryResponse(history=history, success=True)
    except Exception as e:
        return HistoryResponse(history=[], success=False, error=str(e))


@app.delete("/history/{history_id}")
async def delete_history(history_id: int):
    try:
        conn = get_db_connection()
        conn.execute('DELETE FROM history WHERE id = ?', (history_id,))
        conn.commit()
        conn.close()
        return {"success": True, "message": "History item deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
