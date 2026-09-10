/**
 * Column mapping (PRD §4.3).
 *
 * Uploaded workbooks come from many hands and never use identical headers.
 * This module maps a sheet's real headers onto the canonical fields SRCS needs,
 * using a normalised-alias lookup so "Reg No", "MATRIC NUMBER" and
 * "registration_number" all resolve to `registrationNumber`.
 */

export type CanonicalField =
  | 'fullName'
  | 'registrationNumber'
  | 'utmeNumber'
  | 'department'
  | 'score';

/** Known header aliases per canonical field (compared after normalisation). */
const FIELD_ALIASES: Record<CanonicalField, string[]> = {
  fullName: ['fullname', 'name', 'studentname', 'fullnames', 'student'],
  registrationNumber: [
    'registrationnumber',
    'regno',
    'regnumber',
    'matricnumber',
    'matricno',
    'matric',
    'registrationno',
  ],
  utmeNumber: ['utmenumber', 'utmeno', 'utme', 'jambno', 'jambnumber', 'jamb'],
  department: ['department', 'dept', 'programme', 'program', 'faculty'],
  score: [
    'score',
    'scores',
    'mark',
    'marks',
    'grade',
    'total',
    'value',
    'result',
  ],
};

/** Normalise a header for comparison: lower-case, strip non-alphanumerics. */
export function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Given the raw header row, return a map of canonicalField -> actual header.
 * A field is only included when a matching header is found, so callers can
 * detect missing required columns.
 */
export function detectColumns(
  headers: string[],
): Partial<Record<CanonicalField, string>> {
  const normalisedHeaders = headers.map((h) => ({
    original: h,
    normal: normaliseHeader(h),
  }));

  const mapping: Partial<Record<CanonicalField, string>> = {};

  for (const field of Object.keys(FIELD_ALIASES) as CanonicalField[]) {
    const aliases = FIELD_ALIASES[field];
    // Prefer an exact alias match; the score field additionally accepts the
    // assessment-type word (e.g. a "Test" column) resolved by the caller.
    const found = normalisedHeaders.find((h) => aliases.includes(h.normal));
    if (found) mapping[field] = found.original;
  }

  return mapping;
}

/**
 * Resolve the score column when the header is named after the assessment type
 * itself (e.g. a "PRACTICAL" column in a practical upload) rather than a
 * generic "Score" header.
 */
export function resolveScoreColumn(
  headers: string[],
  assessmentType: string,
  detected: Partial<Record<CanonicalField, string>>,
): string | undefined {
  if (detected.score) return detected.score;
  const target = normaliseHeader(assessmentType);
  const match = headers.find((h) => normaliseHeader(h) === target);
  return match;
}
