from unittest.mock import patch

from fastapi.testclient import TestClient

from app import app


def valid_analysis_request() -> dict[str, str]:
    return {
        "text": "A short source text.",
        "user_language": "en",
        "model": "gemini-2.5-flash",
    }


def test_gateway_secret_rejects_direct_api_requests(monkeypatch) -> None:
    monkeypatch.setenv("LOGOSAI_GATEWAY_SECRET", "worker-shared-secret")
    client = TestClient(app, headers={"X-Gemini-Key": "test-key"})

    response = client.post("/api/analyze", json=valid_analysis_request())

    assert response.status_code == 401
    assert response.json()["detail"] == (
        "This API endpoint is available through the LogosAI gateway."
    )


def test_gateway_secret_accepts_worker_request(monkeypatch, fake_agent) -> None:
    monkeypatch.setenv("LOGOSAI_GATEWAY_SECRET", "worker-shared-secret")
    fake_agent.graph.invoke.return_value = {"interpretation": "Analysis result."}
    client = TestClient(
        app,
        headers={
            "X-Gemini-Key": "test-key",
            "X-LogosAI-Gateway": "worker-shared-secret",
        },
    )

    with patch("routers.routes._require_agent", return_value=fake_agent):
        response = client.post("/api/analyze", json=valid_analysis_request())

    assert response.status_code == 200
    assert response.json()["success"] is True
