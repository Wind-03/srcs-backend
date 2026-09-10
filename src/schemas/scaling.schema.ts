import { z } from 'zod';
import { ScalingTarget, nonEmptyString, uuid } from './common.schema';

/**
 * Scaling definitions (PRD §4.5). A discriminated union on `method` keeps each
 * method's parameters type-safe and self-validating — you cannot, for example,
 * submit a range conversion without both input and output ranges.
 */

const baseFields = {
  target: ScalingTarget,
  /** Mandatory approval reference — scaling cannot be applied without it (PRD §7.1). */
  approvalReference: nonEmptyString,
  reason: z.string().trim().max(500).optional(),
};

// discriminatedUnion members must be plain ZodObjects (no .refine wrapper), so
// cross-field checks live in a union-level superRefine below.
export const rangeConversionSchema = z.object({
  method: z.literal('RANGE_CONVERSION'),
  inputMin: z.number().finite(),
  inputMax: z.number().finite(),
  outputMin: z.number().finite(),
  outputMax: z.number().finite(),
  ...baseFields,
});

export const fixedBonusSchema = z.object({
  method: z.literal('FIXED_BONUS'),
  bonus: z.number().finite(),
  /** Optional cap so a bonus never pushes a score above the component max. */
  cap: z.number().finite().optional(),
  ...baseFields,
});

export const percentageSchema = z.object({
  method: z.literal('PERCENTAGE'),
  /** e.g. 110 raises every score by 10%, 90 lowers by 10%. */
  percentage: z.number().finite().positive(),
  cap: z.number().finite().optional(),
  ...baseFields,
});

export const scalingRuleSchema = z
  .discriminatedUnion('method', [
    rangeConversionSchema,
    fixedBonusSchema,
    percentageSchema,
  ])
  .superRefine((rule, ctx) => {
    if (rule.method === 'RANGE_CONVERSION') {
      if (rule.inputMax <= rule.inputMin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'inputMax must be greater than inputMin',
          path: ['inputMax'],
        });
      }
      if (rule.outputMax <= rule.outputMin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'outputMax must be greater than outputMin',
          path: ['outputMax'],
        });
      }
    }
  });
export type ScalingRule = z.infer<typeof scalingRuleSchema>;

/** Request body for previewing or applying a scaling rule to a course. */
export const applyScalingSchema = z.object({
  courseId: uuid,
  rule: scalingRuleSchema,
});
export type ApplyScalingDto = z.infer<typeof applyScalingSchema>;

/** Persisted record of an applied scaling action (immutable, PRD §4.9). */
export const scalingActionSchema = z.object({
  id: uuid,
  courseId: uuid,
  target: ScalingTarget,
  method: z.string(),
  parameters: z.record(z.string(), z.unknown()),
  approvalReference: nonEmptyString,
  appliedById: uuid,
  createdAt: z.date(),
});
export type ScalingAction = z.infer<typeof scalingActionSchema>;
