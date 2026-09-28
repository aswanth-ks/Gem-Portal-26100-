"""Phase 5 tests: classification + extraction for each MVP document type,
plus malformed/invalid-response handling. Uses the real CPCL tender PDF as
the uploaded file so PDF extraction itself succeeds — only the LLM call is
mocked, isolating exactly what's under test (same pattern as
test_analyze_endpoint.py)."""

from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
import app.api.extract_document as extract_document_module

REAL_PDF = Path(__file__).resolve().parents[3] / "docs" / "Tender_document" / "CPCL_PROC_2026_041_CCTV_Tender.pdf"

client = TestClient(app)


def _upload():
    return client.post(
        "/ai/extract-document",
        files={"file": ("evidence.pdf", REAL_PDF.read_bytes(), "application/pdf")},
    )


def _mock(monkeypatch, response_json: str):
    async def fake_generate_json(_prompt: str) -> str:
        return response_json

    monkeypatch.setattr(extract_document_module, "generate_json", fake_generate_json)


def test_ca_certificate_extraction(monkeypatch):
    _mock(
        monkeypatch,
        '{"documentType": "CA_CERTIFICATE", "classificationConfidence": 0.95, "pageCount": 2, "fields": ['
        '{"field": "FY2023-24_turnover", "value": "₹42,00,000", "normalizedValue": 4200000, "sourcePage": 2, '
        '"sourceText": "FY2023-24: Rs 42,00,000", "confidence": 0.9, "status": "extracted"}]}',
    )
    resp = _upload()
    assert resp.status_code == 200
    body = resp.json()
    assert body["documentType"] == "CA_CERTIFICATE"
    assert body["fields"][0]["normalizedValue"] == 4200000


def test_pan_extraction(monkeypatch):
    _mock(
        monkeypatch,
        '{"documentType": "PAN", "classificationConfidence": 0.97, "pageCount": 1, "fields": ['
        '{"field": "pan_number", "value": "AAACA1234B", "sourcePage": 1, "sourceText": "PAN: AAACA1234B", "confidence": 0.95, "status": "extracted"}]}',
    )
    resp = _upload()
    assert resp.status_code == 200
    assert resp.json()["documentType"] == "PAN"


def test_gst_extraction(monkeypatch):
    _mock(
        monkeypatch,
        '{"documentType": "GST_CERTIFICATE", "classificationConfidence": 0.96, "pageCount": 1, "fields": ['
        '{"field": "gstin", "value": "33AAACA1234B1Z5", "sourcePage": 1, "sourceText": "GSTIN 33AAACA1234B1Z5", "confidence": 0.94, "status": "extracted"}]}',
    )
    resp = _upload()
    assert resp.status_code == 200
    assert resp.json()["documentType"] == "GST_CERTIFICATE"


def test_oem_authorization_extraction(monkeypatch):
    _mock(
        monkeypatch,
        '{"documentType": "OEM_AUTHORIZATION", "classificationConfidence": 0.9, "pageCount": 1, "fields": ['
        '{"field": "issue_date", "value": "10-Jun-2025", "sourcePage": 1, "sourceText": "Issued 10-Jun-2025", "confidence": 0.9, "status": "extracted"},'
        '{"field": "expiry_date", "value": "10-Jun-2026", "sourcePage": 1, "sourceText": "Valid until 10-Jun-2026", "confidence": 0.9, "status": "extracted"}]}',
    )
    resp = _upload()
    assert resp.status_code == 200
    fields = {f["field"]: f["value"] for f in resp.json()["fields"]}
    assert fields["expiry_date"] == "10-Jun-2026"


def test_experience_extraction_with_ambiguous_field(monkeypatch):
    _mock(
        monkeypatch,
        '{"documentType": "EXPERIENCE_CERTIFICATE", "classificationConfidence": 0.85, "pageCount": 1, "fields": ['
        '{"field": "client_name", "value": "Acme Corp", "sourcePage": 1, "sourceText": "Client: Acme Corp", "confidence": 0.9, "status": "extracted"},'
        '{"field": "completion_date", "value": "unclear", "sourcePage": 1, "sourceText": "completion around Q3", "confidence": 0.3, "status": "review_required"}]}',
    )
    resp = _upload()
    assert resp.status_code == 200
    fields = resp.json()["fields"]
    assert any(f["status"] == "review_required" for f in fields)


def test_unsupported_document_returns_empty_fields(monkeypatch):
    _mock(monkeypatch, '{"documentType": "UNSUPPORTED", "classificationConfidence": 0.8, "pageCount": 1, "fields": []}')
    resp = _upload()
    assert resp.status_code == 200
    assert resp.json()["fields"] == []


def test_malformed_json_rejected(monkeypatch):
    _mock(monkeypatch, "not json")
    resp = _upload()
    assert resp.status_code == 502


def test_invalid_document_type_rejected(monkeypatch):
    _mock(monkeypatch, '{"documentType": "MADE_UP", "classificationConfidence": 0.9, "pageCount": 1, "fields": []}')
    resp = _upload()
    assert resp.status_code == 502


def test_low_confidence_still_valid_but_flagged(monkeypatch):
    _mock(
        monkeypatch,
        '{"documentType": "EXPERIENCE_CERTIFICATE", "classificationConfidence": 0.4, "pageCount": 1, "fields": ['
        '{"field": "project_description", "value": "unclear scan", "sourcePage": 1, "sourceText": "...", "confidence": 0.2, "status": "review_required"}]}',
    )
    resp = _upload()
    assert resp.status_code == 200
    assert resp.json()["classificationConfidence"] == 0.4


def test_invalid_confidence_rejected(monkeypatch):
    _mock(monkeypatch, '{"documentType": "PAN", "classificationConfidence": 1.5, "pageCount": 1, "fields": []}')
    resp = _upload()
    assert resp.status_code == 502
