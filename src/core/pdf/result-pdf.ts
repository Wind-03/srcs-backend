import PDFDocument from 'pdfkit';
import type { CompiledResult } from '../../schemas';

/**
 * Render a compiled result as a PDF (PRD §4.8), formatted for departmental
 * records: a header, a per-student table, and a summary block. Returns the PDF
 * as a Buffer for the HTTP layer to stream.
 */
export function buildResultPdf(result: CompiledResult): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- Header ---------------------------------------------------------------
    doc
      .fontSize(16)
      .text('Student Result Sheet', { align: 'center' })
      .moveDown(0.2);
    doc
      .fontSize(11)
      .text(`${result.courseCode} — ${result.courseTitle}`, {
        align: 'center',
      })
      .moveDown(0.2);
    doc
      .fontSize(8)
      .fillColor('#666')
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' })
      .fillColor('#000')
      .moveDown(0.8);

    // --- Table ----------------------------------------------------------------
    const headers = [
      'S/N',
      'Name',
      'Reg No',
      'Test',
      'Prac',
      'Assmt',
      'Exam',
      'Total',
      'Grade',
      'Remark',
    ];
    const widths = [30, 150, 90, 40, 40, 45, 45, 45, 45, 55];
    const startX = doc.page.margins.left;
    let y = doc.y;

    const drawRow = (cells: string[], bold: boolean): void => {
      let x = startX;
      doc.fontSize(8).font(bold ? 'Helvetica-Bold' : 'Helvetica');
      cells.forEach((cell, i) => {
        doc.text(cell, x + 2, y + 2, {
          width: widths[i]! - 4,
          ellipsis: true,
        });
        x += widths[i]!;
      });
      y += 16;
      doc
        .moveTo(startX, y)
        .lineTo(
          startX + widths.reduce((a, b) => a + b, 0),
          y,
        )
        .strokeColor('#ddd')
        .stroke()
        .strokeColor('#000');
    };

    drawRow(headers, true);

    result.rows.forEach((row, i) => {
      if (y > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        y = doc.page.margins.top;
        drawRow(headers, true);
      }
      drawRow(
        [
          String(i + 1),
          row.fullName,
          row.registrationNumber,
          fmt(row.test),
          fmt(row.practical),
          fmt(row.assignment),
          fmt(row.examination),
          fmt(row.scaledTotal ?? row.total),
          row.grade,
          row.isPass ? 'PASS' : 'FAIL',
        ],
        false,
      );
    });

    // --- Summary --------------------------------------------------------------
    const s = result.statistics;
    doc.moveDown(1.5).fontSize(10).font('Helvetica-Bold').text('Summary');
    doc
      .font('Helvetica')
      .fontSize(9)
      .text(
        `Students: ${s.totalStudents}   Passed: ${s.passCount} (${s.passRate}%)   ` +
          `Failed: ${s.failCount} (${s.failRate}%)`,
      )
      .text(
        `Highest: ${s.highestScore}   Lowest: ${s.lowestScore}   Average: ${s.average}`,
      )
      .text(
        `Grade distribution: ${Object.entries(s.gradeDistribution)
          .map(([g, c]) => `${g}=${c}`)
          .join('  ')}`,
      );

    doc.end();
  });
}

function fmt(v: number | null): string {
  return v === null || v === undefined ? '-' : String(v);
}
