"""Provider selection seam (Phase 4.5). `analyze.py` and `propose_rule.py`
import `generate_json` from here — not from `ollama_client` or
`gemini_client` directly — so which provider actually runs is decided in
exactly one place, by one explicit env var (`AI_PROVIDER`). No automatic
silent fallback: if the configured provider fails, that failure is real and
visible, not masked by quietly trying the other one.
"""

from __future__ import annotations

from app.core.config import get_settings
from app.pipelines.llm import gemini_client, ollama_client


async def generate_json(prompt: str) -> str:
    settings = get_settings()
    if settings.ai_provider == "gemini":
        return await gemini_client.generate_json(prompt)
    return await ollama_client.generate_json(prompt)


async def check_connectivity() -> tuple[bool, str | None]:
    settings = get_settings()
    if settings.ai_provider == "gemini":
        return await gemini_client.check_connectivity()
    return await ollama_client.check_connectivity()


def active_provider_info() -> dict:
    settings = get_settings()
    if settings.ai_provider == "gemini":
        return {"provider": "gemini", "model": settings.gemini_model}
    return {"provider": "ollama", "model": settings.ollama_model}
