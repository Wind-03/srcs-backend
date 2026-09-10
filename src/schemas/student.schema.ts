import { z } from 'zod';
import { nonEmptyString, uuid } from './common.schema';

/**
 * Student record (PRD §4.2 / §5). Registration number is the primary matching
 * key; UTME number is the secondary key; name + department is the fallback.
 */
export const studentSchema = z.object({
  id: uuid,
  fullName: nonEmptyString,
  registrationNumber: nonEmptyString,
  utmeNumber: nonEmptyString.nullable(),
  departmentId: uuid,
  level: z.number().int().positive().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Student = z.infer<typeof studentSchema>;

export const createStudentSchema = studentSchema
  .pick({
    fullName: true,
    registrationNumber: true,
    utmeNumber: true,
    departmentId: true,
    level: true,
  })
  .partial({ utmeNumber: true, level: true });
export type CreateStudentDto = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = createStudentSchema.partial();
export type UpdateStudentDto = z.infer<typeof updateStudentSchema>;
