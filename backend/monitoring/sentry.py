import os
from typing import Any

import sentry_sdk
from sentry_sdk.integrations.langchain import LangchainIntegration

_FILTERED = "[Filtered]"
_SENSITIVE_FIELD_NAMES = {
    "api-key",
    "apikey",
    "authorization",
    "cookie",
    "document",
    "gemini-key",
    "note",
    "prompt",
    "quote",
    "set-cookie",
    "text",
    "x-gemini-key",
}


def _normalized_field_name(field: object) -> str:
    return str(field).lower().replace("_", "-")


def _scrub_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: (
                _FILTERED
                if _normalized_field_name(key) in _SENSITIVE_FIELD_NAMES
                else _scrub_value(item)
            )
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_scrub_value(item) for item in value]
    if isinstance(value, tuple):
        return tuple(_scrub_value(item) for item in value)
    return value


def scrub_event(
    event: dict[str, Any],
    _hint: dict[str, Any],
) -> dict[str, Any]:
    request = event.get("request")
    if isinstance(request, dict):
        request.pop("cookies", None)
        request.pop("data", None)
        request.pop("query_string", None)

    event.pop("user", None)
    return _scrub_value(event)


def _traces_sample_rate() -> float:
    raw_rate = os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0")
    try:
        rate = float(raw_rate)
    except ValueError:
        return 0.0
    return rate if 0.0 <= rate <= 1.0 else 0.0


def init_error_monitoring() -> bool:
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn:
        return False

    sentry_sdk.init(
        dsn=dsn,
        environment=os.getenv("SENTRY_ENVIRONMENT", "production"),
        release=os.getenv("SENTRY_RELEASE") or None,
        send_default_pii=False,
        max_request_body_size="never",
        traces_sample_rate=_traces_sample_rate(),
        before_send=scrub_event,
        before_send_transaction=scrub_event,
        integrations=[LangchainIntegration(include_prompts=False)],
    )
    return True


def capture_exception(
    error: Exception,
    *,
    tags: dict[str, str] | None = None,
) -> None:
    with sentry_sdk.new_scope() as scope:
        for key, value in (tags or {}).items():
            scope.set_tag(key, value)
        sentry_sdk.capture_exception(error)
