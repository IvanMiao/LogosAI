from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from google.ai.generativelanguage_v1beta.types import GenerationConfig
from langchain_core.messages import HumanMessage

from app import app
from llm.agent import TextAnalysisLangchain
from tests.helpers import make_fake_agent


@pytest.mark.parametrize(
    "endpoint",
    ["/api/analyze", "/api/analyze/stream", "/api/anchors/explain", "/api/anchors/run"],
)
def test_gemini_4_reaches_agent_for_every_analysis_contract(endpoint):
    body = {"text": "Alpha beta gamma.", "model": "gemini-4-argon"}
    if endpoint.startswith("/api/anchors/"):
        body = {
            "model": "gemini-4-argon",
            "document": {"id": "document-1", "text": "Alpha beta gamma."},
            "anchor": {
                "id": "anchor-1",
                "quote": "beta",
                "start_offset": 6,
                "end_offset": 10,
                "scope": "selection",
            },
            **({"skill": "explain"} if endpoint.endswith("/run") else {}),
        }
    agent = make_fake_agent()
    agent.model = "gemini-4-argon"
    with patch("routers.routes.TextAnalysisLangchain", return_value=agent) as factory:
        response = TestClient(app).post(
            endpoint, json=body, headers={"X-Gemini-Key": "test-key"}
        )

    assert response.status_code == 200
    factory.assert_called_once_with(gemini_key="test-key", model="gemini-4-argon")
    if endpoint == "/api/analyze":
        assert response.json() == {
            "result": "Hello world",
            "success": True,
            "error": None,
        }
    else:
        assert "event: done" in response.text
        assert '"result": "Hello world"' in response.text


def test_gemini_4_serializes_without_sampling_or_thinking_budget_overrides():
    agent = TextAnalysisLangchain("test-key", model="gemini-4-argon")
    model = agent.llm_flash
    request = model.bound._prepare_request(
        [HumanMessage("Explain this passage.")], **model.kwargs
    )
    config = GenerationConfig.to_dict(
        request.generation_config, always_print_fields_with_no_presence=False
    )

    assert request.model == "models/gemini-4-argon"
    assert config["max_output_tokens"] == 32768
    assert not {"temperature", "top_p", "top_k", "thinking_config"} & config.keys()
    assert model.bound.timeout == 1200
    assert agent.llm_lite.model == "models/gemini-2.5-flash-lite"
    assert agent.llm_lite.temperature == 0


@pytest.mark.parametrize("model", ["gemini-2.5-flash", "gemini-2.5-pro"])
def test_existing_models_keep_their_generation_settings(model):
    agent = TextAnalysisLangchain("test-key", model=model)
    request = agent.llm_flash._prepare_request([HumanMessage("Explain.")])
    config = GenerationConfig.to_dict(
        request.generation_config, always_print_fields_with_no_presence=False
    )

    assert request.model == f"models/{model}"
    assert config["temperature"] == pytest.approx(0.3)
    assert "max_output_tokens" not in config
