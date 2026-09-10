import * as XLSX from 'xlsx';
import type { CompiledResult, ResultStatistics } from '../../schemas';

/**
 * Build a formatted result workbook (PRD §4.8). Produces two sheets: the
 * compiled result table and a summary-statistics sheet. Returned as a Buffer
 * the HTTP layer can stream as an .xlsx download.
 */
export function buildResultWorkbook(result: CompiledResult): Buffer {
  const workbook = XLSX.utils.book_new();

  const header = [
    'S/N',
    'Full Name',
    'Registration Number',
    'UTME Number',
    'Department',
    'Test',
    'Practical',
    'Assignment',
    'Examination',
    'Total',
    'Scaled Total',
    'Grade',
    'Remark',
    'Match',
    'Status',
  ];

  const body = result.rows.map((row, i) => [
    i + 1,
    row.fullName,
    row.registrationNumber,
    row.utmeNumber ?? '',
    row.department,
    row.test ?? '',
    row.practical ?? '',
    row.assignment ?? '',
    row.examination ?? '',
    row.total,
    row.scaledTotal ?? '',
    row.grade,
    row.isPass ? 'PASS' : 'FAIL',
    row.matchStrategy,
    row.incomplete ? 'INCOMPLETE' : 'OK',
  ]);

  const titleRows = [
    [`Course: ${result.courseCode} — ${result.courseTitle}`],
    [`Generated: ${new Date().toISOString()}`],
    [],
  ];

  const resultSheet = XLSX.utils.aoa_to_sheet([
    ...titleRows,
    header,
    ...body,
  ]);
  resultSheet['!cols'] = header.map((h) => ({ wch: Math.max(h.length + 2, 12) }));
  XLSX.utils.book_append_sheet(workbook, resultSheet, 'Results');

  const summarySheet = XLSX.utils.aoa_to_sheet(
    statisticsToRows(result.statistics),
  );
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function statisticsToRows(stats: ResultStatistics): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [
    ['Summary Statistics'],
    [],
    ['Total Students', stats.totalStudents],
    ['Pass Count', stats.passCount],
    ['Fail Count', stats.failCount],
    ['Pass Rate (%)', stats.passRate],
    ['Fail Rate (%)', stats.failRate],
    ['Highest Score', stats.highestScore],
    ['Lowest Score', stats.lowestScore],
    ['Class Average', stats.average],
    [],
    ['Grade Distribution'],
  ];
  for (const [grade, count] of Object.entries(stats.gradeDistribution)) {
    rows.push([grade, count]);
  }
  return rows;
}
