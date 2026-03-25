import json

import pytest
from fastapi.testclient import TestClient

from app import app
from tests.helpers import make_fake_agent


def parse_sse_events(raw: str) -> list[dict]:
    """Parse raw SSE text into a list of {event, data} dicts."""
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
            payload = json.loads("\n".join(data_lines))
            events.append({"event": event_name, "data": payload})
    return events


# ---------------------------------------------------------------------------
# Agent unit tests (analyze_stream)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stream_emits_detect_interpret_done():
    agent = make_fake_agent(chunks=["Bonjour", " monde"])
    events = [ev async for ev in agent.analyze_stream("Bonjour le monde", "EN")]

    stages = [e["stage"] for e in events if e.get("event") == "stage"]
    assert stages == ["detect", "interpret"]

    deltas = [e["delta"] for e in events if e.get("event") == "chunk"]
    assert deltas == ["Bonjour", " monde"]

    done = [e for e in events if e.get("event") == "done"]
    assert len(done) == 1
    assert done[0]["result"] == "Bonjour monde"


@pytest.mark.asyncio
async def test_stream_with_correction():
    agent = make_fake_agent(
        needs_correction=True,
        corrected_text="texte corrigé",
        chunks=["result"],
    )
    events = [ev async for ev in agent.analyze_stream("txte", "EN")]

    stages = [e["stage"] for e in events if e.get("event") == "stage"]
    assert stages == ["detect", "correct", "interpret"]


@pytest.mark.asyncio
async def test_stream_fallback_when_astream_yields_nothing():
    agent = make_fake_agent(chunks=[])
    # astream yields nothing → should fall back to ainvoke
    agent.llm_flash.ainvoke.return_value.content = "fallback result"

    events = [ev async for ev in agent.analyze_stream("hello", "EN")]

    deltas = [e["delta"] for e in events if e.get("event") == "chunk"]
    assert deltas == ["fallback result"]

    done = [e for e in events if e.get("event") == "done"]
    assert done[0]["result"] == "fallback result"


@pytest.mark.asyncio
async def test_stream_raises_when_no_result():
    agent = make_fake_agent(chunks=[])
    agent.llm_flash.ainvoke.return_value.content = ""

    with pytest.raises(ValueError, match="no interpretation generated"):
        async for _ in agent.analyze_stream("hello", "EN"):
            pass


# ---------------------------------------------------------------------------
# API endpoint tests (/api/analyze/stream)
# ---------------------------------------------------------------------------


class TestStreamEndpoint:
    def test_stream_returns_sse_events(self, client):
        resp = client.post(
            "/api/analyze/stream",
            json={"text": "Bonjour", "user_language": "EN"},
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")
        assert resp.headers["cache-control"] == "no-cache, no-transform"

        events = parse_sse_events(resp.text)
        event_types = [e["event"] for e in events]
        assert "stage" in event_types
        assert "chunk" in event_types
        assert "done" in event_types

    def test_stream_done_contains_full_result(self, client):
        resp = client.post(
            "/api/analyze/stream",
            json={"text": "test", "user_language": "EN"},
        )
        events = parse_sse_events(resp.text)
        done = next(e for e in events if e["event"] == "done")
        assert done["data"]["result"] == "Hello world"

    def test_stream_without_api_key_returns_401(self):
        bare_client = TestClient(app)
        resp = bare_client.post(
            "/api/analyze/stream",
            json={"text": "test", "user_language": "EN"},
        )
        assert resp.status_code == 401

    def test_stream_error_yields_error_event(self, client, fake_agent):
        async def failing_stream(_text, _lang):
            yield {"event": "stage", "stage": "detect"}
            raise RuntimeError("LLM exploded")

        fake_agent.analyze_stream = failing_stream

        resp = client.post(
            "/api/analyze/stream",
            json={"text": "test", "user_language": "EN"},
        )
        assert resp.status_code == 200
        events = parse_sse_events(resp.text)
        error = next(e for e in events if e["event"] == "error")
        assert "LLM exploded" in error["data"]["message"]
