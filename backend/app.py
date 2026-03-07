from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
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
api_router = APIRouter(prefix="/api")
FRONTEND_DIST_DIR = Path(__file__).resolve().parent / "frontend_dist"
FRONTEND_INDEX_FILE = FRONTEND_DIST_DIR / "index.html"
LONG_CACHE_SUFFIXES = {
    ".js",
    ".css",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".svg",
    ".webp",
    ".avif",
    ".woff",
    ".woff2",
}

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
app.add_middleware(GZipMiddleware, minimum_size=1000)


@api_router.post("/analyze", response_model=AnalysisResponse)
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


@api_router.get("/history", response_model=HistoryResponse)
async def get_history(db: Session = Depends(get_db)):
    try:
        rows = db.query(History).order_by(History.timestamp.desc()).all()
        history = [row.to_dict() for row in rows]

        return HistoryResponse(history=history, success=True)
    except Exception as e:
        return HistoryResponse(history=[], success=False, error=str(e))


@api_router.delete("/history/{history_id}")
async def delete_history(history_id: int, db: Session = Depends(get_db)):
    history = db.query(History).filter(History.id == history_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="History item not found")

    db.delete(history)
    db.commit()
    return {"success": True, "message": "History item deleted successfully"}


@api_router.get("/settings", response_model=SettingsResponse)
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


@api_router.post("/settings", response_model=SettingsResponse)
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


app.include_router(api_router)


def resolve_frontend_asset(path: str) -> Path | None:
    if not FRONTEND_DIST_DIR.exists():
        return None

    candidate = (FRONTEND_DIST_DIR / path).resolve()
    dist_root = FRONTEND_DIST_DIR.resolve()

    if candidate == dist_root or dist_root not in candidate.parents:
        return None

    if candidate.is_file():
        return candidate

    return None


def build_asset_response(asset: Path) -> FileResponse:
    response = FileResponse(asset)
    if asset.suffix.lower() in LONG_CACHE_SUFFIXES:
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return response


@app.get("/", include_in_schema=False)
async def serve_frontend_index():
    if not FRONTEND_INDEX_FILE.exists():
        raise HTTPException(
            status_code=404,
            detail="Frontend bundle not found. Run `npm run dev` for local frontend development.",
        )

    response = FileResponse(FRONTEND_INDEX_FILE)
    response.headers["Cache-Control"] = "no-cache"
    return response


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend_app(full_path: str):
    asset = resolve_frontend_asset(full_path)
    if asset:
        return build_asset_response(asset)

    # Missing asset-like paths should 404 instead of returning index.html.
    if Path(full_path).suffix:
        raise HTTPException(status_code=404, detail="Not found")

    if FRONTEND_INDEX_FILE.exists():
        response = FileResponse(FRONTEND_INDEX_FILE)
        response.headers["Cache-Control"] = "no-cache"
        return response

    raise HTTPException(status_code=404, detail="Not found")
