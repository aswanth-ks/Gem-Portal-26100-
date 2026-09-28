// Shapes returned by apps/gateway. Kept here (not imported cross-package)
// since the web app and gateway build independently — this is the frontend's
// view of the contract, not a shared source of truth.

// Phase 10C — controls WHEN an officer may see an already-computed
// assessment, never whether/when it's computed. See models/Tender.ts.
export type EvaluationMode = 'SEALED' | 'IMMEDIATE';

export interface ApiTender {
  _id: string;
  tenderNumber: string;
  title: string;
  description: string;
  department: string;
  scopeOfWork: string[];
  eligibilityCriteria: string[];
  technicalRequirements: string[];
  requiredDocuments: string[];
  value: string;
  submissionStart: string;
  submissionDeadline: string;
  status: 'draft' | 'published' | 'closed';
  publishedAt?: string;
  evaluationMode?: EvaluationMode;
}

export interface ApiBidDocument {
  _id: string;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  processingStatus?: 'idle' | 'processing' | 'completed' | 'failed';
  classifiedType?: string | null;
  requirementId?: string | null;
  linkStatus?: 'linked' | 'review_required' | 'unmatched';
}

// Phase 5 — extracted evidence for one bidder document. This is provenance,
// not a compliance verdict: there is no PASS/FAIL/score field here.
export interface ApiEvidenceField {
  _id: string;
  field: string;
  value: string;
  normalizedValue?: string | number | boolean | null;
  sourcePage?: number | null;
  sourceText?: string;
  extractionConfidence: number;
  status: 'extracted' | 'review_required';
}

export interface ApiDocumentEvidence {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  error?: string;
  documentType?: string | null;
  classificationConfidence?: number;
  requirementId?: string | null;
  linkStatus: 'linked' | 'review_required' | 'unmatched';
  fields: ApiEvidenceField[];
}

export interface ApiBid {
  _id: string;
  tenderId: string | ApiTender;
  bidderId: string;
  status: 'draft' | 'submitted' | 'closed';
  formData: Record<string, unknown>;
  documents: (string | ApiBidDocument)[];
  bidReference?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Phase 10C — real, honest post-submission pipeline state. Never exposes
  // PASS/FAIL/REVIEW to the bidder — only that processing/evaluation is
  // happening, still in progress, or done.
  documentProcessingStatus?: 'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL_FAILURE' | 'FAILED';
  complianceEvaluationStatus?: 'NOT_STARTED' | 'WAITING_FOR_DOCUMENTS' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

// Phase 2 — officer tender-authoring entities.
export interface ApiTenderDocument {
  _id: string;
  tenderId: string;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export type RequirementCategory = 'statutory' | 'financial' | 'technical' | 'eligibility' | 'experience' | 'commercial' | 'contractual' | 'tender_specific' | 'other';

export interface ApiTenderRequirement {
  _id: string;
  tenderId: string;
  code: string;
  title: string;
  description: string;
  category: RequirementCategory;
  mandatory: boolean;
  conditional: boolean;
  evidenceTypes: string[];
  sourceDocument: string;
  sourcePage?: number;
  sourceClause: string;
  status: 'proposed' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export type RuleType = 'numeric_threshold' | 'date_validity' | 'required_document' | 'boolean_condition' | 'experience_threshold';
export type RuleOperator = '>=' | '<=' | '>' | '<' | '==' | '!=';

export interface ApiComplianceRule {
  _id: string;
  tenderId: string;
  requirementId: string;
  type: RuleType;
  field: string;
  operator: RuleOperator;
  value?: unknown;
  parameters?: Record<string, unknown>;
  temporalCondition?: string;
  createdAt: string;
  updatedAt: string;
}

// Phase 3A — AI tender-requirement extraction (preview only; nothing here is
// persisted until the officer accepts an item via the normal requirements API).
export interface ApiAiRequirementSource {
  documentPage: number | null;
  clause: string | null;
  excerpt: string;
}

export interface ApiAiExtractedRequirement {
  code: string;
  title: string;
  description: string;
  category: RequirementCategory;
  mandatory: boolean;
  conditional: boolean;
  evidenceTypes: string[];
  source: ApiAiRequirementSource;
  confidence: number;
}

// Async analysis job status (reliability fix — the real analysis can take
// several minutes, so POST returns 202 immediately and the frontend polls
// GET .../analyze for status). "idle" only appears from the GET poll before
// any analysis has ever been triggered.
export interface ApiAnalysisStatus {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  requirements?: ApiAiExtractedRequirement[];
  pageCount?: number;
  droppedCount?: number;
  error?: string;
}

// Phase 4 — AI rule proposal (preview only; nothing persisted until accepted
// through the normal POST /tenders/:id/rules, same as a manually entered rule).
export interface ApiRuleProposal {
  ruleApplicable: boolean;
  type?: RuleType | null;
  field?: string | null;
  operator?: RuleOperator | null;
  value?: unknown;
  parameters?: Record<string, unknown>;
  reason: string;
}

export interface ApiProposeRuleResponse {
  requirementCode: string;
  proposal: ApiRuleProposal;
}

// Officer read-only bid views — real data only, no compliance scoring exists
// yet (deferred to a later phase; see officer/bids.routes.ts).
export interface ApiOfficerBidRow {
  _id: string;
  bidderId: string;
  status: 'submitted' | 'closed';
  bidReference?: string;
  submittedAt?: string;
  documentCount: number;
  organizationName: string;
}

export interface ApiOfficerBidsForTender {
  sealed: boolean;
  deadline: string;
  bids: ApiOfficerBidRow[];
}

export interface ApiOfficerBidDetail {
  _id: string;
  tenderId: string;
  tenderNumber: string;
  tenderTitle: string;
  status: 'submitted' | 'closed';
  bidReference?: string;
  submittedAt?: string;
  documentProcessingStatus?: 'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL_FAILURE' | 'FAILED';
  complianceEvaluationStatus?: 'NOT_STARTED' | 'WAITING_FOR_DOCUMENTS' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  formData: Record<string, unknown>;
  documents: ApiBidDocument[];
  organizationName: string;
  registrationNumber: string;
  contactPerson: string;
  email: string;
  phone: string;
}

// Phase 5.5 — minimal real dashboard/review aggregations. Every field here
// is a MongoDB count/derivation; nothing is a compliance score or PASS/FAIL.
export interface ApiOfficerDashboardSummary {
  totalTenders: number;
  draftTenders: number;
  publishedTenders: number;
  closedTenders: number;
  submissionOpen: number;
  submissionClosed: number;
  totalBids: number;
  documentsRequiringAttention: number;
}

// Phase 6 — deterministic compliance evaluation results. Never a score —
// every row traces to the real rule and the real evidence that produced it.
export interface ApiComplianceResultRow {
  requirementId: string;
  requirementTitle: string;
  ruleId: string;
  result: 'PASS' | 'FAIL' | 'REVIEW';
  reason: string;
  finding?: string;
  evidenceIds: string[];
}

export interface ApiComplianceUnconfigured {
  requirementId: string;
  requirementTitle: string;
}

export interface ApiComplianceEvaluation {
  bidId: string;
  evaluated?: boolean;
  summary: { pass: number; fail: number; review: number } | null;
  results: ApiComplianceResultRow[];
  unconfigured: ApiComplianceUnconfigured[];
  evaluatedAt?: string;
  evaluatorVersion?: string;
}

// Phase 7 — the officer's own human judgment about a compliance result.
// Deliberately separate from ApiComplianceResultRow (the machine result):
// the officer never edits PASS/FAIL/REVIEW itself, only records a judgment
// about it.
export type OfficerAssessmentValue = 'ACCEPTED' | 'NEEDS_REVIEW' | 'NOT_ACCEPTED';

export interface ApiOfficerAssessment {
  _id: string;
  bidId: string;
  tenderId: string;
  requirementId: string;
  assessment: OfficerAssessmentValue;
  comment: string;
  officerId: string;
  createdAt: string;
  updatedAt: string;
}

// Phase 8 — the officer's final procurement decision. Human-only: never
// derived from PASS/FAIL/REVIEW counts.
export type FinalDecisionValue = 'ACCEPTED' | 'REVIEW' | 'REJECTED';

export interface ApiFinalBidDecision {
  _id: string;
  bidId: string;
  tenderId: string;
  decision: FinalDecisionValue;
  comment: string;
  reason: string;
  officerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAuditEvent {
  _id: string;
  tenderId: string;
  bidId: string;
  officerId: string;
  action: string;
  entityType: string;
  entityId?: string;
  result: string;
  context: Record<string, unknown>;
  before?: unknown;
  after?: unknown;
  timestamp: string;
}

export interface ApiOfficerReviewRow {
  documentId: string;
  filename: string;
  error?: string;
  bidId: string;
  bidReference?: string;
  tenderNumber: string;
  organizationName: string;
}

export interface ApiProfile {
  _id: string;
  userId: string;
  organizationName: string;
  registrationNumber: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  verificationStatus: 'pending' | 'verified';
}
