"""POST /ai/analyze-tender — Phase 3A. Mounted at the app root (not under
/api/v1) so the path matches the brief exactly. The gateway is the only
caller; it uploads the private tender document's bytes directly (never a
filesystem path) along with the tenderId/documentId it belongs to.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import ValidationError

from app.pipelines.extraction.pdf_text import EmptyPdfTextError, extract_pages, to_page_aware_text
from app.pipelines.llm.provider import generate_json
from app.pipelines.llm.provider_errors import ProviderTimeoutError, ProviderUnavailableError
from app.pipelines.llm.tender_prompt import build_prompt
from app.schemas.tender_analysis import AnalyzeTenderResponse, ExtractedRequirement

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_PROMPT_CHARS = 12_000  # keeps the prompt inside llama3:8b's context window; see pdf_text.to_page_aware_text


@router.post("/ai/analyze-tender", response_model=AnalyzeTenderResponse)
async def analyze_tender(
    file: UploadFile = File(...),
    tenderId: str = Form(...),
    documentId: str = Form(...),
) -> AnalyzeTenderResponse:
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        pages = extract_pages(file_bytes)
    except EmptyPdfTextError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 — any pypdf failure means "unreadable PDF"
        logger.exception("PDF extraction failed for document %s", documentId)
        raise HTTPException(status_code=422, detail=f"Could not read this PDF: {exc}") from exc

    prompt_text = to_page_aware_text(pages, MAX_PROMPT_CHARS)
    prompt = build_prompt(prompt_text)

    try:
        raw_response = await generate_json(prompt)
    except ProviderUnavailableError as exc:
        raise HTTPException(status_code=503, detail="AI service unavailable. The tender document is still available and requirements can be entered manually.") from exc
    except ProviderTimeoutError as exc:
        raise HTTPException(status_code=504, detail="AI analysis timed out. The tender document is still available and requirements can be entered manually.") from exc

    try:
        parsed = json.loads(raw_response)
    except json.JSONDecodeError as exc:
        logger.error("Model returned non-JSON output: %s", raw_response[:500])
        raise HTTPException(status_code=502, detail="The AI model returned malformed output and could not be parsed. Try again, or enter requirements manually.") from exc

    raw_requirements = parsed.get("requirements") if isinstance(parsed, dict) else None
    if not isinstance(raw_requirements, list):
        raise HTTPException(status_code=502, detail="The AI model's response did not match the expected schema (missing 'requirements' array).")

    validated: list[ExtractedRequirement] = []
    dropped = 0
    for i, item in enumerate(raw_requirements):
        try:
            validated.append(ExtractedRequirement.model_validate(item))
        except ValidationError as exc:
            dropped += 1
            logger.warning("Dropping requirement %d — failed validation: %s", i, exc)

    if not validated and dropped > 0:
        raise HTTPException(status_code=502, detail="The AI model proposed requirements but none matched the required schema. Try again, or enter requirements manually.")

    return AnalyzeTenderResponse(
        documentId=documentId,
        status="completed",
        requirements=validated,
        pageCount=len(pages),
        droppedCount=dropped,
    )
