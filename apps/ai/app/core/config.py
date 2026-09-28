"""Application settings loaded from environment variables.

TODO: expand with all AI-service-specific settings (model endpoints, API
keys for Llama 3 / Bhashini, MongoDB URI, etc.) as they are implemented.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings

# Loads the repo-root .env explicitly (not a bare ".env", which would only
# resolve if the process happened to be started with CWD = apps/ai) — same
# fix already applied on the gateway side (apps/gateway/src/config/env.ts)
# so both backend services read the one real .env regardless of CWD.
_REPO_ROOT_ENV = Path(__file__).resolve().parents[4] / ".env"


class Settings(BaseSettings):
    app_env: str = "development"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "gem_portal"

    # Phase 4.5 — explicit provider selection, no automatic fallback (a
    # silent Gemini->Ollama switch would hide real failures during a demo).
    # Defaults to "ollama" so any environment that doesn't set this
    # explicitly keeps working exactly as it did before Gemini existed.
    ai_provider: Literal["gemini", "ollama"] = "ollama"

    # Phase 3A — local Ollama runtime. The AI service talks to Ollama's HTTP
    # API directly (never spawns the `ollama` CLI, never lets the browser or
    # gateway reach Ollama directly — see app/pipelines/llm/ollama_client.py).
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3:8b"
    # Local CPU inference of llama3:8b on a ~12K-char prompt can take several
    # minutes on modest hardware — this is generous on purpose, not a bug.
    ollama_timeout_seconds: float = 600.0

    # Phase 4.5 — Gemini (primary provider when ai_provider == "gemini").
    # The key lives only here (server-side, from env/.env) — never logged,
    # never returned by any API, never referenced by the frontend.
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash-lite"
    gemini_timeout_seconds: float = 120.0

    class Config:
        env_file = str(_REPO_ROOT_ENV)
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
