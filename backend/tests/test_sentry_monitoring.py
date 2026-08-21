from unittest.mock import patch

from sentry_sdk.integrations.langchain import LangchainIntegration

from monitoring.sentry import init_error_monitoring, scrub_event


def test_scrub_event_removes_request_content_and_sensitive_fields():
    event = {
        "request": {
            "cookies": {"session": "secret"},
            "data": {"text": "private source"},
            "query_string": "document=private",
            "headers": {
                "Accept": "application/json",
                "X-Gemini-Key": "gemini-secret",
            },
        },
        "user": {"ip_address": "127.0.0.1"},
        "extra": {
            "model": "gemini-2.5-flash",
            "prompt": "private prompt",
            "nested": {"api_key": "nested-secret"},
        },
    }

    scrubbed = scrub_event(event, {})

    assert "data" not in scrubbed["request"]
    assert "cookies" not in scrubbed["request"]
    assert "query_string" not in scrubbed["request"]
    assert "user" not in scrubbed
    assert scrubbed["request"]["headers"]["X-Gemini-Key"] == "[Filtered]"
    assert scrubbed["request"]["headers"]["Accept"] == "application/json"
    assert scrubbed["extra"]["prompt"] == "[Filtered]"
    assert scrubbed["extra"]["nested"]["api_key"] == "[Filtered]"
    assert scrubbed["extra"]["model"] == "gemini-2.5-flash"


def test_init_error_monitoring_is_disabled_without_dsn(monkeypatch):
    monkeypatch.delenv("SENTRY_DSN", raising=False)

    with patch("monitoring.sentry.sentry_sdk.init") as sentry_init:
        enabled = init_error_monitoring()

    assert enabled is False
    sentry_init.assert_not_called()


def test_init_error_monitoring_uses_private_low_volume_defaults(monkeypatch):
    monkeypatch.setenv("SENTRY_DSN", "https://public@example.invalid/1")
    monkeypatch.setenv("SENTRY_ENVIRONMENT", "test")
    monkeypatch.setenv("SENTRY_RELEASE", "logosai@test")

    with patch("monitoring.sentry.sentry_sdk.init") as sentry_init:
        enabled = init_error_monitoring()

    assert enabled is True
    sentry_init.assert_called_once()
    options = sentry_init.call_args.kwargs
    assert options["dsn"] == "https://public@example.invalid/1"
    assert options["environment"] == "test"
    assert options["release"] == "logosai@test"
    assert options["send_default_pii"] is False
    assert options["max_request_body_size"] == "never"
    assert options["traces_sample_rate"] == 0.0
    assert options["before_send"] is scrub_event
    assert options["before_send_transaction"] is scrub_event
    assert len(options["integrations"]) == 1
    integration = options["integrations"][0]
    assert isinstance(integration, LangchainIntegration)
    assert integration.include_prompts is False
