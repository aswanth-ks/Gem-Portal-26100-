"""Tests 2 & 11: Ollama connectivity check, and graceful handling when
Ollama is unreachable (never a raw 500/crash)."""

import httpx
import pytest

from app.pipelines.llm.ollama_client import OllamaUnavailableError, check_connectivity, generate_json


@pytest.mark.asyncio
async def test_generate_json_raises_clear_error_when_ollama_unreachable(monkeypatch):
    async def fake_post(*_args, **_kwargs):
        raise httpx.ConnectError("connection refused")

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    with pytest.raises(OllamaUnavailableError):
        await generate_json("irrelevant prompt")


@pytest.mark.asyncio
async def test_check_connectivity_reports_unreachable_gracefully(monkeypatch):
    async def fake_get(*_args, **_kwargs):
        raise httpx.ConnectError("connection refused")

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    reachable, error = await check_connectivity()
    assert reachable is False
    assert error is not None


@pytest.mark.asyncio
async def test_check_connectivity_against_real_local_ollama():
    """Live integration check (test 2) — skipped gracefully if Ollama isn't
    running in this environment rather than failing the whole suite."""
    reachable, _ = await check_connectivity()
    if not reachable:
        pytest.skip("Ollama is not running locally — live connectivity not verifiable in this environment.")
    assert reachable is True
