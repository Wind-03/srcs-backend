import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CoursesService } from '../courses/courses.service';
import { GradingService } from '../grading/grading.service';
import { compileCourse } from '../../core/compilation/compiler';
import { computeStatistics } from '../../core/statistics/statistics';
import { applyRulesToRows } from '../../core/scaling/apply';
import { buildAuditEntry } from '../../core/audit/audit.builder';
import { AuditService } from '../audit/audit.service';
import type { StudentComponents } from '../../core/compilation/compiler';
import {
  scalingRuleSchema,
  type AssessmentType,
  type CompiledResult,
  type JwtPayload,
  type ScalingRule,
} from '../../schemas';

interface CourseScoreRow {
  studentId: string;
  assessmentType: AssessmentType;
  rawScore: number;
  student: {
    id: string;
    fullName: string;
    registrationNumber: string;
    utmeNumber: string | null;
    department: { name: string };
  };
}

@Injectable()
export class CompilationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService,
    private readonly gradingService: GradingService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Compile a course into a single result table (PRD §4.4): gather every
   * component score, group by student, sum totals, assign grades, and compute
   * summary statistics. Pure calculation is delegated to `src/core`.
   */
  async compile(courseId: string): Promise<CompiledResult> {
    const course = await this.coursesService.findOne(courseId);
    const componentMax =
      await this.coursesService.getComponentMax(courseId);
    const gradeBands =
      await this.gradingService.resolveBandsForCourse(courseId);

    const scores = (await this.prisma.score.findMany({
      where: { courseId },
      include: {
        student: { include: { department: true } },
      },
    })) as unknown as CourseScoreRow[];

    const students = this.groupByStudent(scores);
    const rawRows = compileCourse(students, { componentMax, gradeBands });

    // Apply approved scaling actions in the order they were applied, so the
    // result is reproducible from raw scores + stored formulas (PRD §7.2).
    const totalMax =
      componentMax.TEST +
      componentMax.PRACTICAL +
      componentMax.ASSIGNMENT +
      componentMax.EXAMINATION;
    const rules = await this.loadScalingRules(courseId);
    const rows = applyRulesToRows(rawRows, rules, gradeBands, totalMax);

    const statistics = computeStatistics(rows);

    return {
      courseId,
      courseCode: course.code,
      courseTitle: course.title,
      rows,
      statistics,
      unmatchedCount: rows.filter((r) => r.incomplete).length,
    };
  }

  /** Compile and log a COMPILE audit entry (used by the compile endpoint). */
  async compileAndLog(
    courseId: string,
    user: JwtPayload,
  ): Promise<CompiledResult> {
    const result = await this.compile(courseId);
    await this.auditService.record(
      buildAuditEntry({
        action: 'COMPILE',
        actorId: user.sub,
        entity: 'Course',
        entityId: courseId,
        courseId,
        metadata: {
          totalStudents: result.statistics.totalStudents,
          incomplete: result.unmatchedCount,
        },
      }),
    );
    return result;
  }

  private async loadScalingRules(courseId: string): Promise<ScalingRule[]> {
    const actions = await this.prisma.scalingAction.findMany({
      where: { courseId },
      orderBy: { createdAt: 'asc' },
    });
    const rules: ScalingRule[] = [];
    for (const action of actions) {
      // The full rule was stored in `parameters` at apply time.
      const parsed = scalingRuleSchema.safeParse(action.parameters);
      if (parsed.success) rules.push(parsed.data);
    }
    return rules;
  }

  private groupByStudent(scores: CourseScoreRow[]): StudentComponents[] {
    const byStudent = new Map<string, StudentComponents>();

    for (const score of scores) {
      const key = score.studentId;
      let entry = byStudent.get(key);
      if (!entry) {
        entry = {
          studentId: score.student.id,
          fullName: score.student.fullName,
          registrationNumber: score.student.registrationNumber,
          utmeNumber: score.student.utmeNumber,
          department: score.student.department.name,
          test: null,
          practical: null,
          assignment: null,
          examination: null,
          matchStrategy: 'REGISTRATION_NUMBER',
        };
        byStudent.set(key, entry);
      }
      switch (score.assessmentType) {
        case 'TEST':
          entry.test = score.rawScore;
          break;
        case 'PRACTICAL':
          entry.practical = score.rawScore;
          break;
        case 'ASSIGNMENT':
          entry.assignment = score.rawScore;
          break;
        case 'EXAMINATION':
          entry.examination = score.rawScore;
          break;
      }
    }

    return [...byStudent.values()].sort((a, b) =>
      a.fullName.localeCompare(b.fullName),
    );
  }
}
