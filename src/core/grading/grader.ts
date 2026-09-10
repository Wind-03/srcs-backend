import { DEFAULT_GRADE_BANDS, type GradeBand } from '../../schemas';

export interface GradeResult {
  grade: string;
  isPass: boolean;
}

/**
 * Assign a grade to a score from a grading scale (PRD §4.6). Bands are inclusive
 * on both ends. The score is clamped to [0,100] so a scaled total slightly over
 * 100 still grades as the top band rather than falling through.
 */
export function assignGrade(
  score: number,
  bands: GradeBand[] = DEFAULT_GRADE_BANDS,
): GradeResult {
  const clamped = Math.max(0, Math.min(100, score));
  const band = bands.find(
    (b) => clamped >= b.minScore && clamped <= b.maxScore,
  );
  if (band) return { grade: band.grade, isPass: band.isPass };

  // No band matched (misconfigured scale) — fail closed rather than crash.
  const lowest = [...bands].sort((a, b) => a.minScore - b.minScore)[0];
  return { grade: lowest?.grade ?? 'F', isPass: false };
}
