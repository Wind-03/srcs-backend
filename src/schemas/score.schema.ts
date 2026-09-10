import { z } from 'zod';
import {
  AssessmentType,
  MatchStrategy,
  nonEmptyString,
  scoreValue,
  uuid,
} from './common.schema';

/**
 * The canonical columns SRCS expects in an uploaded score table (PRD §4.3).
 * The parser maps arbitrary spreadsheet headers onto these fields.
 */
export const REQUIRED_IDENTIFIER_FIELDS = [
  'registrationNumber',
  'utmeNumber',
  'fullName',
  'department',
] as const;

/**
 * A single row parsed out of an uploaded workbook, before it has been matched
 * to a persisted student. All fields are optional at this stage because the
 * whole point of the audit step is to detect what is missing or malformed.
 */
export const rawScoreRowSchema = z.object({
  rowNumber: z.number().int().positive(), // 1-based row in the sheet (for reporting)
  fullName: z.string().trim().optional(),
  registrationNumber: z.string().trim().optional(),
  utmeNumber: z.string().trim().optional(),
  department: z.string().trim().optional(),
  score: z.number().optional(),
});
export type RawScoreRow = z.infer<typeof rawScoreRowSchema>;

/** A persisted raw component score for one student on one course. */
export const scoreSchema = z.object({
  id: uuid,
  courseId: uuid,
  studentId: uuid,
  assessmentType: AssessmentType,
  rawScore: scoreValue,
  uploadedById: uuid,
  uploadBatchId: uuid,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Score = z.infer<typeof scoreSchema>;

/** Manual edit of a single score (PRD §4.9 — must record old/new/reason). */
export const editScoreSchema = z.object({
  rawScore: scoreValue,
  reason: nonEmptyString,
});
export type EditScoreDto = z.infer<typeof editScoreSchema>;

/* -------------------------------------------------------------------------- */
/*  Upload audit report                                                       */
/* -------------------------------------------------------------------------- */

export const AuditSeverity = z.enum(['ERROR', 'WARNING']);
export type AuditSeverity = z.infer<typeof AuditSeverity>;

export const AuditIssueCode = z.enum([
  'MISSING_REQUIRED_COLUMN',
  'DUPLICATE_REGISTRATION_NUMBER',
  'DUPLICATE_UTME_NUMBER',
  'DUPLICATE_NAME_AND_DEPARTMENT',
  'DUPLICATE_ROW',
  'MISSING_IDENTIFIER',
  'MISSING_SCORE',
  'INVALID_SCORE',
  'SCORE_OUT_OF_RANGE',
  'EMPTY_SHEET',
]);
export type AuditIssueCode = z.infer<typeof AuditIssueCode>;

export const auditIssueSchema = z.object({
  code: AuditIssueCode,
  severity: AuditSeverity,
  message: nonEmptyString,
  rows: z.array(z.number().int().positive()).default([]),
  column: z.string().optional(),
});
export type AuditIssue = z.infer<typeof auditIssueSchema>;

/**
 * The full report produced when a workbook is audited before import.
 * `ok` is true only when there are zero ERROR-severity issues.
 */
export const uploadAuditReportSchema = z.object({
  ok: z.boolean(),
  totalRows: z.number().int().nonnegative(),
  validRows: z.number().int().nonnegative(),
  detectedColumns: z.record(z.string(), z.string()), // canonicalField -> sheet header
  issues: z.array(auditIssueSchema),
});
export type UploadAuditReport = z.infer<typeof uploadAuditReportSchema>;

/* -------------------------------------------------------------------------- */
/*  Upload request DTO                                                         */
/* -------------------------------------------------------------------------- */

export const uploadScoresSchema = z.object({
  courseId: uuid,
  assessmentType: AssessmentType,
  /**
   * When false, the upload is audited and previewed but not committed; when
   * true, rows that pass validation are imported. Defaults to a dry run so a
   * lecturer always sees the match preview first (PRD §8.3).
   */
  commit: z.coerce.boolean().default(false),
});
export type UploadScoresDto = z.infer<typeof uploadScoresSchema>;

/** Per-row match outcome shown in the upload preview (PRD §8.3). */
export const matchPreviewRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  fullName: z.string().optional(),
  registrationNumber: z.string().optional(),
  score: z.number().optional(),
  matchStrategy: MatchStrategy,
  matchedStudentId: uuid.nullable(),
});
export type MatchPreviewRow = z.infer<typeof matchPreviewRowSchema>;
