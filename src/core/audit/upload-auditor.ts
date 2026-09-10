import {
  type AuditIssue,
  type RawScoreRow,
  type UploadAuditReport,
} from '../../schemas';
import {
  type CanonicalField,
  normaliseHeader,
} from '../xlsx/column-mapping';
import type { ParsedWorkbook } from '../xlsx/workbook.parser';

export interface AuditOptions {
  /** Maximum obtainable score for this component; scores above are flagged. */
  maxScore?: number;
  /**
   * Which identifier fields must be present. Registration number is always
   * required; UTME/department are treated as recommended (warnings) since the
   * matcher can fall back. Callers may override.
   */
  requiredIdentifiers?: CanonicalField[];
}

/** Group row numbers by a normalised key, keeping only keys that repeat. */
function findDuplicates(
  rows: RawScoreRow[],
  keyFn: (row: RawScoreRow) => string | undefined,
): Map<string, number[]> {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    const list = buckets.get(key) ?? [];
    list.push(row.rowNumber);
    buckets.set(key, list);
  }
  const dups = new Map<string, number[]>();
  for (const [key, list] of buckets) {
    if (list.length > 1) dups.set(key, list);
  }
  return dups;
}

const norm = (v?: string): string | undefined =>
  v ? v.toUpperCase().replace(/\s+/g, '') : undefined;

/**
 * Audit a parsed workbook before import (PRD §4.3, §7.3).
 *
 * Produces a structured report of every problem — duplicates, missing columns,
 * missing identifiers, missing/invalid/out-of-range scores — so nothing is
 * silently imported or dropped. `ok` is true only when there are no ERRORs.
 *
 * "Duplicate" detection is intentionally thorough: the same registration
 * number, the same UTME number, the same name+department, and fully identical
 * rows are each reported separately, because each implies a different data-entry
 * mistake a lecturer needs to resolve.
 */
export function auditWorkbook(
  parsed: ParsedWorkbook,
  options: AuditOptions = {},
): UploadAuditReport {
  const { rows, detectedColumns, scoreColumn } = parsed;
  const issues: AuditIssue[] = [];

  const requiredIdentifiers = options.requiredIdentifiers ?? [
    'registrationNumber',
  ];

  // --- Empty sheet -----------------------------------------------------------
  if (rows.length === 0) {
    issues.push({
      code: 'EMPTY_SHEET',
      severity: 'ERROR',
      message: 'The uploaded sheet has no data rows.',
      rows: [],
    });
    return buildReport(rows, detectedColumns, scoreColumn, issues);
  }

  // --- Missing required columns ---------------------------------------------
  for (const field of requiredIdentifiers) {
    if (!detectedColumns[field]) {
      issues.push({
        code: 'MISSING_REQUIRED_COLUMN',
        severity: 'ERROR',
        message: `Required column "${field}" could not be found in the sheet headers.`,
        rows: [],
        column: field,
      });
    }
  }
  if (!scoreColumn) {
    issues.push({
      code: 'MISSING_REQUIRED_COLUMN',
      severity: 'ERROR',
      message:
        'A score column could not be found. Expected a "Score" column or one named after the assessment type.',
      rows: [],
      column: 'score',
    });
  }
  // Department is recommended for fallback matching.
  if (!detectedColumns.department) {
    issues.push({
      code: 'MISSING_REQUIRED_COLUMN',
      severity: 'WARNING',
      message:
        'No "department" column found. Fallback matching by name + department will be unavailable.',
      rows: [],
      column: 'department',
    });
  }

  // --- Duplicate registration numbers ---------------------------------------
  for (const [key, rowNums] of findDuplicates(rows, (r) =>
    norm(r.registrationNumber),
  )) {
    issues.push({
      code: 'DUPLICATE_REGISTRATION_NUMBER',
      severity: 'ERROR',
      message: `Registration number "${key}" appears on ${rowNums.length} rows.`,
      rows: rowNums,
      column: 'registrationNumber',
    });
  }

  // --- Duplicate UTME numbers ------------------------------------------------
  for (const [key, rowNums] of findDuplicates(rows, (r) => norm(r.utmeNumber))) {
    issues.push({
      code: 'DUPLICATE_UTME_NUMBER',
      severity: 'ERROR',
      message: `UTME number "${key}" appears on ${rowNums.length} rows.`,
      rows: rowNums,
      column: 'utmeNumber',
    });
  }

  // --- Duplicate name + department ------------------------------------------
  for (const [key, rowNums] of findDuplicates(rows, (r) => {
    const name = norm(r.fullName);
    const dept = norm(r.department);
    return name && dept ? `${name}::${dept}` : undefined;
  })) {
    const [name] = key.split('::');
    issues.push({
      code: 'DUPLICATE_NAME_AND_DEPARTMENT',
      severity: 'WARNING',
      message: `Student "${name}" appears more than once within the same department (rows ${rowNums.join(', ')}).`,
      rows: rowNums,
    });
  }

  // --- Fully identical rows --------------------------------------------------
  for (const [, rowNums] of findDuplicates(rows, (r) =>
    [
      norm(r.registrationNumber) ?? '',
      norm(r.utmeNumber) ?? '',
      norm(r.fullName) ?? '',
      norm(r.department) ?? '',
      r.score ?? '',
    ].join('|'),
  )) {
    issues.push({
      code: 'DUPLICATE_ROW',
      severity: 'WARNING',
      message: `Rows ${rowNums.join(', ')} are exact duplicates of one another.`,
      rows: rowNums,
    });
  }

  // --- Per-row identifier / score checks ------------------------------------
  const missingIdentifierRows: number[] = [];
  const missingScoreRows: number[] = [];
  const invalidScoreRows: number[] = [];
  const outOfRangeRows: number[] = [];

  for (const row of rows) {
    const hasAnyIdentifier =
      !!norm(row.registrationNumber) ||
      !!norm(row.utmeNumber) ||
      (!!norm(row.fullName) && !!norm(row.department));
    if (!hasAnyIdentifier) missingIdentifierRows.push(row.rowNumber);

    if (row.score === undefined) {
      missingScoreRows.push(row.rowNumber);
    } else if (Number.isNaN(row.score) || !Number.isFinite(row.score)) {
      invalidScoreRows.push(row.rowNumber);
    } else if (row.score < 0) {
      invalidScoreRows.push(row.rowNumber);
    } else if (options.maxScore !== undefined && row.score > options.maxScore) {
      outOfRangeRows.push(row.rowNumber);
    }
  }

  pushIf(issues, missingIdentifierRows, {
    code: 'MISSING_IDENTIFIER',
    severity: 'ERROR',
    message:
      'Rows have no usable identifier (need a registration number, UTME number, or name + department).',
  });
  pushIf(issues, missingScoreRows, {
    code: 'MISSING_SCORE',
    severity: 'ERROR',
    message: 'Rows are missing a score value.',
  });
  pushIf(issues, invalidScoreRows, {
    code: 'INVALID_SCORE',
    severity: 'ERROR',
    message: 'Rows have a non-numeric or negative score.',
  });
  pushIf(issues, outOfRangeRows, {
    code: 'SCORE_OUT_OF_RANGE',
    severity: 'ERROR',
    message: `Rows have a score above the maximum obtainable mark (${options.maxScore}).`,
  });

  return buildReport(rows, detectedColumns, scoreColumn, issues);
}

function pushIf(
  issues: AuditIssue[],
  rows: number[],
  base: Omit<AuditIssue, 'rows'>,
): void {
  if (rows.length > 0) issues.push({ ...base, rows });
}

function buildReport(
  rows: RawScoreRow[],
  detectedColumns: Partial<Record<CanonicalField, string>>,
  scoreColumn: string | undefined,
  issues: AuditIssue[],
): UploadAuditReport {
  // A row is "valid" when it is not implicated in any ERROR-severity issue.
  const errorRows = new Set<number>();
  for (const issue of issues) {
    if (issue.severity === 'ERROR') {
      for (const rn of issue.rows) errorRows.add(rn);
    }
  }
  const validRows = rows.filter((r) => !errorRows.has(r.rowNumber)).length;

  const detected: Record<string, string> = {};
  for (const [field, header] of Object.entries(detectedColumns)) {
    if (header) detected[field] = header;
  }
  if (scoreColumn) detected.score = scoreColumn;

  const hasBlockingError = issues.some(
    (i) =>
      i.severity === 'ERROR' &&
      // structural errors block the whole upload
      (i.code === 'MISSING_REQUIRED_COLUMN' ||
        i.code === 'EMPTY_SHEET' ||
        i.code === 'DUPLICATE_REGISTRATION_NUMBER' ||
        i.code === 'DUPLICATE_UTME_NUMBER'),
  );

  return {
    ok: !hasBlockingError,
    totalRows: rows.length,
    validRows,
    detectedColumns: detected,
    issues: issues.sort((a, b) =>
      a.severity === b.severity ? 0 : a.severity === 'ERROR' ? -1 : 1,
    ),
  };
}

/** Convenience: is a report free of ERROR-severity issues entirely? */
export function isCleanReport(report: UploadAuditReport): boolean {
  return !report.issues.some((i) => i.severity === 'ERROR');
}

export { normaliseHeader };
