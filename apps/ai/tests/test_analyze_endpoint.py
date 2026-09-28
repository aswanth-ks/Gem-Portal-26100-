"""Test 5: malformed LLM JSON is rejected with a clear error, not silently
swallowed into an empty requirements list. Uses the real CPCL tender PDF as
the uploaded file so extraction itself succeeds — only the LLM call is
mocked, isolating exactly what's under test."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
import app.api.analyze as analyze_module

REAL_TENDER_PDF = Path(__file__).resolve().parents[3] / "docs" / "Tender_document" / "CPCL_PROC_2026_041_CCTV_Tender.pdf"

client = TestClient(app)


def _upload():
    return client.post(
        "/ai/analyze-tender",
        data={"tenderId": "t1", "documentId": "d1"},
        files={"file": ("tender.pdf", REAL_TENDER_PDF.read_bytes(), "application/pdf")},
    )


def test_malformed_llm_json_returns_502(monkeypatch):
    async def fake_generate_json(_prompt: str) -> str:
        return "this is not json at all"

    monkeypatch.setattr(analyze_module, "generate_json", fake_generate_json)
    resp = _upload()
    assert resp.status_code == 502
    assert "malformed" in resp.json()["detail"].lower()


def test_missing_requirements_key_returns_502(monkeypatch):
    async def fake_generate_json(_prompt: str) -> str:
        return '{"something_else": []}'

    monkeypatch.setattr(analyze_module, "generate_json", fake_generate_json)
    resp = _upload()
    assert resp.status_code == 502


def test_valid_llm_response_is_accepted(monkeypatch):
    async def fake_generate_json(_prompt: str) -> str:
        return (
            '{"requirements": [{"code": "REQ-001", "title": "Turnover", '
            '"description": "Average annual turnover >= 50 lakh.", "category": "financial", '
            '"mandatory": true, "conditional": false, "evidenceTypes": ["CA_CERTIFICATE"], '
            '"source": {"documentPage": 4, "clause": "5.4", "excerpt": "..."}, "confidence": 0.9}]}'
        )

    monkeypatch.setattr(analyze_module, "generate_json", fake_generate_json)
    resp = _upload()
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "completed"
    assert len(body["requirements"]) == 1
    assert body["requirements"][0]["code"] == "REQ-001"


def test_partially_invalid_items_are_dropped_not_fatal(monkeypatch):
    async def fake_generate_json(_prompt: str) -> str:
        return (
            '{"requirements": ['
            '{"code": "REQ-001", "title": "Good", "description": "d", "category": "financial", '
            '"source": {"documentPage": 1, "clause": null, "excerpt": "x"}, "confidence": 0.8},'
            '{"code": "REQ-002", "title": "Bad category", "description": "d", "category": "not_real", '
            '"source": {"documentPage": 1, "clause": null, "excerpt": "x"}, "confidence": 0.8}'
            ']}'
        )

    monkeypatch.setattr(analyze_module, "generate_json", fake_generate_json)
    resp = _upload()
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["requirements"]) == 1
    assert body["droppedCount"] == 1
