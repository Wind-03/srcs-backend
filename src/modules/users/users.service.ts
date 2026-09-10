import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { SafeUser, UserRole } from '../../schemas';

const safeSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isApproved: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      select: safeSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async setApproval(id: string, isApproved: boolean): Promise<SafeUser> {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { isApproved },
      select: safeSelect,
    });
  }

  async setRole(id: string, role: UserRole): Promise<SafeUser> {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: safeSelect,
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
  }
}
