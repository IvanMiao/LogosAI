from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import History, get_db, init_db
from schema.analyze_schema import (
    AnalysisRequest,
    AnalysisResponse,
    HistoryResponse,
    SettingsRequest,
    SettingsResponse,
)
from service import AnalysisService, get_analysis_service
from workflow.agent import MultiAgentState

load_dotenv()
init_db()

app = FastAPI()

# FastAPI Documentation: CORS (Cross-Origin Resource Sharing)
origins = [
    "http://localhost",
    "http://localhost:3000",  # Docker frontend
    "http://localhost:8080",
    "http://localhost:5173",  # Vite dev server
    "null",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/analyze", response_model=AnalysisResponse)
def get_analyse_info(
    request: AnalysisRequest,
    service: AnalysisService = Depends(get_analysis_service),
    db: Session = Depends(get_db),
):
    try:
        agent = service.get_agent()
        if not agent:
            raise HTTPException(
                status_code=400, detail="Please configure Gemini API key in settings"
            )

        initial_state: MultiAgentState = {
            "messages": [],
            "text": request.text,
            "text_language": "",
            "genre": "",
            "needs_correction": False,
            "corrected_text": None,
            "interpretation": None,
            "user_language": request.user_language.upper(),
        }

        final_state = agent.graph.invoke(initial_state)
        result = final_state.get("interpretation", "")
        if not result:
            raise HTTPException(
                status_code=500, detail="Analysis failed - no interpretation generated"
            )

        # Save to database
        history = History(
            prompt=request.text,
            result=result,
            target_language=request.user_language,
        )
        db.add(history)
        db.commit()

        return AnalysisResponse(result=result, success=True)
    except Exception as e:
        return AnalysisResponse(result="", success=False, error=str(e))


@app.get("/history", response_model=HistoryResponse)
async def get_history(db: Session = Depends(get_db)):
    try:
        rows = db.query(History).order_by(History.timestamp.desc()).all()
        history = [row.to_dict() for row in rows]

        return HistoryResponse(history=history, success=True)
    except Exception as e:
        return HistoryResponse(history=[], success=False, error=str(e))


@app.delete("/history/{history_id}")
async def delete_history(history_id: int, db: Session = Depends(get_db)):
    history = db.query(History).filter(History.id == history_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="History item not found")

    db.delete(history)
    db.commit()
    return {"success": True, "message": "History item deleted successfully"}


@app.get("/settings", response_model=SettingsResponse)
async def get_settings(service: AnalysisService = Depends(get_analysis_service)):
    has_key = bool(service.settings["gemini_api_key"])
    return SettingsResponse(
        gemini_api_key=service.settings["gemini_api_key"][:4] + "..."
        if has_key
        else "",
        model=service.settings["model"],
        has_api_key=has_key,
        success=True,
    )


@app.post("/settings", response_model=SettingsResponse)
async def update_settings(
    request: SettingsRequest, service: AnalysisService = Depends(get_analysis_service)
):
    # Reinitialize agent with new settings
    service.update_settings(request.gemini_api_key, request.model)

    has_key = bool(service.settings["gemini_api_key"])

    return SettingsResponse(
        gemini_api_key=service.settings["gemini_api_key"][:4] + "..."
        if has_key
        else "",
        model=service.settings["model"],
        has_api_key=has_key,
        success=True,
    )
