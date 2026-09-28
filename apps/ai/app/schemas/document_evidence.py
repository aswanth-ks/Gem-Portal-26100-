"""Phase 5 — bidder document classification + structured evidence extraction.

The model classifies one bidder-uploaded document and extracts named fields
from it. It never decides compliance: no PASS/FAIL/REVIEW/score, no validity
determination, no government verification claim. Ambiguous/incomplete
extractions are marked `review_required` rather than guessed."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

DOCUMENT_TYPES = {
    "CA_CERTIFICATE",
    "PAN",
    "GST_CERTIFICATE",
    "EXPERIENCE_CERTIFICATE",
    "OEM_AUTHORIZATION",
    "UNSUPPORTED",
}

EVIDENCE_STATUSES = {"extracted", "review_required"}


class EvidenceField(BaseModel):
    field: str  # e.g. "FY2023-24_turnover", "pan_number", "expiry_date"
    value: str  # the raw/display value as it appears in the document
    normalizedValue: str | int | float | bool | None = None  # e.g. 4200000 for "₹42,00,000"
    sourcePage: int | None = None
    sourceText: str = ""  # the exact sentence/line the value was read from
    confidence: float
    status: str  # "extracted" | "review_required"

    @field_validator("status")
    @classmethod
    def status_must_be_supported(cls, v: str) -> str:
        if v not in EVIDENCE_STATUSES:
            raise ValueError(f"status '{v}' is not one of {sorted(EVIDENCE_STATUSES)}")
        return v

    @field_validator("confidence")
    @classmethod
    def confidence_in_range(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("confidence must be between 0 and 1")
        return v


class ExtractDocumentResponse(BaseModel):
    documentType: str
    classificationConfidence: float
    fields: list[EvidenceField] = Field(default_factory=list)
    pageCount: int

    @field_validator("documentType")
    @classmethod
    def document_type_must_be_supported(cls, v: str) -> str:
        if v not in DOCUMENT_TYPES:
            raise ValueError(f"documentType '{v}' is not one of {sorted(DOCUMENT_TYPES)}")
        return v

    @field_validator("classificationConfidence")
    @classmethod
    def classification_confidence_in_range(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("classificationConfidence must be between 0 and 1")
        return v
