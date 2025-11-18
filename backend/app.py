from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from schema.analyze_schema import AnalysisRequest, AnalysisResponse
from schema.analyze_schema import HistoryResponse, SettingsRequest, SettingsResponse
from dotenv import load_dotenv
from database import init_db, get_db
from services.analysis_service import analysis_service

# Initialize environment and database
load_dotenv()
init_db()

# Create FastAPI app
app = FastAPI()

# CORS Middleware Configuration
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:5173",
    "null"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# --- API Endpoints ---

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_text_endpoint(request: AnalysisRequest, db: Session = Depends(get_db)):
    try:
        result = analysis_service.analyze_text(db, request)
        return AnalysisResponse(result=result, success=True)
    except Exception as e:
        error_message = str(e.detail) if hasattr(e, 'detail') else str(e)
        return AnalysisResponse(result="", success=False, error=error_message)

@app.get("/history", response_model=HistoryResponse)
async def get_history_endpoint(db: Session = Depends(get_db)):
    try:
        history_data = analysis_service.get_history(db)
        return HistoryResponse(history=history_data, success=True)
    except Exception as e:
        return HistoryResponse(history=[], success=False, error=str(e))

@app.delete("/history/{history_id}")
async def delete_history_endpoint(history_id: int, db: Session = Depends(get_db)):
    try:
        analysis_service.delete_history(db, history_id)
        return {"success": True, "message": "History item deleted successfully"}
    except Exception as e:
        if hasattr(e, 'status_code'):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/settings", response_model=SettingsResponse)
async def get_settings_endpoint():
    try:
        settings_data = analysis_service.get_settings()
        return SettingsResponse(**settings_data, success=True)
    except Exception as e:
        return SettingsResponse(
            gemini_api_key="", model="", has_api_key=False, success=False, error=str(e)
        )

@app.post("/settings", response_model=SettingsResponse)
async def update_settings_endpoint(request: SettingsRequest):
    try:
        settings_data = analysis_service.update_settings(request)
        return SettingsResponse(**settings_data, success=True)
    except Exception as e:
        return SettingsResponse(
            gemini_api_key="", model="", has_api_key=False, success=False, error=str(e)
        )
