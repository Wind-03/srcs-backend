import * as XLSX from 'xlsx';
import type { RawScoreRow } from '../../schemas';
import {
  type CanonicalField,
  detectColumns,
  resolveScoreColumn,
} from './column-mapping';

export interface ParsedWorkbook {
  /** Canonical field -> the actual header found in the sheet. */
  detectedColumns: Partial<Record<CanonicalField, string>>;
  /** The real header used for the score column (may be the assessment name). */
  scoreColumn?: string;
  /** One entry per data row, in sheet order, with 1-based `rowNumber`. */
  rows: RawScoreRow[];
  /** Names of the sheets in the workbook. */
  sheetNames: string[];
}

/** Coerce a cell into a finite number, or `undefined` when not numeric. */
function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const cleaned = String(value).trim().replace(/,/g, '');
  if (cleaned === '') return undefined;
  const n = Number(cleaned);
  return Number.isNaN(n) ? NaN : n;
}

function toStringOrUndefined(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s === '' ? undefined : s;
}

/**
 * Parse a workbook (xlsx, xls or csv) from a Buffer into canonical rows.
 *
 * Uses SheetJS to read the first non-empty sheet, detects the header row and
 * column mapping, then projects each data row onto the canonical fields. No
 * validation is performed here — that is the auditor's job — so malformed data
 * survives as `undefined`/`NaN` for the auditor to flag.
 */
export function parseScoreWorkbook(
  buffer: Buffer,
  assessmentType: string,
  sheetName?: string,
): ParsedWorkbook {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetNames = workbook.SheetNames;

  const targetSheetName = sheetName ?? sheetNames[0];
  const sheet = targetSheetName
    ? workbook.Sheets[targetSheetName]
    : undefined;

  if (!sheet) {
    return { detectedColumns: {}, rows: [], sheetNames };
  }

  // header:1 => array-of-arrays so we control header detection ourselves.
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: null,
  });

  if (matrix.length === 0) {
    return { detectedColumns: {}, rows: [], sheetNames };
  }

  const headerRow = (matrix[0] ?? []).map((c) =>
    c === null || c === undefined ? '' : String(c),
  );
  const detectedColumns = detectColumns(headerRow);
  const scoreColumn = resolveScoreColumn(
    headerRow,
    assessmentType,
    detectedColumns,
  );

  // Build header -> column-index lookup once.
  const indexOf = (header?: string): number =>
    header ? headerRow.findIndex((h) => h === header) : -1;

  const idx = {
    fullName: indexOf(detectedColumns.fullName),
    registrationNumber: indexOf(detectedColumns.registrationNumber),
    utmeNumber: indexOf(detectedColumns.utmeNumber),
    department: indexOf(detectedColumns.department),
    score: indexOf(scoreColumn),
  };

  const cell = (row: unknown[], i: number): unknown =>
    i >= 0 && i < row.length ? row[i] : undefined;

  const rows: RawScoreRow[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    // 1-based row number as seen in the spreadsheet (header is row 1).
    const rowNumber = r + 1;
    rows.push({
      rowNumber,
      fullName: toStringOrUndefined(cell(row, idx.fullName)),
      registrationNumber: toStringOrUndefined(
        cell(row, idx.registrationNumber),
      ),
      utmeNumber: toStringOrUndefined(cell(row, idx.utmeNumber)),
      department: toStringOrUndefined(cell(row, idx.department)),
      score: toNumberOrUndefined(cell(row, idx.score)),
    });
  }

  return { detectedColumns, scoreColumn, rows, sheetNames };
}
