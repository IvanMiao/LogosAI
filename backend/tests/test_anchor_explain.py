import json
from unittest.mock import patch

from fastapi.testclient import TestClient

from app import app
from tests.helpers import make_fake_agent


def parse_sse_events(raw: str) -> list[dict]:
    events = []
    for block in raw.split("\n\n"):
        block = block.strip()
        if not block or block.startswith(":"):
            continue
        event_name = "message"
        data_lines = []
        for line in block.splitlines():
            if line.startswith("event:"):
                event_name = line[len("event:") :].strip()
            elif line.startswith("data:"):
                data_lines.append(line[len("data:") :].strip())
        if data_lines:
            events.append(
                {
                    "event": event_name,
                    "data": json.loads("\n".join(data_lines)),
                }
            )
    return events


def anchor_request(model: str = "gemini-2.5-flash") -> dict:
    return {
        "document": {
            "id": "document-1",
            "title": "A test document",
            "text": "Alpha beta gamma.",
        },
        "anchor": {
            "id": "anchor-1",
            "quote": "beta",
            "start_offset": 6,
            "end_offset": 10,
            "scope": "selection",
        },
        "user_language": "EN",
        "model": model,
    }


def anchor_run_request(skill: str = "translate") -> dict:
    return {
        **anchor_request(),
        "skill": skill,
    }


class TestAnchorExplainEndpoint:
    def test_anchor_explain_returns_sse_events(self, client):
        resp = client.post("/api/anchors/explain", json=anchor_request())

        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")

        events = parse_sse_events(resp.text)
        event_types = [event["event"] for event in events]
        assert event_types == ["stage", "stage", "chunk", "chunk", "done"]

    def test_each_sse_event_contains_ids(self, client):
        resp = client.post("/api/anchors/explain", json=anchor_request())
        events = parse_sse_events(resp.text)

        for event in events:
            data = event["data"]
            assert data["request_id"].startswith("request-")
            assert data["trace_id"].startswith("trace-")
            assert data["anchor_id"] == "anchor-1"

    def test_correction_path_is_streamed(self):
        fake_agent = make_fake_agent(needs_correction=True, chunks=["fixed"])
        with patch("routers.routes._require_agent", return_value=fake_agent):
            client = TestClient(app, headers={"X-Gemini-Key": "test-key"})
            resp = client.post("/api/anchors/explain", json=anchor_request())

        events = parse_sse_events(resp.text)
        stages = [
            event["data"]["stage"] for event in events if event["event"] == "stage"
        ]
        assert stages == ["detect", "correct", "interpret"]

    def test_missing_key_returns_401(self):
        bare_client = TestClient(app)
        resp = bare_client.post("/api/anchors/explain", json=anchor_request())

        assert resp.status_code == 401

    def test_unsupported_model_returns_422(self):
        bare_client = TestClient(app, headers={"X-Gemini-Key": "test-key"})
        resp = bare_client.post(
            "/api/anchors/explain",
            json=anchor_request(model="unsupported"),
        )

        assert resp.status_code == 422

    def test_error_event_contains_contract_ids(self, client, fake_agent):
        async def failing_stream(_text, _language):
            yield {"event": "stage", "stage": "detect"}
            raise RuntimeError("LLM exploded")

        fake_agent.analyze_stream = failing_stream
        with patch("routers.routes.capture_exception") as capture_exception:
            resp = client.post("/api/anchors/explain", json=anchor_request())

        events = parse_sse_events(resp.text)
        error = next(event for event in events if event["event"] == "error")

        assert error["data"]["anchor_id"] == "anchor-1"
        assert error["data"]["request_id"].startswith("request-")
        assert error["data"]["trace_id"].startswith("trace-")
        assert "LLM exploded" in error["data"]["message"]
        capture_exception.assert_called_once()

    def test_done_result_equals_joined_chunks(self, client):
        resp = client.post("/api/anchors/explain", json=anchor_request())
        events = parse_sse_events(resp.text)
        chunks = [
            event["data"]["delta"] for event in events if event["event"] == "chunk"
        ]
        done = next(event for event in events if event["event"] == "done")

        assert done["data"]["result"] == "".join(chunks)

    def test_anchor_run_completes_without_optional_telemetry(self, client):
        resp = client.post("/api/anchors/explain", json=anchor_request())
        events = parse_sse_events(resp.text)

        assert resp.status_code == 200
        assert events[-1]["event"] == "done"

    def test_anchor_run_supports_translate(self, client):
        resp = client.post("/api/anchors/run", json=anchor_run_request("translate"))
        events = parse_sse_events(resp.text)
        done = next(event for event in events if event["event"] == "done")

        assert resp.status_code == 200
        assert done["data"]["anchor_id"] == "anchor-1"
        assert done["data"]["result"] == "Hello world"

    def test_anchor_run_rejects_unsupported_skill(self, client):
        resp = client.post("/api/anchors/run", json=anchor_run_request("summarize"))

        assert resp.status_code == 422
