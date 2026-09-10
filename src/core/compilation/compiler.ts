import {
  type CompiledRow,
  type ComponentMax,
  type GradeBand,
  type MatchStrategy,
} from '../../schemas';
import { assignGrade } from '../grading/grader';

/** A student's four raw component scores gathered for one course. */
export interface StudentComponents {
  studentId: string | null;
  fullName: string;
  registrationNumber: string;
  utmeNumber: string | null;
  department: string;
  test: number | null;
  practical: number | null;
  assignment: number | null;
  examination: number | null;
  matchStrategy: MatchStrategy;
}

export interface CompileOptions {
  componentMax: ComponentMax;
  gradeBands: GradeBand[];
  /** Components that must be present for a row to be "complete". */
  requiredComponents?: Array<keyof ComponentMax>;
}

const sum = (...vals: Array<number | null>): number =>
  vals.reduce<number>((acc, v) => acc + (v ?? 0), 0);

/**
 * Compile one student's components into a graded result row (PRD §4.4).
 *
 * The total is the plain sum of raw component scores (each already out of its
 * own maximum), matching the PRD example Test 20 + Practical 20 + Exam 60 = 100.
 * Grading is done on the total expressed as a percentage of the maximum
 * obtainable, so scales still work when component maxima do not sum to 100.
 */
export function compileRow(
  input: StudentComponents,
  options: CompileOptions,
): CompiledRow {
  const { componentMax, gradeBands } = options;
  const requiredComponents =
    options.requiredComponents ??
    (Object.entries(componentMax)
      .filter(([, max]) => max > 0)
      .map(([k]) => k) as Array<keyof ComponentMax>);

  const total = sum(
    input.test,
    input.practical,
    input.assignment,
    input.examination,
  );

  const totalMax =
    componentMax.TEST +
    componentMax.PRACTICAL +
    componentMax.ASSIGNMENT +
    componentMax.EXAMINATION;

  const gradingScore = totalMax > 0 ? (total / totalMax) * 100 : 0;
  const { grade, isPass } = assignGrade(gradingScore, gradeBands);

  const presence: Record<keyof ComponentMax, number | null> = {
    TEST: input.test,
    PRACTICAL: input.practical,
    ASSIGNMENT: input.assignment,
    EXAMINATION: input.examination,
  };
  const incomplete = requiredComponents.some((c) => presence[c] === null);

  return {
    studentId: input.studentId,
    fullName: input.fullName,
    registrationNumber: input.registrationNumber,
    utmeNumber: input.utmeNumber,
    department: input.department,
    test: input.test,
    practical: input.practical,
    assignment: input.assignment,
    examination: input.examination,
    total: round2(total),
    scaledTotal: null,
    grade,
    isPass,
    matchStrategy: input.matchStrategy,
    incomplete,
  };
}

/** Compile a whole course. Rows are returned in the given order. */
export function compileCourse(
  students: StudentComponents[],
  options: CompileOptions,
): CompiledRow[] {
  return students.map((s) => compileRow(s, options));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
