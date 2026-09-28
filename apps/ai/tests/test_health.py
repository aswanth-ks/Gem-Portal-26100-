"""Smoke test to keep the service buildable/testable from the start."""

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

client = TestClient(app)


def test_health(monkeypatch):
    # Pinned to Ollama explicitly: the real .env (used outside tests) may set
    # AI_PROVIDER=gemini, and Gemini's connectivity check makes a real network
    # call — this test must never depend on that or hit the real API.
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    get_settings.cache_clear()
    try:
        response = client.get("/health")
    finally:
        get_settings.cache_clear()
    assert response.status_code == 200
    body = response.json()
    assert body["status"] in ("ok", "degraded")
    assert body["provider"] == "ollama"
    assert body["model"] == "llama3:8b"
    assert "provider_reachable" in body
