"""Phase 4.5 — confirms AI_PROVIDER actually routes to the right client, and
that /health reports the active provider correctly."""

import pytest

from app.core.config import get_settings
from app.pipelines.llm import gemini_client, ollama_client, provider


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_gemini_provider_routes_to_gemini_client(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "gemini")

    async def fake_gemini(_prompt):
        return "from-gemini"

    async def fail_ollama(_prompt):
        raise AssertionError("should not call ollama when AI_PROVIDER=gemini")

    monkeypatch.setattr(gemini_client, "generate_json", fake_gemini)
    monkeypatch.setattr(ollama_client, "generate_json", fail_ollama)

    result = await provider.generate_json("prompt")
    assert result == "from-gemini"


@pytest.mark.asyncio
async def test_ollama_provider_routes_to_ollama_client(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "ollama")

    async def fake_ollama(_prompt):
        return "from-ollama"

    async def fail_gemini(_prompt):
        raise AssertionError("should not call gemini when AI_PROVIDER=ollama")

    monkeypatch.setattr(ollama_client, "generate_json", fake_ollama)
    monkeypatch.setattr(gemini_client, "generate_json", fail_gemini)

    result = await provider.generate_json("prompt")
    assert result == "from-ollama"


def test_active_provider_info_gemini(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    info = provider.active_provider_info()
    assert info == {"provider": "gemini", "model": "gemini-2.5-flash-lite"}


def test_active_provider_info_ollama(monkeypatch):
    # Explicit, not "absence of AI_PROVIDER" — the real .env (used outside
    # tests) sets AI_PROVIDER=gemini, so relying on it being unset would be
    # order-dependent on whatever the environment happens to have.
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    monkeypatch.setenv("OLLAMA_MODEL", "llama3:8b")
    info = provider.active_provider_info()
    assert info == {"provider": "ollama", "model": "llama3:8b"}
