import pytest
from fastapi.testclient import TestClient

from app import app
from service import AnalysisService, get_analysis_service
from tests.helpers import make_fake_agent


@pytest.fixture()
def fake_agent():
    return make_fake_agent()


@pytest.fixture()
def fake_service(fake_agent):
    service = object.__new__(AnalysisService)
    service.settings = {"gemini_api_key": "test-key", "model": "gemini-2.5-flash"}
    service.agent = fake_agent
    return service


@pytest.fixture()
def client(fake_service):
    app.dependency_overrides[get_analysis_service] = lambda: fake_service
    yield TestClient(app)
    app.dependency_overrides.clear()
