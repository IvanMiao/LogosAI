from hashlib import sha256
from time import perf_counter
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse

from llm.agent import TextAnalysisLangchain
from llm.state import create_initial_state
from observability.factory import get_observability_client
from routers.sse import to_sse_event
from schemas.analyze import AnalysisRequest, AnalysisResponse
from schemas.anchors import AnchorExplainRequest, AnchorRunRequest, AnchorSkill

api_router = APIRouter(prefix="/api")

_ALLOWED_MODELS = {"gemini-2.5-flash", "gemini-2.5-pro"}
_PROMPT_VERSION = "anchor-skills:v1"
_observability = get_observability_client()


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


def _prompt_hash(prompt_text: str) -> str:
    return sha256(prompt_text.encode("utf-8")).hexdigest()[:16]


def _record_anchor_stage(trace_id: str, stage: str, skill: AnchorSkill) -> None:
    span_name_by_stage = {
        "detect": "llm.detect",
        "correct": "llm.correct",
        "interpret": f"llm.{skill}",
    }
    span_name = span_name_by_stage.get(stage, "llm.interpret")
    _observability.record_span(trace_id, span_name, {"stage": stage})


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
    trace_started_at = perf_counter()
    first_token_latency_ms: int | None = None

    _observability.start_trace(
        trace_id,
        {
            "request_id": request_id,
            "user_action": skill,
            "document_id": request.document.id,
            "anchor_id": anchor_id,
            "model": request.model,
            "prompt_version": _PROMPT_VERSION,
            "prompt_hash": _prompt_hash(prompt_text),
            "input_token_count": "unknown",
            "output_token_count": "unknown",
        },
    )
    _observability.record_span(
        trace_id,
        "workspace.action",
        {"user_action": skill},
    )
    _observability.record_span(
        trace_id,
        "anchor.resolve",
        {
            "scope": request.anchor.scope,
            "quote_length": len(request.anchor.quote),
        },
    )

    async def event_generator():
        nonlocal first_token_latency_ms
        final_result = ""
        yield ": stream-start\n\n"
        _observability.record_span(trace_id, "skill.run", {"skill": skill})
        _observability.record_span(trace_id, "sse.stream", {"status": "started"})

        try:
            async for event in agent.analyze_stream(
                prompt_text,
                request.user_language,
            ):
                event_type = event.get("event")

                if event_type == "stage":
                    stage = event.get("stage", "")
                    if stage:
                        _record_anchor_stage(trace_id, stage, skill)
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
                        if first_token_latency_ms is None:
                            first_token_latency_ms = int(
                                (perf_counter() - trace_started_at) * 1000
                            )
                            _observability.record_span(
                                trace_id,
                                "sse.stream",
                                {
                                    "first_token_latency_ms": first_token_latency_ms,
                                },
                            )
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

            _observability.finish_trace(
                trace_id,
                "success",
                {
                    "first_token_latency_ms": first_token_latency_ms,
                    "total_latency_ms": int((perf_counter() - trace_started_at) * 1000),
                    "status": "success",
                },
            )
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
            _observability.finish_trace(
                trace_id,
                "error",
                {
                    "error_type": type(e).__name__,
                    "first_token_latency_ms": first_token_latency_ms,
                    "total_latency_ms": int((perf_counter() - trace_started_at) * 1000),
                    "status": "error",
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
