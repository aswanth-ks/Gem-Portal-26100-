"""FastAPI application entry point.

Keeps only app wiring here (middleware, router mounting, startup/shutdown
hooks). Route handlers live under app/api/, business logic under
app/services/, AI pipelines under app/pipelines/. Do NOT put AI logic
directly in route handlers.
"""

from fastapi import FastAPI

from app.core.config import get_settings
from app.api.v1.router import api_router

settings = get_settings()

app = FastAPI(title="GeM Portal AI Service", version="0.1.0")

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "ai"}
