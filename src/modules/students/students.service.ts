import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateStudentDto, UpdateStudentDto } from '../../schemas';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudentDto) {
    const clash = await this.prisma.student.findUnique({
      where: { registrationNumber: dto.registrationNumber },
    });
    if (clash) {
      throw new ConflictException(
        `A student with registration number "${dto.registrationNumber}" already exists`,
      );
    }
    return this.prisma.student.create({
      data: {
        fullName: dto.fullName,
        registrationNumber: dto.registrationNumber,
        utmeNumber: dto.utmeNumber ?? null,
        departmentId: dto.departmentId,
        level: dto.level ?? null,
      },
    });
  }

  findAll(departmentId?: string) {
    return this.prisma.student.findMany({
      where: departmentId ? { departmentId } : undefined,
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.findOne(id);
    return this.prisma.student.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.student.delete({ where: { id } });
    return { deleted: true };
  }
}
