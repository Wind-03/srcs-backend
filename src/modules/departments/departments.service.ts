import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from '../../schemas';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Department with code "${dto.code}" already exists`,
      );
    }
    return this.prisma.department.create({ data: dto });
  }

  findAll() {
    return this.prisma.department.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id);
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.department.delete({ where: { id } });
    return { deleted: true };
  }
}
