"""System/user prompt construction for tender requirement extraction.

The model extracts requirements explicitly present in the document; it does
not judge compliance and must not use outside knowledge (see the exact
system-prompt wording specified for Phase 3A, reproduced verbatim below)."""

from __future__ import annotations

SYSTEM_PROMPT = """You are a procurement tender-understanding system.

Extract requirements explicitly supported by the supplied tender document.

Do not invent requirements.
Do not use outside knowledge.
Do not infer missing values.
Do not convert general background statements into mandatory requirements.

For every extracted requirement, preserve the source page and clause when available.

Distinguish:
- mandatory requirements
- conditional requirements
- informational statements

Return JSON only according to the supplied schema."""

SCHEMA_DESCRIPTION = """Return ONLY a single JSON object with this exact shape — no prose, no markdown fences:

{
  "requirements": [
    {
      "code": "REQ-001",
      "title": "short title",
      "description": "full requirement text, quoted or closely paraphrased from the document",
      "category": "one of: statutory, financial, technical, experience, commercial, contractual, tender_specific, other",
      "mandatory": true,
      "conditional": false,
      "evidenceTypes": ["UPPER_SNAKE_CASE evidence names, e.g. CA_CERTIFICATE"],
      "source": {
        "documentPage": 4,
        "clause": "5.4",
        "excerpt": "the exact sentence(s) this requirement was extracted from"
      },
      "confidence": 0.9
    }
  ]
}

Rules:
- If the source clause number is not given in the text, set "clause": null. Do not guess a clause number.
- If you cannot determine which page a requirement came from, set "documentPage": null. Do not guess a page number.
- "confidence" must be a number between 0 and 1 reflecting how directly the text supports this requirement.
- Number requirement codes sequentially: REQ-001, REQ-002, ...
- Only extract requirements that bidders must satisfy to qualify or comply — not general project background, not evaluation-committee-internal notes.
- If the document contains no extractable requirements, return {"requirements": []}."""


def build_prompt(page_aware_text: str) -> str:
    return f"{SYSTEM_PROMPT}\n\n{SCHEMA_DESCRIPTION}\n\nTENDER DOCUMENT TEXT:\n{page_aware_text}\n\nJSON:"
