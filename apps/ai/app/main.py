"""FastAPI application entry point.

Keeps only app wiring here (middleware, router mounting, startup/shutdown
hooks). Route handlers live under app/api/, business logic under
app/services/, AI pipelines under app/pipelines/. Do NOT put AI logic
directly in route handlers.
"""

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.api.analyze import router as analyze_router
from app.api.propose_rule import router as propose_rule_router
from app.api.extract_document import router as extract_document_router
from app.pipelines.llm.provider import active_provider_info, check_connectivity

app = FastAPI(title="GeM Portal AI Service", version="0.1.0")

app.include_router(api_router, prefix="/api/v1")
app.include_router(analyze_router)  # mounted at root — POST /ai/analyze-tender
app.include_router(propose_rule_router)  # mounted at root — POST /ai/propose-rule
app.include_router(extract_document_router)  # mounted at root — POST /ai/extract-document


@app.get("/health")
async def health() -> dict:
    reachable, error = await check_connectivity()
    return {
        "status": "ok" if reachable else "degraded",
        **active_provider_info(),
        "provider_reachable": reachable,
        **({"error": error} if error is not None else {}),
    }
