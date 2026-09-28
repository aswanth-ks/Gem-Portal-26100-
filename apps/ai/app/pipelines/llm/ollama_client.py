"""Thin client for the local Ollama HTTP API. Never spawns the `ollama` CLI,
and this is the only thing in the whole system that talks to Ollama — the
browser and the gateway never reach it directly (see the Phase 3A report's
security section)."""

from __future__ import annotations

import httpx

from app.core.config import get_settings
from app.pipelines.llm.provider_errors import ProviderTimeoutError, ProviderUnavailableError


class OllamaUnavailableError(ProviderUnavailableError):
    """Ollama isn't reachable, or the configured model isn't installed."""


class OllamaTimeoutError(ProviderTimeoutError):
    """The model didn't respond within the configured timeout."""


async def generate_json(prompt: str) -> str:
    settings = get_settings()
    url = f"{settings.ollama_base_url.rstrip('/')}/api/generate"
    payload = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {"temperature": 0.1},
    }
    try:
        async with httpx.AsyncClient(timeout=settings.ollama_timeout_seconds) as client:
            resp = await client.post(url, json=payload)
    except httpx.ConnectError as exc:
        raise OllamaUnavailableError(f"Could not reach Ollama at {settings.ollama_base_url}. Is it running?") from exc
    except httpx.TimeoutException as exc:
        raise OllamaTimeoutError(f"Ollama did not respond within {settings.ollama_timeout_seconds}s.") from exc

    if resp.status_code == 404:
        raise OllamaUnavailableError(f"Model '{settings.ollama_model}' is not available on this Ollama instance. Run `ollama pull {settings.ollama_model}`.")
    resp.raise_for_status()

    data = resp.json()
    return data.get("response", "")


async def check_connectivity() -> tuple[bool, str | None]:
    """Used by /health. Returns (reachable, error_message)."""
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.ollama_base_url.rstrip('/')}/api/tags")
        resp.raise_for_status()
        return True, None
    except Exception as exc:  # noqa: BLE001 — health check, any failure just means "not reachable"
        return False, str(exc)
