from __future__ import annotations

from sqlalchemy.orm import Session

from database import History
from schema.analyze_schema import (
    AnalysisRequest,
    AnalysisResponse,
    HistoryItem,
    HistoryResponse,
    SettingsRequest,
    SettingsResponse,
)
from service import AnalysisService
from workflow.agent import MultiAgentState

ABOUT_INFO: dict[str, object] = {
    "name": "LogosAI",
    "version": "1.0",
    "description": "Deep text analysis engine for advanced language learning.",
    "frontend": ["React", "Vite", "TailwindCSS", "shadcn/ui"],
    "backend": ["FastAPI", "LangChain/LangGraph", "PostgreSQL", "Pydantic"],
    "open_source_url": "https://github.com/IvanMiao/LogosAI",
}


def run_analysis(
    request: AnalysisRequest, service: AnalysisService, db: Session
) -> AnalysisResponse:
    agent = service.get_agent()
    if not agent:
        return AnalysisResponse(
            result="",
            success=False,
            error="Please configure Gemini API key in settings",
        )

    try:
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
            return AnalysisResponse(
                result="",
                success=False,
                error="Analysis failed - no interpretation generated",
            )

        history = History(
            prompt=request.text,
            result=result,
            target_language=request.user_language,
        )
        db.add(history)
        db.commit()

        return AnalysisResponse(result=result, success=True)
    except Exception as exc:
        return AnalysisResponse(result="", success=False, error=str(exc))


def get_history_items(db: Session) -> HistoryResponse:
    try:
        rows = db.query(History).order_by(History.timestamp.desc()).all()
        history = [HistoryItem(**row.to_dict()) for row in rows]
        return HistoryResponse(history=history, success=True)
    except Exception as exc:
        return HistoryResponse(history=[], success=False, error=str(exc))


def get_history_item_by_id(history_id: int, db: Session) -> HistoryItem | None:
    row = db.query(History).filter(History.id == history_id).first()
    if not row:
        return None
    return HistoryItem(**row.to_dict())


def delete_history_item(history_id: int, db: Session) -> bool:
    history = db.query(History).filter(History.id == history_id).first()
    if not history:
        return False

    db.delete(history)
    db.commit()
    return True


def read_settings(service: AnalysisService) -> SettingsResponse:
    has_key = bool(service.settings["gemini_api_key"])
    masked_key = f'{service.settings["gemini_api_key"][:4]}...' if has_key else ""
    return SettingsResponse(
        gemini_api_key=masked_key,
        model=service.settings["model"],
        has_api_key=has_key,
        success=True,
    )


def apply_settings(
    request: SettingsRequest, service: AnalysisService
) -> SettingsResponse:
    service.update_settings(request.gemini_api_key, request.model)
    return read_settings(service)
