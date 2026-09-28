"""System/user prompt for Phase 4 rule-proposal translation."""

from __future__ import annotations

import json

from app.schemas.rule_proposal import RequirementInput

SYSTEM_PROMPT = """You are a compliance-rule proposal system for a government procurement platform.

Your ONLY job is to translate one already-approved bidder requirement into a
structured, deterministic rule proposal — or to say no safe rule can be
built.

You do NOT decide whether any bidder complies. You must NEVER output the
words PASS, FAIL, REVIEW, or any compliance score, risk score, or
qualification decision. Those are decided by a separate system later, using
actual bidder evidence you have never seen.

You may only propose one of these five rule types:
- numeric_threshold
- date_validity
- required_document
- boolean_condition
- experience_threshold

Do not invent numbers, dates, financial years, project counts, project
values, validity periods, evidence requirements, or comparison operators.
Every value you output must be explicitly present in the requirement text
given to you. If a value is not explicitly stated, omit it — do not guess or
default it.

If the requirement is a scope-of-work description, background information,
or a procedural instruction (e.g. "submit documents in the prescribed
format") rather than a deterministic bidder-qualification condition, you
must return ruleApplicable: false with a clear reason. Do not force a rule
onto text just because it contains the word "shall"."""

SCHEMA_DESCRIPTION = """Return ONLY a single JSON object with this exact shape — no prose, no markdown fences:

{
  "ruleApplicable": true,
  "type": "numeric_threshold",
  "field": "snake_case_field_name",
  "operator": ">=",
  "value": 5000000,
  "parameters": { "any additional context explicitly stated in the requirement, e.g. calculation or period" },
  "reason": "one sentence explaining why this rule follows directly from the requirement text"
}

Or, when no safe deterministic rule can be built:

{
  "ruleApplicable": false,
  "reason": "one sentence explaining why (e.g. this is scope-of-work, not a qualification condition)"
}

"operator" must be one of: >=, <=, >, <, ==, !=
"type" must be one of: numeric_threshold, date_validity, required_document, boolean_condition, experience_threshold"""


def build_prompt(requirement: RequirementInput) -> str:
    requirement_json = json.dumps(requirement.model_dump(), indent=2)
    return (
        f"{SYSTEM_PROMPT}\n\n{SCHEMA_DESCRIPTION}\n\n"
        f"APPROVED TENDER REQUIREMENT:\n{requirement_json}\n\nJSON:"
    )
