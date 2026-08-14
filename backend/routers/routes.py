from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse

from llm.agent import TextAnalysisLangchain
from llm.state import create_initial_state
from monitoring import capture_exception
from monitoring.llm import track_llm_pipeline
from routers.sse import to_sse_event
from schemas.analyze import AnalysisRequest, AnalysisResponse
from schemas.anchors import AnchorExplainRequest, AnchorRunRequest, AnchorSkill
from security.cloudflare_gateway import require_cloudflare_gateway

api_router = APIRouter(
    prefix="/api",
    dependencies=[Depends(require_cloudflare_gateway)],
)

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
    return TextAnalysisLangchain(gemini_key=api_key.strip(), model=model)


def _anchor_event_payload(
    request_id: str,
    trace_id: str,
    anchor_id: str,
    data: dict,
) -> dict:
    return {
        "request_id": request_id,
        "trace_id": trace_id,
        "anchor_id": anchor_id,
        **data,
    }


def _build_anchor_prompt(request: AnchorExplainRequest, skill: AnchorSkill) -> str:
    title = request.document.title or "Untitled document"
    task_by_skill = {
        "explain": (
            "Explain the selected passage using the surrounding document as context."
        ),
        "translate": (
            "Translate the selected passage into the user's target language. "
            "Keep proper nouns and specialist terms clear."
        ),
        "vocab": (
            "Extract and explain the advanced vocabulary, idioms, and fixed "
            "phrases that matter for understanding the selected passage."
        ),
    }
    return "\n\n".join(
        [
            task_by_skill[skill],
            f"Document title: {title}",
            f"Selected passage:\n{request.anchor.quote}",
            f"Full source document:\n{request.document.text}",
        ]
    )


def _stream_headers() -> dict[str, str]:
    return {
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }


@api_router.post("/analyze", response_model=AnalysisResponse)
def get_analyse_info(
    request: AnalysisRequest,
    x_gemini_key: str | None = Header(None),
):
    try:
        agent = _require_agent(x_gemini_key, request.model)
        initial_state = create_initial_state(request.text, request.user_language)
        with track_llm_pipeline("close_read", request.model):
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
        capture_exception(
            e,
            tags={"endpoint": "analyze", "model": request.model},
        )
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
            with track_llm_pipeline("close_read", request.model):
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
            capture_exception(
                e,
                tags={"endpoint": "analyze.stream", "model": request.model},
            )
            yield to_sse_event("error", {"message": str(e)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=_stream_headers(),
    )


def _stream_anchor_skill(
    request: AnchorExplainRequest,
    skill: AnchorSkill,
    x_gemini_key: str | None = Header(None),
):
    agent = _require_agent(x_gemini_key, request.model)
    request_id = f"request-{uuid4().hex}"
    trace_id = f"trace-{uuid4().hex}"
    anchor_id = request.anchor.id
    prompt_text = _build_anchor_prompt(request, skill)

    async def event_generator():
        final_result = ""
        yield ": stream-start\n\n"

        try:
            with track_llm_pipeline(f"anchor.{skill}", request.model):
                async for event in agent.analyze_stream(
                    prompt_text,
                    request.user_language,
                ):
                    event_type = event.get("event")

                    if event_type == "stage":
                        stage = event.get("stage", "")
                        if stage:
                            yield to_sse_event(
                                "stage",
                                _anchor_event_payload(
                                    request_id,
                                    trace_id,
                                    anchor_id,
                                    {"stage": stage},
                                ),
                            )
                        continue

                    if event_type == "chunk":
                        delta = event.get("delta", "")
                        if delta:
                            final_result += delta
                            yield to_sse_event(
                                "chunk",
                                _anchor_event_payload(
                                    request_id,
                                    trace_id,
                                    anchor_id,
                                    {"delta": delta},
                                ),
                            )
                        continue

                    if event_type == "done":
                        result = event.get("result", "").strip()
                        if result:
                            final_result = result

            if not final_result:
                raise ValueError("Analysis failed - no interpretation generated")

            yield to_sse_event(
                "done",
                _anchor_event_payload(
                    request_id,
                    trace_id,
                    anchor_id,
                    {"result": final_result},
                ),
            )
        except Exception as e:
            capture_exception(
                e,
                tags={
                    "endpoint": "anchors.run",
                    "model": request.model,
                    "skill": skill,
                    "trace_id": trace_id,
                },
            )
            yield to_sse_event(
                "error",
                _anchor_event_payload(
                    request_id,
                    trace_id,
                    anchor_id,
                    {"message": str(e)},
                ),
            )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=_stream_headers(),
    )


@api_router.post("/anchors/explain")
async def stream_anchor_explain(
    request: AnchorExplainRequest,
    x_gemini_key: str | None = Header(None),
):
    return _stream_anchor_skill(request, "explain", x_gemini_key)


@api_router.post("/anchors/run")
async def stream_anchor_run(
    request: AnchorRunRequest,
    x_gemini_key: str | None = Header(None),
):
    return _stream_anchor_skill(request, request.skill, x_gemini_key)
