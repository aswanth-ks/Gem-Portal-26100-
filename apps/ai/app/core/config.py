"""Application settings loaded from environment variables.

TODO: expand with all AI-service-specific settings (model endpoints, API
keys for Llama 3 / Bhashini, MongoDB URI, etc.) as they are implemented.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_env: str = "development"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "gem_portal"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
