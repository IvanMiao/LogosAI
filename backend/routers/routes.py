from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from llm.state import create_initial_state
from routers.sse import to_sse_event
from schemas.analyze import (
    AnalysisRequest,
    AnalysisResponse,
    SettingsRequest,
    SettingsResponse,
)
from service import AnalysisService, get_analysis_service

api_router = APIRouter(prefix="/api")


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

        initial_state = create_initial_state(request.text, request.user_language)

        final_state = agent.graph.invoke(initial_state)
        result = final_state.get("interpretation", "")
        if not result:
            raise HTTPException(
                status_code=500, detail="Analysis failed - no interpretation generated"
            )

        return AnalysisResponse(result=result, success=True)
    except Exception as e:
        return AnalysisResponse(result="", success=False, error=str(e))


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


def _build_settings_response(service: AnalysisService) -> SettingsResponse:
    has_key = bool(service.settings["gemini_api_key"])
    return SettingsResponse(
        gemini_api_key=service.settings["gemini_api_key"][:4] + "..."
        if has_key
        else "",
        model=service.settings["model"],
        has_api_key=has_key,
        success=True,
    )


@api_router.get("/settings", response_model=SettingsResponse)
async def get_settings(service: AnalysisService = Depends(get_analysis_service)):
    return _build_settings_response(service)


@api_router.post("/settings", response_model=SettingsResponse)
async def update_settings(
    request: SettingsRequest, service: AnalysisService = Depends(get_analysis_service)
):
    service.update_settings(request.gemini_api_key, request.model)
    return _build_settings_response(service)
