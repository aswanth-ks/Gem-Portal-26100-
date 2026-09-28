"""Test 4 & schema-related parts of test 5/6: the ExtractedRequirement schema
accepts a well-formed LLM proposal and rejects invalid categories/confidence,
and null page/clause are accepted (the model must not hallucinate them)."""

import pytest
from pydantic import ValidationError

from app.schemas.tender_analysis import ExtractedRequirement


def _valid_payload(**overrides):
    payload = {
        "code": "REQ-001",
        "title": "Minimum Average Annual Turnover",
        "description": "The bidder shall have an average annual turnover of not less than INR 50 lakh.",
        "category": "financial",
        "mandatory": True,
        "conditional": False,
        "evidenceTypes": ["CA_CERTIFICATE", "AUDITED_FINANCIAL_STATEMENTS"],
        "source": {"documentPage": 4, "clause": "5.4", "excerpt": "..."},
        "confidence": 0.96,
    }
    payload.update(overrides)
    return payload


def test_valid_requirement_parses():
    req = ExtractedRequirement.model_validate(_valid_payload())
    assert req.code == "REQ-001"
    assert req.category == "financial"
    assert req.source.documentPage == 4


def test_null_page_and_clause_are_accepted_not_hallucinated():
    req = ExtractedRequirement.model_validate(_valid_payload(source={"documentPage": None, "clause": None, "excerpt": "..."}))
    assert req.source.documentPage is None
    assert req.source.clause is None


def test_invalid_category_rejected():
    with pytest.raises(ValidationError):
        ExtractedRequirement.model_validate(_valid_payload(category="not_a_real_category"))


def test_confidence_out_of_range_rejected():
    with pytest.raises(ValidationError):
        ExtractedRequirement.model_validate(_valid_payload(confidence=1.5))
    with pytest.raises(ValidationError):
        ExtractedRequirement.model_validate(_valid_payload(confidence=-0.1))


def test_missing_required_field_rejected():
    payload = _valid_payload()
    del payload["title"]
    with pytest.raises(ValidationError):
        ExtractedRequirement.model_validate(payload)
