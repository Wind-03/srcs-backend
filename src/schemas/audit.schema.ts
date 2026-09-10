import { z } from 'zod';
import { AuditAction, uuid } from './common.schema';

/**
 * An immutable audit-trail entry (PRD §4.9 / §7.1). Records who did what, when,
 * with old/new values and a reason. Entries are append-only — the persistence
 * layer must expose no update or delete for this table.
 */
export const auditLogSchema = z.object({
  id: uuid,
  action: AuditAction,
  actorId: uuid,
  courseId: uuid.nullable(),
  studentId: uuid.nullable(),
  entity: z.string(), // e.g. "Score", "ScalingAction", "Session"
  entityId: z.string().nullable(),
  oldValue: z.unknown().nullable(),
  newValue: z.unknown().nullable(),
  reason: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
});
export type AuditLog = z.infer<typeof auditLogSchema>;

/** Input used to construct an audit entry before persistence. */
export const createAuditLogSchema = auditLogSchema
  .omit({ id: true, createdAt: true })
  .partial({
    courseId: true,
    studentId: true,
    entityId: true,
    oldValue: true,
    newValue: true,
    reason: true,
    metadata: true,
  });
export type CreateAuditLogDto = z.infer<typeof createAuditLogSchema>;

/** Filters for the admin audit view (PRD §8.8). */
export const auditQuerySchema = z.object({
  courseId: uuid.optional(),
  action: AuditAction.optional(),
  actorId: uuid.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
});
export type AuditQueryDto = z.infer<typeof auditQuerySchema>;
