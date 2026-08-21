import os
from contextlib import contextmanager
from dataclasses import dataclass
from time import perf_counter
from typing import Iterator, Sequence

import sentry_sdk
from langchain_core.messages import BaseMessage
from sentry_sdk.consts import SPANDATA
from sentry_sdk.tracing import Span

_DEFAULT_CONTENT_LIMIT = 4_000
_TRUE_VALUES = {"1", "true", "yes", "on"}


def _capture_content() -> bool:
    return os.getenv("SENTRY_CAPTURE_LLM_CONTENT", "").lower() in _TRUE_VALUES


def _content_limit() -> int:
    raw_limit = os.getenv(
        "SENTRY_LLM_CONTENT_MAX_CHARS",
        str(_DEFAULT_CONTENT_LIMIT),
    )
    try:
        limit = int(raw_limit)
    except ValueError:
        return _DEFAULT_CONTENT_LIMIT
    return max(1, min(limit, 20_000))


def _truncate(value: str) -> tuple[str, bool]:
    limit = _content_limit()
    if len(value) <= limit:
        return value, False
    return f"{value[:limit]}…", True


def _message_role(message: BaseMessage) -> str:
    return {"human": "user", "ai": "assistant"}.get(message.type, message.type)


def _message_content(message: BaseMessage) -> str:
    content = message.content
    return content if isinstance(content, str) else str(content)


def _serialized_messages(
    messages: Sequence[BaseMessage],
) -> tuple[list[dict[str, str]], bool]:
    serialized: list[dict[str, str]] = []
    truncated = False
    for message in messages:
        content, item_truncated = _truncate(_message_content(message))
        truncated = truncated or item_truncated
        serialized.append({"role": _message_role(message), "content": content})
    return serialized, truncated


@dataclass
class LlmStageTelemetry:
    span: Span
    started_at: float
    content_truncated: bool = False
    first_token_recorded: bool = False

    def record_first_token(self) -> None:
        if self.first_token_recorded:
            return
        elapsed_ms = (perf_counter() - self.started_at) * 1_000
        self.span.set_data("logosai.time_to_first_token_ms", round(elapsed_ms, 2))
        self.first_token_recorded = True

    def record_response(self, response: str) -> None:
        if not _capture_content():
            return
        content, truncated = _truncate(response)
        self.content_truncated = self.content_truncated or truncated
        self.span.set_data(SPANDATA.GEN_AI_RESPONSE_TEXT, content)
        self.span.set_data("logosai.llm_content_truncated", self.content_truncated)


@contextmanager
def track_llm_pipeline(name: str, model: str) -> Iterator[Span]:
    with sentry_sdk.start_span(op="gen_ai.pipeline", name=name) as span:
        span.set_data(SPANDATA.GEN_AI_PIPELINE_NAME, name)
        span.set_data(SPANDATA.GEN_AI_REQUEST_MODEL, model)
        span.set_data(SPANDATA.GEN_AI_SYSTEM, "google_gemini")
        yield span


@contextmanager
def track_llm_stage(
    stage: str,
    model: str,
    messages: Sequence[BaseMessage],
) -> Iterator[LlmStageTelemetry]:
    with sentry_sdk.start_span(op="gen_ai.chat", name=f"{stage} {model}") as span:
        span.set_data(SPANDATA.GEN_AI_OPERATION_NAME, "chat")
        span.set_data(SPANDATA.GEN_AI_REQUEST_MODEL, model)
        span.set_data(SPANDATA.GEN_AI_SYSTEM, "google_gemini")
        span.set_data("logosai.llm_stage", stage)
        telemetry = LlmStageTelemetry(span=span, started_at=perf_counter())

        if _capture_content():
            serialized, truncated = _serialized_messages(messages)
            telemetry.content_truncated = truncated
            span.set_data(SPANDATA.GEN_AI_REQUEST_MESSAGES, serialized)
            span.set_data("logosai.llm_content_truncated", truncated)

        yield telemetry
