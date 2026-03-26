from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app import app
from tests.helpers import make_fake_agent


@pytest.fixture()
def fake_agent():
    return make_fake_agent()


@pytest.fixture()
def client(fake_agent):
    with patch("routers.routes._require_agent", return_value=fake_agent):
        yield TestClient(app, headers={"X-Gemini-Key": "test-key"})
