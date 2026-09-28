"""Phase 4 — translating an approved TenderRequirement into a structured
ComplianceRule proposal. The model never decides bidder compliance and never
outputs PASS/FAIL/REVIEW/scores — those fields don't exist in this schema at
all, so the LLM has no slot to put them in even if it tried."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator

RULE_TYPES = {"numeric_threshold", "date_validity", "required_document", "boolean_condition", "experience_threshold"}
OPERATORS = {">=", "<=", ">", "<", "==", "!="}


class RequirementInput(BaseModel):
    code: str
    title: str
    description: str = ""
    category: str
    mandatory: bool = True
    conditional: bool = False
    evidenceTypes: list[str] = Field(default_factory=list)
    sourceDocument: str = ""
    sourcePage: int | None = None
    sourceClause: str | None = None


class RuleProposal(BaseModel):
    ruleApplicable: bool
    type: str | None = None
    field: str | None = None
    operator: str | None = None
    value: Any = None
    parameters: dict = Field(default_factory=dict)
    reason: str

    @field_validator("type")
    @classmethod
    def type_must_be_supported(cls, v: str | None) -> str | None:
        if v is not None and v not in RULE_TYPES:
            raise ValueError(f"type '{v}' is not one of {sorted(RULE_TYPES)}")
        return v

    @field_validator("operator")
    @classmethod
    def operator_must_be_supported(cls, v: str | None) -> str | None:
        if v is not None and v not in OPERATORS:
            raise ValueError(f"operator '{v}' is not one of {sorted(OPERATORS)}")
        return v

    def is_internally_consistent(self) -> bool:
        # A rule proposal that claims to be applicable must actually carry
        # the fields needed to build a ComplianceRule — checked explicitly by
        # the endpoint (not a pydantic validator) so the failure is reported
        # the same way as every other "malformed AI response" case.
        if self.ruleApplicable:
            return bool(self.type and self.field and self.operator)
        return True


class ProposeRuleResponse(BaseModel):
    requirementCode: str
    proposal: RuleProposal
