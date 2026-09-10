import { z } from 'zod';

/**
 * Shared primitives and enums used across the SRCS domain.
 *
 * These Zod schemas are the single source of truth for both runtime validation
 * and compile-time types (via `z.infer`). Domain code never depends on the
 * persistence layer's generated types — it depends on the types inferred here.
 */

/** Assessment component a raw score belongs to. */
export const AssessmentType = z.enum([
  'TEST',
  'PRACTICAL',
  'ASSIGNMENT',
  'EXAMINATION',
]);
export type AssessmentType = z.infer<typeof AssessmentType>;

/** System roles. Drives role-based access control (RBAC). */
export const UserRole = z.enum(['LECTURER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRole>;

/** Supported scaling strategies (PRD §4.5). */
export const ScalingMethod = z.enum([
  'RANGE_CONVERSION', // map [inMin,inMax] -> [outMin,outMax]
  'FIXED_BONUS', // add a constant to every student
  'PERCENTAGE', // multiply by a percentage factor
]);
export type ScalingMethod = z.infer<typeof ScalingMethod>;

/** Target a scaling action applies to (a component, or the compiled total). */
export const ScalingTarget = z.enum([
  'TEST',
  'PRACTICAL',
  'ASSIGNMENT',
  'EXAMINATION',
  'TOTAL',
]);
export type ScalingTarget = z.infer<typeof ScalingTarget>;

/** Actions captured in the immutable audit trail (PRD §4.9). */
export const AuditAction = z.enum([
  'UPLOAD',
  'SCORE_EDIT',
  'SCALING_APPLY',
  'COMPILE',
  'EXPORT',
  'LOGIN',
  'GRADE_SCALE_UPDATE',
]);
export type AuditAction = z.infer<typeof AuditAction>;

/** How a compiled row was matched across component tables (PRD §4.4). */
export const MatchStrategy = z.enum([
  'REGISTRATION_NUMBER', // primary key
  'UTME_NUMBER', // secondary key
  'NAME_AND_DEPARTMENT', // fallback
  'UNMATCHED', // no match — surfaced, never silently dropped
]);
export type MatchStrategy = z.infer<typeof MatchStrategy>;

/** A finite, non-negative score. Rejects NaN/Infinity that xlsx can produce. */
export const scoreValue = z
  .number({ invalid_type_error: 'Score must be a number' })
  .finite('Score must be a finite number')
  .min(0, 'Score cannot be negative');

/** Trimmed non-empty string helper. */
export const nonEmptyString = z
  .string()
  .trim()
  .min(1, 'Value cannot be empty');

/** UUID identifier used for all persisted entities. */
export const uuid = z.string().uuid();

/** ISO-8601 datetime string. */
export const isoDateTime = z.string().datetime();

/**
 * A registration number, normalised for matching: upper-cased, internal
 * whitespace collapsed, surrounding whitespace removed. Institutions format
 * these inconsistently (e.g. "csc/2019/139" vs "CSC / 2019 / 139").
 */
export const registrationNumber = z
  .string()
  .trim()
  .min(1)
  .transform((v) => v.toUpperCase().replace(/\s+/g, ''));

export const utmeNumber = z
  .string()
  .trim()
  .min(1)
  .transform((v) => v.toUpperCase().replace(/\s+/g, ''));
