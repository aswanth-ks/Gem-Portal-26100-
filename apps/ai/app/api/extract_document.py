"""POST /ai/extract-document — Phase 5. Same pattern as /ai/analyze-tender:
mounted at root, gateway uploads the private document's bytes directly
(never a filesystem path), reuses the existing pdf_text extraction pipeline
and the provider abstraction (Gemini or Ollama per AI_PROVIDER) — no second
AI client, no separate pipeline.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import ValidationError

from app.pipelines.extraction.pdf_text import EmptyPdfTextError, extract_pages, to_page_aware_text
from app.pipelines.llm.document_prompt import build_prompt
from app.pipelines.llm.provider import generate_json
from app.pipelines.llm.provider_errors import ProviderTimeoutError, ProviderUnavailableError
from app.schemas.document_evidence import ExtractDocumentResponse

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_PROMPT_CHARS = 10_000  # bidder evidence documents are short (certificates, letters) — smaller than tender PDFs


@router.post("/ai/extract-document", response_model=ExtractDocumentResponse)
async def extract_document(file: UploadFile = File(...)) -> ExtractDocumentResponse:
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        pages = extract_pages(file_bytes)
    except EmptyPdfTextError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 — any pypdf failure means "unreadable PDF"
        logger.exception("PDF extraction failed for uploaded document")
        raise HTTPException(status_code=422, detail=f"Could not read this PDF: {exc}") from exc

    prompt_text = to_page_aware_text(pages, MAX_PROMPT_CHARS)
    prompt = build_prompt(prompt_text)

    try:
        raw_response = await generate_json(prompt)
    except ProviderUnavailableError as exc:
        raise HTTPException(status_code=503, detail="AI service unavailable. The document is still stored and can be reviewed manually.") from exc
    except ProviderTimeoutError as exc:
        raise HTTPException(status_code=504, detail="Document analysis timed out. The document is still stored and can be reviewed manually.") from exc

    try:
        parsed = json.loads(raw_response)
    except json.JSONDecodeError as exc:
        logger.error("Model returned non-JSON output for extract-document: %s", raw_response[:500])
        raise HTTPException(status_code=502, detail="The AI model returned malformed output and could not be parsed.") from exc

    if not isinstance(parsed, dict):
        raise HTTPException(status_code=502, detail="The AI model's response did not match the expected schema.")

    # Unlike tender-requirement extraction (a list of independent items where
    # we can drop individually-invalid ones), a document classification is a
    # single object — if it doesn't validate, there is nothing safe to
    # partially salvage, so the whole extraction is rejected.
    try:
        result = ExtractDocumentResponse.model_validate(parsed)
    except ValidationError as exc:
        logger.warning("Document extraction failed schema validation: %s", exc)
        raise HTTPException(status_code=502, detail="The AI model's response did not match the required schema.") from exc

    return result
