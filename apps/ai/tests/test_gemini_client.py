"""Phase 4.5 — Gemini client tests. All mocked; no real Gemini API calls in
the automated suite (see the Phase 4.5 report for the one real manual test)."""

import pytest

from app.core.config import get_settings
from app.pipelines.llm import gemini_client
from app.pipelines.llm.provider_errors import ProviderTimeoutError, ProviderUnavailableError


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _configure(monkeypatch, api_key="test-key"):
    monkeypatch.setenv("GEMINI_API_KEY", api_key or "")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-flash-lite")


class _FakeResponse:
    def __init__(self, text):
        self.text = text


class _FakeModels:
    def __init__(self, result=None, error=None):
        self._result = result
        self._error = error

    async def generate_content(self, **_kwargs):
        if self._error:
            raise self._error
        return self._result


class _FakeAio:
    def __init__(self, models):
        self.models = models


class _FakeClient:
    def __init__(self, result=None, error=None):
        self.aio = _FakeAio(_FakeModels(result=result, error=error))


def test_gemini_success_returns_text(monkeypatch):
    _configure(monkeypatch)
    fake = _FakeClient(result=_FakeResponse('{"requirements": []}'))
    monkeypatch.setattr(gemini_client.genai, "Client", lambda **_kw: fake)

    import asyncio

    text = asyncio.run(gemini_client.generate_json("prompt"))
    assert text == '{"requirements": []}'


def test_gemini_missing_api_key_raises_without_network_call(monkeypatch):
    _configure(monkeypatch, api_key="")

    called = False

    def fail_if_called(**_kw):
        nonlocal called
        called = True
        raise AssertionError("should not construct a client without an API key")

    monkeypatch.setattr(gemini_client.genai, "Client", fail_if_called)

    import asyncio

    with pytest.raises(ProviderUnavailableError):
        asyncio.run(gemini_client.generate_json("prompt"))
    assert called is False


def test_gemini_sdk_exception_raises_provider_unavailable(monkeypatch):
    _configure(monkeypatch)
    fake = _FakeClient(error=RuntimeError("boom"))
    monkeypatch.setattr(gemini_client.genai, "Client", lambda **_kw: fake)

    import asyncio

    with pytest.raises(ProviderUnavailableError):
        asyncio.run(gemini_client.generate_json("prompt"))


def test_gemini_timeout_raises_provider_timeout(monkeypatch):
    _configure(monkeypatch)

    class _SlowModels:
        async def generate_content(self, **_kwargs):
            import asyncio as _asyncio

            await _asyncio.sleep(10)

    class _SlowClient:
        def __init__(self):
            self.aio = _FakeAio(_SlowModels())

    monkeypatch.setattr(gemini_client.genai, "Client", lambda **_kw: _SlowClient())
    monkeypatch.setenv("GEMINI_TIMEOUT_SECONDS", "0.05")

    import asyncio

    with pytest.raises(ProviderTimeoutError):
        asyncio.run(gemini_client.generate_json("prompt"))


def test_gemini_empty_response_returns_empty_string(monkeypatch):
    _configure(monkeypatch)
    fake = _FakeClient(result=_FakeResponse(None))
    monkeypatch.setattr(gemini_client.genai, "Client", lambda **_kw: fake)

    import asyncio

    text = asyncio.run(gemini_client.generate_json("prompt"))
    assert text == ""
