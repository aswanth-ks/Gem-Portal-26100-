// Phase 10C — the single shared orchestration used by BOTH the manual
// officer "Run/Re-run Evaluation" endpoint and the automatic post-submission
// trigger. There is exactly one evaluator (services/complianceEvaluator.ts,
// still pure/deterministic/no-LLM) and exactly one place that loads real
// data and calls it — this file. Neither caller duplicates this logic.

import { TenderRequirement } from '../models/TenderRequirement.js';
import { ComplianceRule } from '../models/ComplianceRule.js';
import { ComplianceEvaluation } from '../models/ComplianceEvaluation.js';
import { BidEvidence } from '../models/BidEvidence.js';
import { BidDocument } from '../models/BidDocument.js';
import { evaluateRule, EVALUATOR_VERSION } from './complianceEvaluator.js';
import { recordAuditEvent } from './audit.js';

export interface EvaluationRunResult {
  results: Array<{ requirementId: string; requirementTitle: string; ruleId: string | null; result: string; reason: string; finding?: string; evidenceIds: string[] }>;
  unconfigured: Array<{ requirementId: string; requirementTitle: string }>;
  summary: { pass: number; fail: number; review: number };
  evaluatedAt: Date;
  evaluatorVersion: string;
}

/**
 * Loads the real requirements/rules/evidence/documents for one bid, runs the
 * deterministic evaluator per requirement, upserts ComplianceEvaluation
 * (idempotent — never duplicates a row for the same bid+requirement), and
 * records one audit event. `trigger` distinguishes a human officer action
 * from the automatic system trigger for the audit record only — it never
 * changes the evaluation result itself (evaluation mode/trigger controls
 * availability and provenance, never correctness).
 *
 * Requirement/rule integrity (Phase 10C §15): requirements and rules are
 * both queried scoped to `tender._id`, so a rule belonging to a different
 * tender can never be consulted here even if a caller passed a stale
 * reference — this is enforced by the query shape itself, not a runtime
 * check bolted on afterward.
 */
export async function runComplianceEvaluation(
  bid: { _id: unknown; tenderId: unknown; submittedAt?: Date | null },
  tender: { _id: unknown },
  trigger: { officerId: string; action: 'COMPLIANCE_EVALUATION_RUN' | 'COMPLIANCE_EVALUATION_RERUN'; automatic?: boolean },
): Promise<EvaluationRunResult> {
  const requirements = await TenderRequirement.find({ tenderId: tender._id });
  const rules = await ComplianceRule.find({ tenderId: tender._id });
  const ruleByRequirement = new Map(rules.map((r) => [r.requirementId.toString(), r]));

  const evidence = await BidEvidence.find({ bidId: bid._id });
  const documents = await BidDocument.find({ bidId: bid._id });

  const evaluatedAt = new Date();
  const results: EvaluationRunResult['results'] = [];
  const unconfigured: EvaluationRunResult['unconfigured'] = [];

  for (const requirement of requirements) {
    const rule = ruleByRequirement.get(requirement._id.toString());
    if (!rule) {
      unconfigured.push({ requirementId: requirement._id.toString(), requirementTitle: requirement.title });
      continue;
    }

    const relevantEvidence = evidence.filter((e) => e.requirementId?.toString() === requirement._id.toString());
    const relevantDocs = documents.filter((d) => d.requirementId?.toString() === requirement._id.toString());

    const evalResult = evaluateRule(
      {
        _id: rule._id.toString(),
        type: rule.type as never,
        field: rule.field,
        operator: rule.operator as never,
        value: rule.value,
        parameters: (rule.parameters as Record<string, unknown>) ?? {},
      },
      relevantEvidence.map((e) => ({ _id: e._id.toString(), documentId: e.documentId.toString(), field: e.field, value: e.value, normalizedValue: e.normalizedValue as never, status: e.status as never })),
      relevantDocs.map((d) => ({ _id: d._id.toString(), requirementId: d.requirementId?.toString() ?? null, processingStatus: d.processingStatus as never })),
      bid.submittedAt ?? null,
    );

    await ComplianceEvaluation.findOneAndUpdate(
      { bidId: bid._id, requirementId: requirement._id },
      {
        bidId: bid._id,
        tenderId: tender._id,
        requirementId: requirement._id,
        ruleId: rule._id,
        result: evalResult.result,
        reason: evalResult.reason,
        finding: evalResult.finding ?? '',
        evidenceIds: evalResult.evidenceIds,
        ruleSnapshot: { type: rule.type, field: rule.field, operator: rule.operator, value: rule.value, parameters: rule.parameters },
        evaluatedAt,
        evaluatorVersion: EVALUATOR_VERSION,
      },
      { upsert: true },
    );

    results.push({
      requirementId: requirement._id.toString(),
      requirementTitle: requirement.title,
      ruleId: rule._id.toString(),
      result: evalResult.result,
      reason: evalResult.reason,
      finding: evalResult.finding,
      evidenceIds: evalResult.evidenceIds,
    });
  }

  const summary = { pass: results.filter((r) => r.result === 'PASS').length, fail: results.filter((r) => r.result === 'FAIL').length, review: results.filter((r) => r.result === 'REVIEW').length };

  await recordAuditEvent({
    tenderId: tender._id,
    bidId: bid._id,
    officerId: trigger.officerId,
    action: trigger.action,
    entityType: 'ComplianceEvaluation',
    result: `PASS:${summary.pass} FAIL:${summary.fail} REVIEW:${summary.review}`,
    context: { evaluatorVersion: EVALUATOR_VERSION, unconfiguredCount: unconfigured.length, automatic: trigger.automatic ?? false },
  });

  return { results, unconfigured, summary, evaluatedAt, evaluatorVersion: EVALUATOR_VERSION };
}
