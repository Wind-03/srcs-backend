import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { buildAuditEntry } from '../../core/audit/audit.builder';
import {
  DEFAULT_GRADE_BANDS,
  gradeBandSchema,
  type CreateGradingScaleDto,
  type GradeBand,
  type JwtPayload,
} from '../../schemas';
import { z } from 'zod';

const bandsSchema = z.array(gradeBandSchema);

@Injectable()
export class GradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateGradingScaleDto, user: JwtPayload) {
    // A single default scale at a time.
    if (dto.isDefault) {
      await this.prisma.gradingScale.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    const scale = await this.prisma.gradingScale.create({
      data: {
        name: dto.name,
        isDefault: dto.isDefault,
        bands: dto.bands as unknown as Prisma.InputJsonValue,
      },
    });
    await this.auditService.record(
      buildAuditEntry({
        action: 'GRADE_SCALE_UPDATE',
        actorId: user.sub,
        entity: 'GradingScale',
        entityId: scale.id,
        newValue: dto,
      }),
    );
    return scale;
  }

  findAll() {
    return this.prisma.gradingScale.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const scale = await this.prisma.gradingScale.findUnique({ where: { id } });
    if (!scale) throw new NotFoundException('Grading scale not found');
    return scale;
  }

  /**
   * Resolve the grade bands to use for a course: the course's own scale, else
   * the institutional default, else the built-in fallback. Bands are validated
   * on the way out so a corrupted JSON blob can never reach the grader.
   */
  async resolveBandsForCourse(courseId: string): Promise<GradeBand[]> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { gradingScale: true },
    });

    const raw =
      course?.gradingScale?.bands ??
      (await this.prisma.gradingScale.findFirst({
        where: { isDefault: true },
      }))?.bands;

    if (!raw) return DEFAULT_GRADE_BANDS;

    const parsed = bandsSchema.safeParse(raw);
    return parsed.success ? parsed.data : DEFAULT_GRADE_BANDS;
  }
}
