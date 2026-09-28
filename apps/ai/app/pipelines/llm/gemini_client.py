"""Thin client for the Gemini API via Google's official `google-genai` SDK.
Mirrors ollama_client.py's shape exactly (`generate_json`, `check_connectivity`)
so `provider.py` can dispatch to either with no caller-visible difference.

The API key lives only in server-side config (env/.env) and is never logged,
never returned in a response, and never referenced anywhere in the frontend.
"""

from __future__ import annotations

import asyncio

from google import genai
from google.genai import errors as genai_errors

from app.core.config import get_settings
from app.pipelines.llm.provider_errors import ProviderTimeoutError, ProviderUnavailableError


def _client() -> genai.Client:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise ProviderUnavailableError("GEMINI_API_KEY is not configured.")
    return genai.Client(api_key=settings.gemini_api_key)


async def generate_json(prompt: str) -> str:
    settings = get_settings()
    client = _client()

    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config={"response_mime_type": "application/json", "temperature": 0.1},
            ),
            timeout=settings.gemini_timeout_seconds,
        )
    except asyncio.TimeoutError as exc:
        raise ProviderTimeoutError(f"Gemini did not respond within {settings.gemini_timeout_seconds}s.") from exc
    except genai_errors.APIError as exc:
        # Never include the API key or auth header — exc.message is Google's
        # own sanitized error text, safe to log and to surface (via the
        # gateway's already-sanitizing catch) to the browser.
        raise ProviderUnavailableError(f"Gemini API error ({getattr(exc, 'code', 'unknown')}): {getattr(exc, 'message', str(exc))}") from exc
    except Exception as exc:  # noqa: BLE001 — any other SDK/network failure means "provider unavailable"
        raise ProviderUnavailableError(f"Could not reach Gemini: {exc}") from exc

    text = getattr(response, "text", None)
    return text or ""


async def check_connectivity() -> tuple[bool, str | None]:
    """Used by /health. A minimal real call (not just "is the key set") —
    lets /health actually detect an invalid key or a Gemini-side outage."""
    settings = get_settings()
    if not settings.gemini_api_key:
        return False, "GEMINI_API_KEY is not configured."
    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        await asyncio.wait_for(
            client.aio.models.generate_content(
                model=settings.gemini_model,
                contents="Reply with the single word: ok",
            ),
            timeout=20.0,  # first real network call can be slow (DNS/TLS handshake); 10s was producing false negatives
        )
        return True, None
    except asyncio.TimeoutError:
        return False, "Gemini connectivity check timed out after 20s."
    except Exception as exc:  # noqa: BLE001 — health check, any failure just means "not reachable"
        return False, str(exc) or repr(exc)
