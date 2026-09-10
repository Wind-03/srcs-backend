import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuditQueryDto, CreateAuditLogDto } from '../../schemas';


@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Append a single entry. */
  async record(entry: CreateAuditLogDto): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        courseId: entry.courseId ?? null,
        studentId: entry.studentId ?? null,
        oldValue: (entry.oldValue ?? null) as Prisma.InputJsonValue,
        newValue: (entry.newValue ?? null) as Prisma.InputJsonValue,
        reason: entry.reason ?? null,
        metadata: (entry.metadata ?? null) as Prisma.InputJsonValue,
      },
    });
  }

  /** Append many entries in one transaction (e.g. a bulk score import). */
  async recordMany(entries: CreateAuditLogDto[]): Promise<void> {
    if (entries.length === 0) return;
    await this.prisma.auditLog.createMany({
      data: entries.map((entry) => ({
        action: entry.action,
        actorId: entry.actorId,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        courseId: entry.courseId ?? null,
        studentId: entry.studentId ?? null,
        oldValue: (entry.oldValue ?? null) as Prisma.InputJsonValue,
        newValue: (entry.newValue ?? null) as Prisma.InputJsonValue,
        reason: entry.reason ?? null,
        metadata: (entry.metadata ?? null) as Prisma.InputJsonValue,
      })),
    });
  }

  /** Query the trail with filters and pagination (PRD §8.8). */
  async query(filters: AuditQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      courseId: filters.courseId,
      action: filters.action,
      actorId: filters.actorId,
      createdAt:
        filters.from || filters.to
          ? { gte: filters.from, lte: filters.to }
          : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.ceil(total / filters.pageSize),
    };
  }
}
