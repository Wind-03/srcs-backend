import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DEFAULT_GRADE_BANDS } from '../src/schemas';

const prisma = new PrismaClient();

/**
 * Seed a minimal working setup: one approved admin, a default grading scale,
 * and a sample department. Safe to re-run (idempotent upserts).
 */
async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('admin12345', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@srcs.local' },
    update: {},
    create: {
      email: 'admin@srcs.local',
      fullName: 'System Administrator',
      passwordHash,
      role: 'ADMIN',
      isApproved: true,
    },
  });

  await prisma.gradingScale.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000aa' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-0000000000aa',
      name: 'Default 5-Point Scale',
      isDefault: true,
      bands: DEFAULT_GRADE_BANDS,
    },
  });

  await prisma.department.upsert({
    where: { code: 'CSC' },
    update: {},
    create: { name: 'Computer Science', code: 'CSC' },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded admin: ${admin.email} (password: admin12345)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
