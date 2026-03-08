import json
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, StreamingResponse

from schema.analyze_schema import (
    AnalysisRequest,
    AnalysisResponse,
    SettingsRequest,
    SettingsResponse,
)
from service import AnalysisService, get_analysis_service
from workflow.agent import MultiAgentState

load_dotenv()

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
    "https://logosai.fly.dev",
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

        return AnalysisResponse(result=result, success=True)
    except Exception as e:
        return AnalysisResponse(result="", success=False, error=str(e))


def to_sse_event(event: str, data: dict[str, Any]) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


@api_router.post("/analyze/stream")
async def stream_analyse_info(
    request: AnalysisRequest,
    service: AnalysisService = Depends(get_analysis_service),
):
    agent = service.get_agent()
    if not agent:
        raise HTTPException(
            status_code=400, detail="Please configure Gemini API key in settings"
        )

    async def event_generator():
        final_result = ""
        yield ": stream-start\n\n"

        try:
            async for event in agent.analyze_stream(
                request.text, request.user_language
            ):
                event_type = event.get("event")

                if event_type == "stage":
                    stage = event.get("stage", "")
                    if stage:
                        yield to_sse_event("stage", {"stage": stage})
                    continue

                if event_type == "chunk":
                    delta = event.get("delta", "")
                    if delta:
                        final_result += delta
                        yield to_sse_event("chunk", {"delta": delta})
                    continue

                if event_type == "done":
                    result = event.get("result", "").strip()
                    if result:
                        final_result = result

            if not final_result:
                raise ValueError("Analysis failed - no interpretation generated")

            yield to_sse_event("done", {"result": final_result})
        except Exception as e:
            yield to_sse_event("error", {"message": str(e)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )



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
            detail=(
                "Frontend bundle not found. "
                "Run `npm run dev` for local frontend development."
            ),
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
