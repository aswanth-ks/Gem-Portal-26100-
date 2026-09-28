"""Phase 3A — request/response contracts for POST /ai/analyze-tender.

The model extracts requirements; it never decides compliance and never
receives arbitrary filesystem paths (see app/api/analyze.py — the gateway
uploads file bytes, this service never reads from disk on its own).
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

ALLOWED_CATEGORIES = {
    "statutory",
    "financial",
    "technical",
    "experience",
    "commercial",
    "contractual",
    "tender_specific",
    "other",
}


class PageText(BaseModel):
    page: int
    text: str


class RequirementSource(BaseModel):
    documentPage: int | None = None
    clause: str | None = None
    excerpt: str = ""


class ExtractedRequirement(BaseModel):
    code: str
    title: str
    description: str
    category: str
    mandatory: bool = True
    conditional: bool = False
    evidenceTypes: list[str] = Field(default_factory=list)
    source: RequirementSource
    confidence: float

    @field_validator("category")
    @classmethod
    def category_must_be_allowed(cls, v: str) -> str:
        if v not in ALLOWED_CATEGORIES:
            raise ValueError(f"category '{v}' is not one of {sorted(ALLOWED_CATEGORIES)}")
        return v

    @field_validator("confidence")
    @classmethod
    def confidence_in_range(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("confidence must be between 0 and 1")
        return v


class RawLLMRequirements(BaseModel):
    """What we ask Llama to return — validated before anything downstream
    ever sees it. A requirement that fails validation is dropped, not
    silently coerced (see analyze.py's per-item validation loop)."""

    requirements: list[dict] = Field(default_factory=list)


class AnalyzeTenderResponse(BaseModel):
    documentId: str
    status: Literal["completed"] = "completed"
    requirements: list[ExtractedRequirement]
    pageCount: int
    droppedCount: int = 0  # requirements the LLM proposed that failed validation
