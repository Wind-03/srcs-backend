import type { AuditAction, CreateAuditLogDto } from '../../schemas';

/**
 * Small factory for audit-trail entries (PRD §4.9). Centralising construction
 * keeps every logged action shaped consistently (old/new/reason/metadata) so
 * the immutable trail is uniform and queryable.
 */
export function buildAuditEntry(params: {
  action: AuditAction;
  actorId: string;
  entity: string;
  entityId?: string | null;
  courseId?: string | null;
  studentId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}): CreateAuditLogDto {
  return {
    action: params.action,
    actorId: params.actorId,
    entity: params.entity,
    entityId: params.entityId ?? null,
    courseId: params.courseId ?? null,
    studentId: params.studentId ?? null,
    oldValue: params.oldValue ?? null,
    newValue: params.newValue ?? null,
    reason: params.reason ?? null,
    metadata: params.metadata ?? null,
  };
}
