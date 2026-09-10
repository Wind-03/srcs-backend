import {
  type CompiledRow,
  type GradeBand,
  type GradeDistribution,
  type ResultStatistics,
  type ScalingPreview,
  type ScalingRule,
} from '../../schemas';
import { applyRuleToRows } from '../scaling/apply';

/**
 * Compute summary statistics for a set of compiled rows (PRD §4.7).
 * The effective score used is the scaled total when present, else the total.
 */
export function computeStatistics(rows: CompiledRow[]): ResultStatistics {
  const distribution: GradeDistribution = {};
  let passCount = 0;
  let highest = Number.NEGATIVE_INFINITY;
  let lowest = Number.POSITIVE_INFINITY;
  let totalSum = 0;

  for (const row of rows) {
    const score = row.scaledTotal ?? row.total;
    distribution[row.grade] = (distribution[row.grade] ?? 0) + 1;
    if (row.isPass) passCount++;
    if (score > highest) highest = score;
    if (score < lowest) lowest = score;
    totalSum += score;
  }

  const totalStudents = rows.length;
  const failCount = totalStudents - passCount;
  const passRate = totalStudents ? (passCount / totalStudents) * 100 : 0;

  return {
    totalStudents,
    passCount,
    failCount,
    passRate: round2(passRate),
    failRate: round2(totalStudents ? 100 - passRate : 0),
    highestScore: totalStudents ? round2(highest) : 0,
    lowestScore: totalStudents ? round2(lowest) : 0,
    average: totalStudents ? round2(totalSum / totalStudents) : 0,
    gradeDistribution: distribution,
  };
}

/**
 * Produce a before/after preview of applying a scaling rule to a course
 * (PRD §4.5, §8.5) without mutating the input rows. Recomputes each affected
 * student's total, grade and pass/fail, and the overall pass-rate shift.
 */
export function previewScaling(
  rows: CompiledRow[],
  rule: ScalingRule,
  gradeBands: GradeBand[],
  totalMax: number,
): ScalingPreview {
  const scaledRows = applyRuleToRows(rows, rule, gradeBands, totalMax);

  const before = computeStatistics(rows);
  const after = computeStatistics(scaledRows);

  const previewRows = rows.map((row, i) => {
    const scaled = scaledRows[i]!;
    const oldTotal = row.scaledTotal ?? row.total;
    const newTotal = scaled.scaledTotal ?? scaled.total;
    return {
      registrationNumber: row.registrationNumber,
      fullName: row.fullName,
      oldTotal: round2(oldTotal),
      newTotal: round2(newTotal),
      oldGrade: row.grade,
      newGrade: scaled.grade,
      changed: oldTotal !== newTotal || row.grade !== scaled.grade,
    };
  });

  return {
    before,
    after,
    passRateDelta: round2(after.passRate - before.passRate),
    affectedStudents: previewRows.filter((r) => r.changed).length,
    rows: previewRows,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
