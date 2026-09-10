import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CoursesService } from '../courses/courses.service';
import { GradingService } from '../grading/grading.service';
import { CompilationService } from '../compilation/compilation.service';
import { AuditService } from '../audit/audit.service';
import { previewScaling } from '../../core/statistics/statistics';
import { buildAuditEntry } from '../../core/audit/audit.builder';
import type {
  CompiledResult,
  JwtPayload,
  ScalingPreview,
  ScalingRule,
} from '../../schemas';

@Injectable()
export class ScalingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService,
    private readonly gradingService: GradingService,
    private readonly compilationService: CompilationService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Preview the effect of a scaling rule on top of the current compiled state
   * (PRD §4.5, §8.5) — score, grade and pass-rate changes — without persisting.
   */
  async preview(
    courseId: string,
    rule: ScalingRule,
    user: JwtPayload,
  ): Promise<ScalingPreview> {
    await this.coursesService.assertCanManage(courseId, user);
    const compiled = await this.compilationService.compile(courseId);
    const totalMax = await this.totalMax(courseId);
    const gradeBands =
      await this.gradingService.resolveBandsForCourse(courseId);
    return previewScaling(compiled.rows, rule, gradeBands, totalMax);
  }

  /**
   * Apply a scaling rule. The approval reference is mandatory (enforced by the
   * schema, PRD §7.1). The full rule is persisted so compilation can reproduce
   * the result deterministically, and the action is written to the audit trail.
   * Returns the freshly recompiled result.
   */
  async apply(
    courseId: string,
    rule: ScalingRule,
    user: JwtPayload,
  ): Promise<CompiledResult> {
    await this.coursesService.assertCanManage(courseId, user);

    const before = await this.compilationService.compile(courseId);

    const action = await this.prisma.scalingAction.create({
      data: {
        courseId,
        target: rule.target,
        method: rule.method,
        parameters: rule as unknown as Prisma.InputJsonValue,
        approvalReference: rule.approvalReference,
        appliedById: user.sub,
      },
    });

    const after = await this.compilationService.compile(courseId);

    await this.auditService.record(
      buildAuditEntry({
        action: 'SCALING_APPLY',
        actorId: user.sub,
        entity: 'ScalingAction',
        entityId: action.id,
        courseId,
        reason: rule.reason ?? null,
        oldValue: {
          passRate: before.statistics.passRate,
          average: before.statistics.average,
        },
        newValue: {
          passRate: after.statistics.passRate,
          average: after.statistics.average,
        },
        metadata: {
          method: rule.method,
          target: rule.target,
          approvalReference: rule.approvalReference,
        },
      }),
    );

    return after;
  }

  private async totalMax(courseId: string): Promise<number> {
    const m = await this.coursesService.getComponentMax(courseId);
    return m.TEST + m.PRACTICAL + m.ASSIGNMENT + m.EXAMINATION;
  }
}
