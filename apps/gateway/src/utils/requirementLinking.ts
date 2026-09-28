// Phase 5 — links a classified bidder document to a real TenderRequirement,
// without ever hardcoding a mapping like "CA Certificate -> REQ-001". The
// match is driven entirely by the tender's own actual
// TenderRequirement.evidenceTypes text (officer-entered or AI-accepted in
// Phase 3A), keyword-matched against the document's classified type. If
// zero or more than one requirement plausibly matches, linking stays
// unresolved rather than guessing — Phase 6 or the officer resolves it.

interface RequirementLike {
  _id: unknown;
  evidenceTypes: string[];
}

const KEYWORDS: Record<string, string[]> = {
  CA_CERTIFICATE: ['CA CERTIFICATE', 'TURNOVER', 'AUDITED FINANCIAL', 'ITR', 'CA_CERTIF'],
  PAN: ['PAN'],
  GST_CERTIFICATE: ['GST', 'GSTIN'],
  EXPERIENCE_CERTIFICATE: ['EXPERIENCE', 'COMPLETION', 'WORK ORDER', 'PURCHASE ORDER', 'CLIENT CERTIFICATE', 'PROJECT'],
  OEM_AUTHORIZATION: ['OEM', 'AUTHORIZATION', 'AUTHORISATION', 'MANUFACTURER'],
};

export interface LinkResult {
  requirementId: unknown | null;
  linkStatus: 'linked' | 'review_required' | 'unmatched';
}

export function linkRequirement(classifiedType: string, requirements: RequirementLike[]): LinkResult {
  const keywords = KEYWORDS[classifiedType];
  if (!keywords || requirements.length === 0) {
    return { requirementId: null, linkStatus: 'unmatched' };
  }

  const matches = requirements.filter((r) => {
    const haystack = r.evidenceTypes.join(' ').toUpperCase();
    return keywords.some((kw) => haystack.includes(kw));
  });

  if (matches.length === 1) {
    return { requirementId: matches[0]._id, linkStatus: 'linked' };
  }
  if (matches.length > 1) {
    return { requirementId: null, linkStatus: 'review_required' };
  }
  return { requirementId: null, linkStatus: 'unmatched' };
}
