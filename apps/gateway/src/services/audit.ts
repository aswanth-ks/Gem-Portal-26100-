import { AuditEvent, type AUDIT_ACTIONS } from '../models/AuditEvent.js';

// Phase 8 — the single write path for the append-only audit log. Every real
// action that should be auditable calls this directly from its own route
// handler; nothing "batches" or infers audit events after the fact.
export async function recordAuditEvent(input: {
  tenderId: unknown;
  bidId: unknown;
  officerId: string;
  action: (typeof AUDIT_ACTIONS)[number];
  entityType: string;
  entityId?: unknown;
  result?: string;
  context?: Record<string, unknown>;
  before?: unknown;
  after?: unknown;
}) {
  await AuditEvent.create({
    tenderId: input.tenderId,
    bidId: input.bidId,
    officerId: input.officerId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    result: input.result ?? '',
    context: input.context ?? {},
    before: input.before,
    after: input.after,
    timestamp: new Date(),
  });
}
