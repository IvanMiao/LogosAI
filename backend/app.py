from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse

from routers.routes import api_router

load_dotenv()

app = FastAPI()
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
