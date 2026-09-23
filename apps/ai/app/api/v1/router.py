"""Top-level API router for v1. Mounts domain routers.

TODO: mount endpoint routers as they are implemented, e.g.:
    from app.api.v1.endpoints import documents, intelligence, verification
    api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
"""

from fastapi import APIRouter

api_router = APIRouter()
