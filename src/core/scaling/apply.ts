import type {
  CompiledRow,
  GradeBand,
  ScalingRule,
  ScalingTarget,
} from '../../schemas';
import { assignGrade } from '../grading/grader';
import { applyScaling } from './scaler';

type ComponentField = 'test' | 'practical' | 'assignment' | 'examination';

function fieldForTarget(target: ScalingTarget): ComponentField | 'TOTAL' {
  switch (target) {
    case 'TEST':
      return 'test';
    case 'PRACTICAL':
      return 'practical';
    case 'ASSIGNMENT':
      return 'assignment';
    case 'EXAMINATION':
      return 'examination';
    case 'TOTAL':
      return 'TOTAL';
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function recomputeTotalAndGrade(
  row: CompiledRow,
  gradeBands: GradeBand[],
  totalMax: number,
): CompiledRow {
  const total =
    (row.test ?? 0) +
    (row.practical ?? 0) +
    (row.assignment ?? 0) +
    (row.examination ?? 0);
  const effective = row.scaledTotal ?? total;
  const gradingScore = totalMax > 0 ? (effective / totalMax) * 100 : 0;
  const { grade, isPass } = assignGrade(gradingScore, gradeBands);
  return { ...row, total: round2(total), grade, isPass };
}

/**
 * Apply one scaling rule to a set of compiled rows, returning new rows (never
 * mutates the input). Component scaling adjusts the component then recomputes
 * the total; TOTAL scaling sets `scaledTotal`. Grades are always recomputed so
 * the result stays internally consistent (PRD §4.5).
 */
export function applyRuleToRows(
  rows: CompiledRow[],
  rule: ScalingRule,
  gradeBands: GradeBand[],
  totalMax: number,
): CompiledRow[] {
  const target = fieldForTarget(rule.target);

  return rows.map((row) => {
    let next: CompiledRow = { ...row };

    if (target === 'TOTAL') {
      const base = row.scaledTotal ?? row.total;
      next.scaledTotal = applyScaling(base, rule);
    } else {
      const current = row[target];
      if (current !== null) {
        next[target] = applyScaling(current, rule);
      }
    }

    next = recomputeTotalAndGrade(next, gradeBands, totalMax);
    return next;
  });
}

/** Apply a sequence of rules in order (used when compiling persisted actions). */
export function applyRulesToRows(
  rows: CompiledRow[],
  rules: ScalingRule[],
  gradeBands: GradeBand[],
  totalMax: number,
): CompiledRow[] {
  return rules.reduce(
    (acc, rule) => applyRuleToRows(acc, rule, gradeBands, totalMax),
    rows,
  );
}
