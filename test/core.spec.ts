import * as XLSX from 'xlsx';
import {
  applyScaling,
  assignGrade,
  auditWorkbook,
  buildResultWorkbook,
  compileCourse,
  computeStatistics,
  matchRows,
  parseScoreWorkbook,
  previewScaling,
  type StudentComponents,
} from '../src/core';
import {
  DEFAULT_GRADE_BANDS,
  type ComponentMax,
  type CompiledResult,
  type ScalingRule,
} from '../src/schemas';

const componentMax: ComponentMax = {
  TEST: 20,
  PRACTICAL: 20,
  ASSIGNMENT: 0,
  EXAMINATION: 60,
};

function sheetBuffer(rows: Array<Record<string, unknown>>): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('parseScoreWorkbook', () => {
  it('maps varied headers to canonical fields', () => {
    const buf = sheetBuffer([
      { 'Reg No': 'CSC/2019/139', 'Full Name': 'Ada Lovelace', Dept: 'CSC', Test: 18 },
    ]);
    const parsed = parseScoreWorkbook(buf, 'TEST');
    expect(parsed.detectedColumns.registrationNumber).toBe('Reg No');
    expect(parsed.detectedColumns.fullName).toBe('Full Name');
    expect(parsed.scoreColumn).toBe('Test');
    expect(parsed.rows[0]).toMatchObject({
      registrationNumber: 'CSC/2019/139',
      fullName: 'Ada Lovelace',
      department: 'CSC',
      score: 18,
    });
  });

  it('parses numeric strings and leaves blanks undefined', () => {
    const buf = sheetBuffer([
      { RegNo: 'A1', Name: 'X', Dept: 'CSC', Score: '15' },
      { RegNo: 'A2', Name: 'Y', Dept: 'CSC', Score: '' },
    ]);
    const parsed = parseScoreWorkbook(buf, 'TEST');
    expect(parsed.rows[0]!.score).toBe(15);
    expect(parsed.rows[1]!.score).toBeUndefined();
  });
});

describe('auditWorkbook — duplicate & validation detection', () => {
  it('flags duplicate registration numbers as a blocking error', () => {
    const buf = sheetBuffer([
      { RegNo: 'CSC/2019/139', Name: 'A', Dept: 'CSC', Score: 10 },
      { RegNo: 'csc/2019/139', Name: 'B', Dept: 'CSC', Score: 12 }, // same after normalising
    ]);
    const parsed = parseScoreWorkbook(buf, 'TEST');
    const report = auditWorkbook(parsed, { maxScore: 20 });
    const dup = report.issues.find(
      (i) => i.code === 'DUPLICATE_REGISTRATION_NUMBER',
    );
    expect(dup).toBeDefined();
    expect(dup!.rows).toEqual([2, 3]); // 1-based incl. header
    expect(report.ok).toBe(false);
  });

  it('flags out-of-range and invalid scores', () => {
    const buf = sheetBuffer([
      { RegNo: 'A1', Name: 'A', Dept: 'CSC', Score: 25 }, // > max 20
      { RegNo: 'A2', Name: 'B', Dept: 'CSC', Score: 'abc' }, // invalid
      { RegNo: 'A3', Name: 'C', Dept: 'CSC', Score: 19 }, // ok
    ]);
    const parsed = parseScoreWorkbook(buf, 'TEST');
    const report = auditWorkbook(parsed, { maxScore: 20 });
    expect(report.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['SCORE_OUT_OF_RANGE', 'INVALID_SCORE']),
    );
    expect(report.validRows).toBe(1);
  });

  it('flags a missing required column', () => {
    const buf = sheetBuffer([{ Name: 'A', Dept: 'CSC', Score: 10 }]);
    const parsed = parseScoreWorkbook(buf, 'TEST');
    const report = auditWorkbook(parsed, { maxScore: 20 });
    expect(
      report.issues.some(
        (i) =>
          i.code === 'MISSING_REQUIRED_COLUMN' &&
          i.column === 'registrationNumber',
      ),
    ).toBe(true);
    expect(report.ok).toBe(false);
  });

  it('passes a clean sheet', () => {
    const buf = sheetBuffer([
      { RegNo: 'A1', Name: 'A', Dept: 'CSC', Score: 10 },
      { RegNo: 'A2', Name: 'B', Dept: 'CSC', Score: 12 },
    ]);
    const parsed = parseScoreWorkbook(buf, 'TEST');
    const report = auditWorkbook(parsed, { maxScore: 20 });
    expect(report.ok).toBe(true);
    expect(report.validRows).toBe(2);
  });
});

describe('matchRows', () => {
  const students = [
    { id: 's1', fullName: 'Ada Lovelace', registrationNumber: 'CSC/2019/139', utmeNumber: '11111', department: 'CSC' },
    { id: 's2', fullName: 'Alan Turing', registrationNumber: 'CSC/2019/140', utmeNumber: '22222', department: 'CSC' },
  ];

  it('matches by registration number first', () => {
    const res = matchRows([{ rowNumber: 2, registrationNumber: 'csc/2019/139' }], students);
    expect(res[0]).toMatchObject({ matchedStudentId: 's1', strategy: 'REGISTRATION_NUMBER' });
  });

  it('falls back to UTME then name+department', () => {
    const byUtme = matchRows([{ rowNumber: 2, utmeNumber: '22222' }], students);
    expect(byUtme[0]).toMatchObject({ matchedStudentId: 's2', strategy: 'UTME_NUMBER' });

    const byName = matchRows(
      [{ rowNumber: 2, fullName: 'Ada Lovelace', department: 'CSC' }],
      students,
    );
    expect(byName[0]).toMatchObject({ matchedStudentId: 's1', strategy: 'NAME_AND_DEPARTMENT' });
  });

  it('returns UNMATCHED when nothing resolves', () => {
    const res = matchRows([{ rowNumber: 2, registrationNumber: 'ZZZ' }], students);
    expect(res[0]!.strategy).toBe('UNMATCHED');
    expect(res[0]!.matchedStudentId).toBeNull();
  });
});

describe('grading', () => {
  it('assigns bands inclusively and clamps over-100', () => {
    expect(assignGrade(70).grade).toBe('A');
    expect(assignGrade(69).grade).toBe('B');
    expect(assignGrade(39).isPass).toBe(false);
    expect(assignGrade(105).grade).toBe('A');
  });
});

describe('scaling', () => {
  it('range-converts a 30-mark score onto a 20-mark scale', () => {
    const rule: ScalingRule = {
      method: 'RANGE_CONVERSION',
      inputMin: 0,
      inputMax: 30,
      outputMin: 0,
      outputMax: 20,
      target: 'EXAMINATION',
      approvalReference: 'SEN/2026/01',
    };
    expect(applyScaling(30, rule)).toBe(20);
    expect(applyScaling(15, rule)).toBe(10);
  });

  it('applies a fixed bonus with a cap', () => {
    const rule: ScalingRule = { method: 'FIXED_BONUS', bonus: 5, cap: 20, target: 'TEST', approvalReference: 'X' };
    expect(applyScaling(12, rule)).toBe(17);
    expect(applyScaling(18, rule)).toBe(20);
  });

  it('applies percentage scaling', () => {
    const rule: ScalingRule = { method: 'PERCENTAGE', percentage: 110, target: 'TOTAL', approvalReference: 'X' };
    expect(applyScaling(50, rule)).toBe(55);
  });
});

describe('compile + statistics + preview', () => {
  const students: StudentComponents[] = [
    { studentId: 's1', fullName: 'A', registrationNumber: 'R1', utmeNumber: null, department: 'CSC', test: 18, practical: 16, assignment: null, examination: 40, matchStrategy: 'REGISTRATION_NUMBER' },
    { studentId: 's2', fullName: 'B', registrationNumber: 'R2', utmeNumber: null, department: 'CSC', test: 10, practical: 8, assignment: null, examination: 18, matchStrategy: 'REGISTRATION_NUMBER' },
  ];
  const opts = { componentMax, gradeBands: DEFAULT_GRADE_BANDS };

  it('computes totals and grades', () => {
    const rows = compileCourse(students, opts);
    expect(rows[0]!.total).toBe(74); // 18+16+40
    expect(rows[0]!.grade).toBe('A');
    expect(rows[1]!.total).toBe(36); // fails
    expect(rows[1]!.isPass).toBe(false);
  });

  it('computes pass/fail statistics', () => {
    const rows = compileCourse(students, opts);
    const stats = computeStatistics(rows);
    expect(stats.totalStudents).toBe(2);
    expect(stats.passCount).toBe(1);
    expect(stats.passRate).toBe(50);
    expect(stats.highestScore).toBe(74);
    expect(stats.lowestScore).toBe(36);
  });

  it('previews a scaling rule without mutating input', () => {
    const rows = compileCourse(students, opts);
    const rule: ScalingRule = { method: 'FIXED_BONUS', bonus: 10, target: 'EXAMINATION', approvalReference: 'SEN/1' };
    const preview = previewScaling(rows, rule, DEFAULT_GRADE_BANDS, 100);
    expect(preview.after.passRate).toBeGreaterThanOrEqual(preview.before.passRate);
    expect(rows[1]!.examination).toBe(18); // original untouched
    expect(preview.rows[1]!.newTotal).toBe(46); // 36 + 10 bonus on exam
  });
});

describe('buildResultWorkbook', () => {
  it('produces a readable xlsx buffer with Results and Summary sheets', () => {
    const rows = compileCourse(
      [
        { studentId: 's1', fullName: 'A', registrationNumber: 'R1', utmeNumber: null, department: 'CSC', test: 18, practical: 16, assignment: null, examination: 40, matchStrategy: 'REGISTRATION_NUMBER' },
      ],
      { componentMax, gradeBands: DEFAULT_GRADE_BANDS },
    );
    const result: CompiledResult = {
      courseId: '00000000-0000-0000-0000-000000000000',
      courseCode: 'CSC101',
      courseTitle: 'Intro',
      rows,
      statistics: computeStatistics(rows),
      unmatchedCount: 0,
    };
    const buf = buildResultWorkbook(result);
    const wb = XLSX.read(buf, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(expect.arrayContaining(['Results', 'Summary']));
  });
});
