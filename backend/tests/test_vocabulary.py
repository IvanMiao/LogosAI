from fastapi.testclient import TestClient

from app import app


class TestVocabularyEndpoint:
    def test_extract_vocabulary_success(self, client):
        response = client.post(
            "/api/vocabulary/extract",
            json={"text": "Le gouvernement a dévoilé une série de mesures."},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert len(payload["items"]) == 1
        assert payload["items"][0]["term"] == "dévoiler"

    def test_extract_vocabulary_respects_max_items(self, client, fake_agent):
        fake_agent.extract_learning_vocabulary = (
            lambda _text, max_items=10, user_language="EN": [
            {
                "term": f"item-{index}",
                "sentence": "sample sentence",
                "context_meaning": "语境义",
                "dictionary_meaning": "词典义",
            }
            for index in range(max_items)
            ]
        )

        response = client.post(
            "/api/vocabulary/extract",
            json={"text": "text", "max_items": 3},
        )

        assert response.status_code == 200
        payload = response.json()
        assert len(payload["items"]) == 3

    def test_extract_vocabulary_passes_user_language(self, client, fake_agent):
        captured: dict[str, str] = {}

        def _capture(_text: str, max_items: int = 10, user_language: str = "EN"):
            captured["user_language"] = user_language
            return [
                {
                    "term": "mot",
                    "sentence": "Ceci est une phrase.",
                    "context_meaning": "语境义",
                    "dictionary_meaning": "词典义",
                }
            ][:max_items]

        fake_agent.extract_learning_vocabulary = _capture

        response = client.post(
            "/api/vocabulary/extract",
            json={"text": "text", "user_language": "JA"},
        )

        assert response.status_code == 200
        assert captured["user_language"] == "JA"

    def test_extract_vocabulary_missing_api_key_returns_401(self):
        bare_client = TestClient(app)
        response = bare_client.post(
            "/api/vocabulary/extract",
            json={"text": "test"},
        )

        assert response.status_code == 401
