import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  ComponentMax,
  CreateCourseDto,
  JwtPayload,
  UpdateCourseDto,
} from '../../schemas';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseDto) {
    const clash = await this.prisma.course.findUnique({
      where: { code: dto.code },
    });
    if (clash) {
      throw new ConflictException(
        `A course with code "${dto.code}" already exists`,
      );
    }
    return this.prisma.course.create({
      data: {
        code: dto.code,
        title: dto.title,
        departmentId: dto.departmentId,
        lecturerId: dto.lecturerId ?? null,
        maxTest: dto.maxTest ?? 20,
        maxPractical: dto.maxPractical ?? 20,
        maxAssignment: dto.maxAssignment ?? 0,
        maxExamination: dto.maxExamination ?? 60,
      },
    });
  }

  findAll(lecturerId?: string) {
    return this.prisma.course.findMany({
      where: lecturerId ? { lecturerId } : undefined,
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.findOne(id);
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.course.delete({ where: { id } });
    return { deleted: true };
  }

  /** The component maxima used by compilation and range validation. */
  async getComponentMax(courseId: string): Promise<ComponentMax> {
    const course = await this.findOne(courseId);
    return {
      TEST: course.maxTest,
      PRACTICAL: course.maxPractical,
      ASSIGNMENT: course.maxAssignment,
      EXAMINATION: course.maxExamination,
    };
  }

  /**
   * Enforce the permission matrix (PRD §3.3): admins may act on any course; a
   * lecturer may act only on courses they own. Throws otherwise. Returns the
   * course so callers can reuse it.
   */
  async assertCanManage(courseId: string, user: JwtPayload) {
    const course = await this.findOne(courseId);
    if (user.role !== 'ADMIN' && course.lecturerId !== user.sub) {
      throw new ForbiddenException(
        'You do not have permission to manage this course',
      );
    }
    return course;
  }
}
