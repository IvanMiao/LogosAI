from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db, init_db
from schema.analyze_schema import (
    AnalysisRequest,
    AnalysisResponse,
    HistoryResponse,
    SettingsRequest,
    SettingsResponse,
)
from service import AnalysisService, get_analysis_service
from use_cases import (
    apply_settings,
    delete_history_item,
    get_history_items,
    read_settings,
    run_analysis,
)

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
    return run_analysis(request, service, db)


@app.get("/history", response_model=HistoryResponse)
async def get_history(db: Session = Depends(get_db)):
    return get_history_items(db)


@app.delete("/history/{history_id}")
async def delete_history(history_id: int, db: Session = Depends(get_db)):
    if not delete_history_item(history_id, db):
        raise HTTPException(status_code=404, detail="History item not found")

    return {"success": True, "message": "History item deleted successfully"}


@app.get("/settings", response_model=SettingsResponse)
async def get_settings(service: AnalysisService = Depends(get_analysis_service)):
    return read_settings(service)


@app.post("/settings", response_model=SettingsResponse)
async def update_settings(
    request: SettingsRequest, service: AnalysisService = Depends(get_analysis_service)
):
    return apply_settings(request, service)
