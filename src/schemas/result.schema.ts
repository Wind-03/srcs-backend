import { z } from 'zod';
import { MatchStrategy, nonEmptyString, uuid } from './common.schema';

/**
 * One fully compiled student result row: raw component scores, computed total,
 * assigned grade, and the provenance of how it was matched (PRD §5, §4.4).
 */
export const compiledRowSchema = z.object({
  studentId: uuid.nullable(),
  fullName: nonEmptyString,
  registrationNumber: z.string(),
  utmeNumber: z.string().nullable(),
  department: z.string(),
  test: z.number().nullable(),
  practical: z.number().nullable(),
  assignment: z.number().nullable(),
  examination: z.number().nullable(),
  total: z.number(),
  scaledTotal: z.number().nullable(),
  grade: z.string(),
  isPass: z.boolean(),
  matchStrategy: MatchStrategy,
  /** True when a required component is missing — surfaced, never dropped. */
  incomplete: z.boolean(),
});
export type CompiledRow = z.infer<typeof compiledRowSchema>;

export const gradeDistributionSchema = z.record(z.string(), z.number().int());
export type GradeDistribution = z.infer<typeof gradeDistributionSchema>;

/** Summary statistics for a compiled course (PRD §4.7). */
export const resultStatisticsSchema = z.object({
  totalStudents: z.number().int().nonnegative(),
  passCount: z.number().int().nonnegative(),
  failCount: z.number().int().nonnegative(),
  passRate: z.number().min(0).max(100),
  failRate: z.number().min(0).max(100),
  highestScore: z.number(),
  lowestScore: z.number(),
  average: z.number(),
  gradeDistribution: gradeDistributionSchema,
});
export type ResultStatistics = z.infer<typeof resultStatisticsSchema>;

/** Before/after comparison for a scaling preview (PRD §4.7, §8.5). */
export const scalingPreviewSchema = z.object({
  before: resultStatisticsSchema,
  after: resultStatisticsSchema,
  passRateDelta: z.number(),
  affectedStudents: z.number().int().nonnegative(),
  rows: z.array(
    z.object({
      registrationNumber: z.string(),
      fullName: z.string(),
      oldTotal: z.number(),
      newTotal: z.number(),
      oldGrade: z.string(),
      newGrade: z.string(),
      changed: z.boolean(),
    }),
  ),
});
export type ScalingPreview = z.infer<typeof scalingPreviewSchema>;

/** A fully compiled course result: rows + statistics. */
export const compiledResultSchema = z.object({
  courseId: uuid,
  courseCode: z.string(),
  courseTitle: z.string(),
  rows: z.array(compiledRowSchema),
  statistics: resultStatisticsSchema,
  unmatchedCount: z.number().int().nonnegative(),
});
export type CompiledResult = z.infer<typeof compiledResultSchema>;
