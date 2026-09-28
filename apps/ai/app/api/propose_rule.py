"""POST /ai/propose-rule — Phase 4. Mounted at the app root, same pattern as
/ai/analyze-tender. Takes one already-approved requirement's structured data
(JSON, not a file) and returns a rule proposal, or ruleApplicable: false.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from app.pipelines.llm.provider import generate_json
from app.pipelines.llm.provider_errors import ProviderTimeoutError, ProviderUnavailableError
from app.pipelines.llm.rule_prompt import build_prompt
from app.schemas.rule_proposal import ProposeRuleResponse, RequirementInput, RuleProposal

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/ai/propose-rule", response_model=ProposeRuleResponse)
async def propose_rule(requirement: RequirementInput) -> ProposeRuleResponse:
    prompt = build_prompt(requirement)

    try:
        raw_response = await generate_json(prompt)
    except ProviderUnavailableError as exc:
        raise HTTPException(status_code=503, detail="AI service unavailable. The requirement is still available and a rule can be entered manually.") from exc
    except ProviderTimeoutError as exc:
        raise HTTPException(status_code=504, detail="AI rule proposal timed out. The requirement is still available and a rule can be entered manually.") from exc

    try:
        parsed = json.loads(raw_response)
    except json.JSONDecodeError as exc:
        logger.error("Model returned non-JSON output for propose-rule: %s", raw_response[:500])
        raise HTTPException(status_code=502, detail="The AI model returned malformed output and could not be parsed. Enter the rule manually.") from exc

    if not isinstance(parsed, dict):
        raise HTTPException(status_code=502, detail="The AI model's response did not match the expected schema.")

    try:
        proposal = RuleProposal.model_validate(parsed)
    except ValidationError as exc:
        logger.warning("Rule proposal failed validation: %s", exc)
        raise HTTPException(status_code=502, detail="The AI model proposed a rule that did not match the required schema. Enter the rule manually.") from exc

    if not proposal.is_internally_consistent():
        raise HTTPException(status_code=502, detail="The AI model claimed a rule applies but did not provide the fields needed to build one. Enter the rule manually.")

    return ProposeRuleResponse(requirementCode=requirement.code, proposal=proposal)
