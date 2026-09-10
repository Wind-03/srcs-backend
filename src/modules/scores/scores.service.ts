import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CoursesService } from '../courses/courses.service';
import { AuditService } from '../audit/audit.service';
import { parseScoreWorkbook } from '../../core/xlsx/workbook.parser';
import { auditWorkbook } from '../../core/audit/upload-auditor';
import { matchRows, type MatchableStudent } from '../../core/matching/matcher';
import { buildAuditEntry } from '../../core/audit/audit.builder';
import {
  type AssessmentType,
  type ComponentMax,
  type EditScoreDto,
  type JwtPayload,
  type MatchPreviewRow,
  type UploadAuditReport,
} from '../../schemas';

export interface UploadResult {
  committed: boolean;
  report: UploadAuditReport;
  preview: MatchPreviewRow[];
  matchedCount: number;
  unmatchedCount: number;
  importedCount: number;
  batchId: string | null;
}

/** Pick the maximum obtainable mark for the component being uploaded. */
function maxForAssessment(
  componentMax: ComponentMax,
  assessment: AssessmentType,
): number {
  return componentMax[assessment];
}

@Injectable()
export class ScoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Handle an uploaded score table end-to-end (PRD §4.3, §4.4).
   *
   * 1. Parse the workbook with SheetJS.
   * 2. Audit it — duplicates, missing columns, invalid/out-of-range scores.
   * 3. Match every row to a student (reg no → UTME → name + department).
   * 4. Return a preview, or, when `commit` is set and the audit is clean,
   *    persist the scores and record the upload in the audit trail.
   */
  async upload(params: {
    courseId: string;
    assessmentType: AssessmentType;
    commit: boolean;
    file: { originalname: string; buffer: Buffer };
    user: JwtPayload;
  }): Promise<UploadResult> {
    const { courseId, assessmentType, commit, file, user } = params;

    await this.coursesService.assertCanManage(courseId, user);
    const componentMax = await this.coursesService.getComponentMax(courseId);
    const maxScore = maxForAssessment(componentMax, assessmentType);

    // 1 + 2 — parse and audit.
    const parsed = parseScoreWorkbook(file.buffer, assessmentType);
    const report = auditWorkbook(parsed, { maxScore });

    // 3 — match against persisted students.
    const students = await this.loadMatchableStudents();
    const matches = matchRows(parsed.rows, students);

    const preview: MatchPreviewRow[] = parsed.rows.map((row, i) => {
      const match = matches[i]!;
      return {
        rowNumber: row.rowNumber,
        fullName: row.fullName,
        registrationNumber: row.registrationNumber,
        score: row.score,
        matchStrategy: match.strategy,
        matchedStudentId: match.matchedStudentId,
      };
    });

    const matchedCount = preview.filter((p) => p.matchedStudentId).length;
    const unmatchedCount = preview.length - matchedCount;

    // Dry run, or blocked by audit errors → stop before persisting.
    if (!commit || !report.ok) {
      return {
        committed: false,
        report,
        preview,
        matchedCount,
        unmatchedCount,
        importedCount: 0,
        batchId: null,
      };
    }

    // 4 — persist. Only rows that both matched and carry a valid score.
    const importable = parsed.rows
      .map((row, i) => ({ row, match: matches[i]! }))
      .filter(
        (x) =>
          x.match.matchedStudentId !== null &&
          x.row.score !== undefined &&
          Number.isFinite(x.row.score) &&
          (x.row.score as number) >= 0 &&
          (x.row.score as number) <= maxScore,
      );

    const batch = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
      const created = await tx.uploadBatch.create({
        data: {
          courseId,
          assessmentType,
          fileName: file.originalname,
          rowCount: parsed.rows.length,
          importedCount: importable.length,
          uploadedById: user.sub,
        },
      });

      for (const { row, match } of importable) {
        await tx.score.upsert({
          where: {
            courseId_studentId_assessmentType: {
              courseId,
              studentId: match.matchedStudentId!,
              assessmentType,
            },
          },
          create: {
            courseId,
            studentId: match.matchedStudentId!,
            assessmentType,
            rawScore: row.score!,
            uploadedById: user.sub,
            uploadBatchId: created.id,
          },
          update: {
            rawScore: row.score!,
            uploadBatchId: created.id,
            uploadedById: user.sub,
          },
        });
      }

      return created;
    });

    await this.auditService.record(
      buildAuditEntry({
        action: 'UPLOAD',
        actorId: user.sub,
        entity: 'UploadBatch',
        entityId: batch.id,
        courseId,
        metadata: {
          assessmentType,
          fileName: file.originalname,
          rowCount: parsed.rows.length,
          importedCount: importable.length,
          unmatchedCount,
        },
      }),
    );

    return {
      committed: true,
      report,
      preview,
      matchedCount,
      unmatchedCount,
      importedCount: importable.length,
      batchId: batch.id,
    };
  }

  /** Manually edit a single score, recording old/new/reason (PRD §4.9). */
  async editScore(scoreId: string, dto: EditScoreDto, user: JwtPayload) {
    const score = await this.prisma.score.findUnique({
      where: { id: scoreId },
    });
    if (!score) throw new NotFoundException('Score not found');

    await this.coursesService.assertCanManage(score.courseId, user);

    if (dto.rawScore < 0) {
      throw new BadRequestException('Score cannot be negative');
    }

    const updated = await this.prisma.score.update({
      where: { id: scoreId },
      data: { rawScore: dto.rawScore },
    });

    await this.auditService.record(
      buildAuditEntry({
        action: 'SCORE_EDIT',
        actorId: user.sub,
        entity: 'Score',
        entityId: scoreId,
        courseId: score.courseId,
        studentId: score.studentId,
        oldValue: { rawScore: score.rawScore },
        newValue: { rawScore: updated.rawScore },
        reason: dto.reason,
      }),
    );

    return updated;
  }

  private async loadMatchableStudents(): Promise<MatchableStudent[]> {
    const students = await this.prisma.student.findMany({
      include: { department: true },
    });
    return students.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      registrationNumber: s.registrationNumber,
      utmeNumber: s.utmeNumber,
      department: s.department.name,
    }));
  }
}
