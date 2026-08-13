from unittest.mock import MagicMock, patch

from langchain_core.messages import HumanMessage, SystemMessage

from monitoring.llm import track_llm_pipeline, track_llm_stage


def test_pipeline_records_safe_dimensions(monkeypatch):
    monkeypatch.delenv("SENTRY_CAPTURE_LLM_CONTENT", raising=False)
    span = MagicMock()

    with patch("monitoring.llm.sentry_sdk.start_span") as start_span:
        start_span.return_value.__enter__.return_value = span
        with track_llm_pipeline("anchor.explain", "gemini-2.5-flash"):
            pass

    start_span.assert_called_once_with(
        op="gen_ai.pipeline",
        name="anchor.explain",
    )
    span.set_data.assert_any_call("gen_ai.pipeline.name", "anchor.explain")
    span.set_data.assert_any_call("gen_ai.request.model", "gemini-2.5-flash")


def test_stage_hides_content_by_default(monkeypatch):
    monkeypatch.delenv("SENTRY_CAPTURE_LLM_CONTENT", raising=False)
    span = MagicMock()
    messages = [SystemMessage("private system"), HumanMessage("private source")]

    with patch("monitoring.llm.sentry_sdk.start_span") as start_span:
        start_span.return_value.__enter__.return_value = span
        with track_llm_stage("interpret", "gemini-2.5-flash", messages) as stage:
            stage.record_first_token()
            stage.record_response("private answer")

    recorded_keys = {call.args[0] for call in span.set_data.call_args_list}
    assert "gen_ai.request.messages" not in recorded_keys
    assert "gen_ai.response.text" not in recorded_keys
    assert "logosai.time_to_first_token_ms" in recorded_keys


def test_stage_records_bounded_content_when_explicitly_enabled(monkeypatch):
    monkeypatch.setenv("SENTRY_CAPTURE_LLM_CONTENT", "true")
    monkeypatch.setenv("SENTRY_LLM_CONTENT_MAX_CHARS", "12")
    span = MagicMock()
    messages = [HumanMessage("private source text")]

    with patch("monitoring.llm.sentry_sdk.start_span") as start_span:
        start_span.return_value.__enter__.return_value = span
        with track_llm_stage("interpret", "gemini-2.5-flash", messages) as stage:
            stage.record_response("private answer text")

    span.set_data.assert_any_call(
        "gen_ai.request.messages",
        [{"role": "user", "content": "private sour…"}],
    )
    span.set_data.assert_any_call("gen_ai.response.text", "private answ…")
    span.set_data.assert_any_call("logosai.llm_content_truncated", True)
