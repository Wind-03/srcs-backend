import { Injectable } from '@nestjs/common';
import { CompilationService } from '../compilation/compilation.service';
import { AuditService } from '../audit/audit.service';
import { buildResultWorkbook } from '../../core/xlsx/workbook.writer';
import { buildResultPdf } from '../../core/pdf/result-pdf';
import { buildAuditEntry } from '../../core/audit/audit.builder';
import type { JwtPayload } from '../../schemas';

export interface ExportFile {
  filename: string;
  contentType: string;
  buffer: Buffer;
}

@Injectable()
export class ExportService {
  constructor(
    private readonly compilationService: CompilationService,
    private readonly auditService: AuditService,
  ) {}

  /** Export the final result sheet as .xlsx (PRD §4.8). */
  async toExcel(courseId: string, user: JwtPayload): Promise<ExportFile> {
    const result = await this.compilationService.compile(courseId);
    const buffer = buildResultWorkbook(result);
    await this.logExport(courseId, user, 'xlsx');
    return {
      filename: `${result.courseCode}-results.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    };
  }

  /** Export the final result sheet as PDF (PRD §4.8). */
  async toPdf(courseId: string, user: JwtPayload): Promise<ExportFile> {
    const result = await this.compilationService.compile(courseId);
    const buffer = await buildResultPdf(result);
    await this.logExport(courseId, user, 'pdf');
    return {
      filename: `${result.courseCode}-results.pdf`,
      contentType: 'application/pdf',
      buffer,
    };
  }

  private logExport(
    courseId: string,
    user: JwtPayload,
    format: 'xlsx' | 'pdf',
  ): Promise<void> {
    return this.auditService.record(
      buildAuditEntry({
        action: 'EXPORT',
        actorId: user.sub,
        entity: 'Course',
        entityId: courseId,
        courseId,
        metadata: { format },
      }),
    );
  }
}
