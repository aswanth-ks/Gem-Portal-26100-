"""Phase 4 tests A-F (schema/logic side; G-M are gateway-level, verified live
against the running services — see the Phase 4 report)."""

from fastapi.testclient import TestClient

from app.main import app
import app.api.propose_rule as propose_rule_module

client = TestClient(app)

TURNOVER_REQUIREMENT = {
    "code": "REQ-001",
    "title": "Average Annual Turnover",
    "description": "Average annual turnover must be at least ₹50 lakh over the last 3 financial years.",
    "category": "financial",
    "mandatory": True,
    "conditional": False,
    "evidenceTypes": ["CA Certificate", "ITR"],
    "sourceDocument": "Tender_041.pdf",
    "sourcePage": 7,
    "sourceClause": "4.2",
}


def _mock_llm(monkeypatch, response_json: str):
    async def fake_generate_json(_prompt: str) -> str:
        return response_json

    monkeypatch.setattr(propose_rule_module, "generate_json", fake_generate_json)


# A. Numeric threshold
def test_numeric_threshold_proposal_accepted(monkeypatch):
    _mock_llm(
        monkeypatch,
        '{"ruleApplicable": true, "type": "numeric_threshold", "field": "average_annual_turnover", '
        '"operator": ">=", "value": 5000000, "parameters": {"calculation": "average", "period": "last 3 financial years"}, '
        '"reason": "The requirement explicitly defines a quantitative turnover threshold."}',
    )
    resp = client.post("/ai/propose-rule", json=TURNOVER_REQUIREMENT)
    assert resp.status_code == 200
    body = resp.json()
    assert body["proposal"]["ruleApplicable"] is True
    assert body["proposal"]["type"] == "numeric_threshold"
    assert body["proposal"]["value"] == 5000000


# B. Required document
def test_required_document_proposal_accepted(monkeypatch):
    req = {**TURNOVER_REQUIREMENT, "code": "REQ-004", "title": "PAN", "description": "Bidder shall submit a valid PAN copy.", "category": "statutory"}
    _mock_llm(
        monkeypatch,
        '{"ruleApplicable": true, "type": "required_document", "field": "PAN", "operator": "==", '
        '"value": "required", "parameters": {}, "reason": "The requirement mandates submission of a PAN copy."}',
    )
    resp = client.post("/ai/propose-rule", json=req)
    assert resp.status_code == 200
    assert resp.json()["proposal"]["type"] == "required_document"


# C. Date validity
def test_date_validity_proposal_accepted(monkeypatch):
    req = {**TURNOVER_REQUIREMENT, "code": "REQ-007", "title": "OEM Authorization", "description": "OEM authorization shall be valid on the bid submission date.", "category": "statutory"}
    _mock_llm(
        monkeypatch,
        '{"ruleApplicable": true, "type": "date_validity", "field": "authorization_expiry_date", "operator": ">=", '
        '"value": null, "parameters": {"compareAgainst": "bidDate"}, "reason": "The requirement ties validity to the bid submission date."}',
    )
    resp = client.post("/ai/propose-rule", json=req)
    assert resp.status_code == 200
    assert resp.json()["proposal"]["type"] == "date_validity"
    assert resp.json()["proposal"]["parameters"]["compareAgainst"] == "bidDate"


# D. Experience threshold
def test_experience_threshold_proposal_accepted(monkeypatch):
    req = {**TURNOVER_REQUIREMENT, "code": "REQ-006", "title": "Experience", "description": "Bidder shall have completed at least 3 similar CCTV projects during the preceding 5 years.", "category": "experience"}
    _mock_llm(
        monkeypatch,
        '{"ruleApplicable": true, "type": "experience_threshold", "field": "similar_project_count", "operator": ">=", '
        '"value": 3, "parameters": {"periodYears": 5}, "reason": "The requirement states a minimum project count within a stated period."}',
    )
    resp = client.post("/ai/propose-rule", json=req)
    assert resp.status_code == 200
    assert resp.json()["proposal"]["value"] == 3


# E. Informational scope requirement -> no rule
def test_scope_of_work_returns_not_applicable(monkeypatch):
    req = {**TURNOVER_REQUIREMENT, "code": "REQ-000", "title": "Scope", "description": "Bidder shall supply, install, integrate, test and commission the CCTV system.", "category": "technical"}
    _mock_llm(
        monkeypatch,
        '{"ruleApplicable": false, "reason": "This is a scope-of-work requirement and does not define a deterministic bidder qualification condition."}',
    )
    resp = client.post("/ai/propose-rule", json=req)
    assert resp.status_code == 200
    assert resp.json()["proposal"]["ruleApplicable"] is False


# F. Procedural instruction -> no forced rule
def test_procedural_instruction_returns_not_applicable(monkeypatch):
    req = {**TURNOVER_REQUIREMENT, "code": "REQ-002", "title": "Bid format", "description": "Bidder shall submit all documents in the prescribed electronic bid format.", "category": "commercial"}
    _mock_llm(monkeypatch, '{"ruleApplicable": false, "reason": "This is a procedural submission instruction, not a qualification condition."}')
    resp = client.post("/ai/propose-rule", json=req)
    assert resp.status_code == 200
    assert resp.json()["proposal"]["ruleApplicable"] is False


# M. Invalid/malformed AI response
def test_malformed_json_rejected(monkeypatch):
    _mock_llm(monkeypatch, "not json")
    resp = client.post("/ai/propose-rule", json=TURNOVER_REQUIREMENT)
    assert resp.status_code == 502


def test_applicable_true_without_required_fields_rejected(monkeypatch):
    _mock_llm(monkeypatch, '{"ruleApplicable": true, "reason": "missing the actual rule fields"}')
    resp = client.post("/ai/propose-rule", json=TURNOVER_REQUIREMENT)
    assert resp.status_code == 502


def test_invalid_type_rejected(monkeypatch):
    _mock_llm(
        monkeypatch,
        '{"ruleApplicable": true, "type": "made_up_type", "field": "x", "operator": ">=", "value": 1, "reason": "x"}',
    )
    resp = client.post("/ai/propose-rule", json=TURNOVER_REQUIREMENT)
    assert resp.status_code == 502


def test_invalid_operator_rejected(monkeypatch):
    _mock_llm(
        monkeypatch,
        '{"ruleApplicable": true, "type": "numeric_threshold", "field": "x", "operator": "=~", "value": 1, "reason": "x"}',
    )
    resp = client.post("/ai/propose-rule", json=TURNOVER_REQUIREMENT)
    assert resp.status_code == 502
