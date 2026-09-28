// Phase 6 — deterministic compliance evaluator.
//
// This module MUST NEVER import a Gemini/Ollama/AI-provider client or make a
// network call. It consumes only already-extracted BidEvidence (Phase 5) and
// a ComplianceRule (Phase 2/4) and returns a deterministic PASS/FAIL/REVIEW —
// pure functions over plain data, executable with the AI service completely
// offline. Gemini decides nothing about compliance; it only ever produced the
// evidence this module reads.

export const EVALUATOR_VERSION = '1.0';

export type EvalOutcome = 'PASS' | 'FAIL' | 'REVIEW';

export interface EvidenceInput {
  _id: string;
  documentId: string;
  field: string;
  value: string;
  normalizedValue?: string | number | boolean | null;
  status: 'extracted' | 'review_required';
}

export interface DocumentInput {
  _id: string;
  requirementId?: string | null;
  processingStatus: 'idle' | 'processing' | 'completed' | 'failed';
}

export interface RuleInput {
  _id: string;
  type: 'numeric_threshold' | 'date_validity' | 'required_document' | 'boolean_condition' | 'experience_threshold';
  field: string;
  operator: '>=' | '<=' | '>' | '<' | '==' | '!=';
  value?: unknown;
  parameters?: Record<string, unknown>;
}

export interface EvalResult {
  result: EvalOutcome;
  reason: string;
  evidenceIds: string[];
  finding?: string;
}

function compareNumeric(a: number, op: RuleInput['operator'], b: number): boolean {
  switch (op) {
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '<':
      return a < b;
    case '==':
      return a === b;
    case '!=':
      return a !== b;
  }
}

function asFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** Best-effort parse of the date formats our extraction prompt asks for
 * ("10-Jun-2026", ISO, etc.). Returns null (never a guessed date) if the
 * text can't be parsed with confidence. */
function parseEvidenceDate(v: unknown): Date | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const normalized = v.trim().replace(/-/g, ' ');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function evaluateRequiredDocument(rule: RuleInput, evidence: EvidenceInput[], documents: DocumentInput[]): EvalResult {
  if (documents.length === 0) {
    return { result: 'FAIL', reason: 'No document was uploaded against this requirement.', evidenceIds: [] };
  }
  const failedDocs = documents.filter((d) => d.processingStatus === 'failed');
  const pendingDocs = documents.filter((d) => d.processingStatus === 'idle' || d.processingStatus === 'processing');
  const completedDocs = documents.filter((d) => d.processingStatus === 'completed');

  if (completedDocs.length > 0 && evidence.length > 0) {
    return {
      result: 'PASS',
      reason: 'A document was uploaded against this requirement and evidence was extracted from it.',
      evidenceIds: evidence.map((e) => e._id),
      finding: `${evidence.length} field(s) extracted.`,
    };
  }
  if (pendingDocs.length > 0) {
    return { result: 'REVIEW', reason: 'The uploaded document has not finished processing yet.', evidenceIds: [] };
  }
  if (failedDocs.length > 0) {
    return { result: 'REVIEW', reason: 'The uploaded document could not be processed automatically; evidence could not be extracted.', evidenceIds: [] };
  }
  return { result: 'REVIEW', reason: 'A document was uploaded but no evidence fields were extracted from it.', evidenceIds: [] };
}

function evaluateNumericThreshold(rule: RuleInput, evidence: EvidenceInput[]): EvalResult {
  const threshold = asFiniteNumber(rule.value);
  if (threshold === null) {
    return { result: 'REVIEW', reason: `Rule for "${rule.field}" has no valid numeric threshold configured.`, evidenceIds: [] };
  }

  const aggregate = (rule.parameters?.aggregate as string | undefined) ?? 'single';
  const fieldMatch = (rule.parameters?.fieldMatch as string | undefined)?.toLowerCase();

  const matching = fieldMatch ? evidence.filter((e) => e.field.toLowerCase().includes(fieldMatch)) : evidence.filter((e) => e.field === rule.field);

  if (matching.length === 0) {
    return { result: 'REVIEW', reason: `No evidence was found for "${fieldMatch ?? rule.field}".`, evidenceIds: [] };
  }

  const ambiguous = matching.filter((e) => e.status === 'review_required' || asFiniteNumber(e.normalizedValue) === null);
  if (ambiguous.length > 0) {
    return {
      result: 'REVIEW',
      reason: `Evidence for "${fieldMatch ?? rule.field}" is incomplete or ambiguous and cannot be used in a deterministic calculation.`,
      evidenceIds: matching.map((e) => e._id),
    };
  }

  const numbers = matching.map((e) => asFiniteNumber(e.normalizedValue) as number);

  if (aggregate === 'single') {
    if (numbers.length > 1) {
      const distinct = new Set(numbers);
      if (distinct.size > 1) {
        return {
          result: 'REVIEW',
          reason: `Conflicting evidence found for "${rule.field}": ${numbers.join(' vs ')}.`,
          evidenceIds: matching.map((e) => e._id),
        };
      }
    }
    const value = numbers[0];
    const pass = compareNumeric(value, rule.operator, threshold);
    return {
      result: pass ? 'PASS' : 'FAIL',
      reason: `${rule.field} = ${value} ${pass ? 'satisfies' : 'does not satisfy'} the rule (${rule.field} ${rule.operator} ${threshold}).`,
      evidenceIds: matching.map((e) => e._id),
      finding: `${rule.field} = ${value}`,
    };
  }

  const aggregated = aggregate === 'sum' ? numbers.reduce((a, b) => a + b, 0) : numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const pass = compareNumeric(aggregated, rule.operator, threshold);
  return {
    result: pass ? 'PASS' : 'FAIL',
    reason: `${aggregate === 'sum' ? 'Sum' : 'Average'} of matched evidence (${numbers.join(', ')}) = ${aggregated.toFixed(2)}, which ${pass ? 'meets' : 'does not meet'} the minimum of ${threshold}.`,
    evidenceIds: matching.map((e) => e._id),
    finding: `${aggregate} = ${aggregated.toFixed(2)}`,
  };
}

function evaluateDateValidity(rule: RuleInput, evidence: EvidenceInput[], bidSubmittedAt: Date | null): EvalResult {
  const matching = evidence.filter((e) => e.field === rule.field);
  if (matching.length === 0) {
    return { result: 'REVIEW', reason: `No "${rule.field}" evidence was found.`, evidenceIds: [] };
  }
  if (matching.length > 1) {
    const distinctValues = new Set(matching.map((e) => e.value));
    if (distinctValues.size > 1) {
      return { result: 'REVIEW', reason: `Conflicting evidence found for "${rule.field}".`, evidenceIds: matching.map((e) => e._id) };
    }
  }
  const record = matching[0];
  if (record.status === 'review_required') {
    return { result: 'REVIEW', reason: `The "${rule.field}" evidence is marked ambiguous/incomplete and cannot be used to determine validity.`, evidenceIds: [record._id] };
  }
  if (!bidSubmittedAt) {
    return { result: 'REVIEW', reason: 'The bid submission date is not available, so validity on the bid date cannot be determined.', evidenceIds: [record._id] };
  }
  const evidenceDate = parseEvidenceDate(record.normalizedValue) ?? parseEvidenceDate(record.value);
  if (!evidenceDate) {
    return { result: 'REVIEW', reason: `The "${rule.field}" value ("${record.value}") could not be parsed as a valid date.`, evidenceIds: [record._id] };
  }

  const valid = evidenceDate.getTime() >= bidSubmittedAt.getTime();
  return {
    result: valid ? 'PASS' : 'FAIL',
    reason: valid
      ? `${rule.field} (${record.value}) is on or after the bid submission date (${bidSubmittedAt.toISOString().slice(0, 10)}).`
      : `Authorization expired on ${record.value}, before the bid date of ${bidSubmittedAt.toISOString().slice(0, 10)}.`,
    evidenceIds: [record._id],
    finding: `${rule.field} = ${record.value}`,
  };
}

interface ExperienceProject {
  key: string;
  fields: EvidenceInput[];
}

function groupExperienceProjects(evidence: EvidenceInput[]): ExperienceProject[] {
  const groups = new Map<string, EvidenceInput[]>();
  for (const e of evidence) {
    const match = e.field.match(/^(project\d+)_/i);
    const key = `${e.documentId}:${match ? match[1] : 'default'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return [...groups.entries()].map(([key, fields]) => ({ key, fields }));
}

function evaluateExperienceThreshold(rule: RuleInput, evidence: EvidenceInput[], bidSubmittedAt: Date | null): EvalResult {
  if (evidence.length === 0) {
    return { result: 'REVIEW', reason: 'No experience evidence was found for this requirement.', evidenceIds: [] };
  }

  const minProjects = asFiniteNumber(rule.parameters?.minProjects) ?? asFiniteNumber(rule.value) ?? 1;
  const minProjectValue = asFiniteNumber(rule.parameters?.minProjectValue);
  const withinYears = asFiniteNumber(rule.parameters?.withinYears);

  const projects = groupExperienceProjects(evidence);
  const allEvidenceIds = evidence.map((e) => e._id);

  let confirmedCount = 0;
  let confirmedMeetingValue = 0;
  let anyAmbiguous = false;

  for (const project of projects) {
    const valueField = project.fields.find((f) => /value/i.test(f.field));
    const dateField = project.fields.find((f) => /completiondate|completion_date/i.test(f.field));
    // Only the fields this evaluation actually uses (value, completion date)
    // determine ambiguity — an unrelated field (e.g. issueDate) being
    // review_required must not disqualify an otherwise clean project.
    const relevantFields = [valueField, dateField].filter((f): f is EvidenceInput => f !== undefined);
    const hasAmbiguousField = relevantFields.length === 0 || relevantFields.some((f) => f.status === 'review_required');

    const value = valueField && valueField.status === 'extracted' ? asFiniteNumber(valueField.normalizedValue) : null;
    const date = dateField && dateField.status === 'extracted' ? parseEvidenceDate(dateField.normalizedValue) ?? parseEvidenceDate(dateField.value) : null;

    const dateInWindow = withinYears === null || (date !== null && bidSubmittedAt !== null && bidSubmittedAt.getTime() - date.getTime() <= withinYears * 365.25 * 86400000 && date.getTime() <= bidSubmittedAt.getTime());

    if (hasAmbiguousField || (withinYears !== null && date === null)) {
      anyAmbiguous = true;
      continue;
    }
    if (!dateInWindow) continue; // deterministically outside the window — not a qualifying project, not ambiguous

    confirmedCount++;
    if (minProjectValue === null || (value !== null && value >= minProjectValue)) confirmedMeetingValue++;
  }

  const totalGroups = projects.length;
  const satisfiesCount = confirmedCount >= minProjects;
  const satisfiesValue = minProjectValue === null || confirmedMeetingValue >= 1;

  if (satisfiesCount && satisfiesValue) {
    return {
      result: 'PASS',
      reason: `${confirmedCount} qualifying project(s) identified with sufficient confirmed evidence, meeting the minimum of ${minProjects}${minProjectValue !== null ? ` and including at least one project valued at or above ${minProjectValue}` : ''}.`,
      evidenceIds: allEvidenceIds,
      finding: `${confirmedCount} confirmed project(s) of ${totalGroups} identified`,
    };
  }

  // Deterministic FAIL only when no amount of ambiguity resolution could
  // possibly reach the threshold (i.e. even counting every ambiguous group
  // as a best-case pass, the requirement still isn't met).
  const bestCasePossible = totalGroups >= minProjects && (minProjectValue === null || confirmedMeetingValue >= 1 || projects.some((p) => p.fields.some((f) => f.status === 'review_required')));
  if (!anyAmbiguous && !bestCasePossible) {
    return {
      result: 'FAIL',
      reason: `Only ${confirmedCount} qualifying project(s) of ${totalGroups} identified meet the requirement; the minimum is ${minProjects}${minProjectValue !== null ? ` with at least one valued at or above ${minProjectValue}` : ''}.`,
      evidenceIds: allEvidenceIds,
      finding: `${confirmedCount} confirmed project(s) of ${totalGroups} identified`,
    };
  }

  return {
    result: 'REVIEW',
    reason: `${totalGroups} project record(s) identified, but at least one project's qualifying value/date evidence is incomplete or ambiguous, so the requirement cannot be conclusively evaluated.`,
    evidenceIds: allEvidenceIds,
    finding: `${confirmedCount} confirmed of ${totalGroups} identified`,
  };
}

/** The single entry point — dispatches by rule type. Never throws for a
 * malformed/unsupported rule: returns REVIEW so one bad rule can't crash the
 * whole evaluation run. */
export function evaluateRule(rule: RuleInput, evidence: EvidenceInput[], documents: DocumentInput[], bidSubmittedAt: Date | null): EvalResult {
  switch (rule.type) {
    case 'required_document':
      return evaluateRequiredDocument(rule, evidence, documents);
    case 'numeric_threshold':
      return evaluateNumericThreshold(rule, evidence);
    case 'date_validity':
      return evaluateDateValidity(rule, evidence, bidSubmittedAt);
    case 'experience_threshold':
      return evaluateExperienceThreshold(rule, evidence, bidSubmittedAt);
    case 'boolean_condition': {
      const matching = evidence.filter((e) => e.field === rule.field);
      if (matching.length === 0) return { result: 'REVIEW', reason: `No evidence found for "${rule.field}".`, evidenceIds: [] };
      const record = matching[0];
      if (record.status === 'review_required') return { result: 'REVIEW', reason: `Evidence for "${rule.field}" is ambiguous.`, evidenceIds: [record._id] };
      const actual = typeof record.normalizedValue === 'boolean' ? record.normalizedValue : record.value === 'true';
      const expected = rule.value === true || rule.value === 'true';
      const pass = actual === expected;
      return { result: pass ? 'PASS' : 'FAIL', reason: `${rule.field} = ${actual}, expected ${expected}.`, evidenceIds: [record._id] };
    }
    default:
      return { result: 'REVIEW', reason: `Unsupported rule type "${rule.type as string}".`, evidenceIds: [] };
  }
}
