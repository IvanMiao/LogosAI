from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse

from llm.agent import TextAnalysisLangchain
from llm.state import create_initial_state
from routers.sse import to_sse_event
from schemas.analyze import AnalysisRequest, AnalysisResponse
from service import get_agent

api_router = APIRouter(prefix="/api")

_ALLOWED_MODELS = {"gemini-2.5-flash", "gemini-2.5-pro"}


def _require_agent(
    api_key: str | None,
    model: str,
) -> TextAnalysisLangchain:
    if not api_key or not api_key.strip():
        raise HTTPException(
            status_code=401,
            detail="Missing Gemini API key. Configure it in Settings.",
        )
    if model not in _ALLOWED_MODELS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported model. Allowed: {', '.join(sorted(_ALLOWED_MODELS))}",
        )
    return get_agent(api_key.strip(), model)


@api_router.post("/analyze", response_model=AnalysisResponse)
def get_analyse_info(
    request: AnalysisRequest,
    x_gemini_key: str | None = Header(None),
):
    try:
        agent = _require_agent(x_gemini_key, request.model)
        initial_state = create_initial_state(request.text, request.user_language)
        final_state = agent.graph.invoke(initial_state)
        result = final_state.get("interpretation", "")
        if not result:
            raise HTTPException(
                status_code=500,
                detail="Analysis failed - no interpretation generated",
            )
        return AnalysisResponse(result=result, success=True)
    except HTTPException:
        raise
    except Exception as e:
        return AnalysisResponse(result="", success=False, error=str(e))


@api_router.post("/analyze/stream")
async def stream_analyse_info(
    request: AnalysisRequest,
    x_gemini_key: str | None = Header(None),
):
    agent = _require_agent(x_gemini_key, request.model)

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
