from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from workflow.agent import TextAnalysisLangchain, MultiAgentState
from schema.analyze_schema import AnalysisRequest, AnalysisResponse
from schema.analyze_schema import HistoryResponse, SettingsRequest, SettingsResponse
from dotenv import load_dotenv
from database import init_db, get_db_connection
from database import History
import os


load_dotenv()
init_db()

# Global settings
settings = {
    "gemini_api_key": os.getenv("GEMINI_API_KEY", ""),
    "model": "gemini-2.5-flash"
}

# Use new LangChain agent system
agent = TextAnalysisLangchain(
    gemini_key=settings["gemini_api_key"],
    model=settings["model"]
) if settings["gemini_api_key"] else None

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
    global agent
    try:
        if not agent:
            raise HTTPException(status_code=400, detail="Please configure Gemini API key in settings")
        
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
        db = get_db_connection()
        history = History(prompt=request.text, result=result)
        db.add(history)
        db.commit()
        db.close()

        return AnalysisResponse(result=result, success=True)
    except Exception as e:
        return AnalysisResponse(result="", success=False, error=str(e))


@app.get("/history", response_model=HistoryResponse)
async def get_history():
    try:
        db = get_db_connection()
        rows = db.query(History).order_by(History.timestamp.desc()).all()
        history = [row.to_dict() for row in rows]
        db.close()

        return HistoryResponse(history=history, success=True)
    except Exception as e:
        return HistoryResponse(history=[], success=False, error=str(e))


@app.delete("/history/{history_id}")
async def delete_history(history_id: int):
    try:
        db = get_db_connection()
        history = db.query(History).filter(History.id == history_id).first()
        db.delete(history)
        db.commit()
        db.close()
        return {"success": True, "message": "History item deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/settings", response_model=SettingsResponse)
async def get_settings():
    has_key = bool(settings["gemini_api_key"])
    return SettingsResponse(
        gemini_api_key=settings["gemini_api_key"][:8] + "..." if has_key else "",
        model=settings["model"],
        has_api_key=has_key,
        success=True
    )


@app.post("/settings", response_model=SettingsResponse)
async def update_settings(request: SettingsRequest):
    global agent, settings
    try:
        # Update API key only if provided
        if request.gemini_api_key:
            settings["gemini_api_key"] = request.gemini_api_key
        
        # Always update model
        settings["model"] = request.model
        
        # Reinitialize agent with new settings
        if settings["gemini_api_key"]:
            agent = TextAnalysisLangchain(
                gemini_key=settings["gemini_api_key"],
                model=settings["model"]
            )
        
        has_key = bool(settings["gemini_api_key"])
        return SettingsResponse(
            gemini_api_key=settings["gemini_api_key"][:8] + "..." if has_key else "",
            model=settings["model"],
            has_api_key=has_key,
            success=True
        )
    except Exception as e:
        return SettingsResponse(
            gemini_api_key="",
            model="",
            has_api_key=False,
            success=False,
            error=str(e)
        )
