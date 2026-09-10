import { z } from 'zod';
import { nonEmptyString, uuid } from './common.schema';

/**
 * One band of the institution's grading scale (PRD §4.6). A band matches when
 * `minScore <= score <= maxScore`. `isPass` drives pass/fail statistics.
 */
export const gradeBandSchema = z
  .object({
    grade: nonEmptyString, // e.g. "A", "B", "F"
    minScore: z.number().min(0).max(100),
    maxScore: z.number().min(0).max(100),
    isPass: z.boolean(),
  })
  .refine((b) => b.minScore <= b.maxScore, {
    message: 'minScore must be less than or equal to maxScore',
    path: ['minScore'],
  });
export type GradeBand = z.infer<typeof gradeBandSchema>;

/**
 * A full grading scale. Bands must cover 0–100 without gaps or overlaps; this
 * is enforced by `superRefine` so an admin cannot save an inconsistent scale.
 */
export const gradingScaleSchema = z.object({
  id: uuid,
  name: nonEmptyString,
  isDefault: z.boolean(),
  bands: z.array(gradeBandSchema).min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type GradingScale = z.infer<typeof gradingScaleSchema>;

/** Validates that a set of bands tiles [0,100] with no gaps or overlaps. */
export function assertContiguousBands(
  bands: GradeBand[],
  ctx: z.RefinementCtx,
): void {
  const sorted = [...bands].sort((a, b) => a.minScore - b.minScore);
  if (sorted.length === 0) return;

  if (sorted[0]!.minScore !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Grade bands must start at 0',
      path: ['bands'],
    });
  }
  if (sorted[sorted.length - 1]!.maxScore !== 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Grade bands must end at 100',
      path: ['bands'],
    });
  }
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    // Bands are inclusive on both ends, so the next band should start exactly
    // one unit above the previous band's max (integer-boundary scales) OR at
    // the same boundary for continuous scales. We require prev.max < curr.min
    // to forbid overlap and prev.max + gap to forbid holes larger than a point.
    if (curr.minScore <= prev.maxScore) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Grade bands "${prev.grade}" and "${curr.grade}" overlap`,
        path: ['bands'],
      });
    } else if (curr.minScore - prev.maxScore > 1.0001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Gap between grade bands "${prev.grade}" and "${curr.grade}"`,
        path: ['bands'],
      });
    }
  }
}

export const createGradingScaleSchema = z
  .object({
    name: nonEmptyString,
    isDefault: z.boolean().default(false),
    bands: z.array(gradeBandSchema).min(1),
  })
  .superRefine((val, ctx) => assertContiguousBands(val.bands, ctx));
export type CreateGradingScaleDto = z.infer<typeof createGradingScaleSchema>;

/** A sensible default 5-point scale, used when no scale is configured. */
export const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { grade: 'A', minScore: 70, maxScore: 100, isPass: true },
  { grade: 'B', minScore: 60, maxScore: 69, isPass: true },
  { grade: 'C', minScore: 50, maxScore: 59, isPass: true },
  { grade: 'D', minScore: 45, maxScore: 49, isPass: true },
  { grade: 'E', minScore: 40, maxScore: 44, isPass: true },
  { grade: 'F', minScore: 0, maxScore: 39, isPass: false },
];
