import { z } from 'zod';
import { nonEmptyString, uuid } from './common.schema';

export const departmentSchema = z.object({
  id: uuid,
  name: nonEmptyString,
  code: nonEmptyString,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Department = z.infer<typeof departmentSchema>;

export const createDepartmentSchema = departmentSchema.pick({
  name: true,
  code: true,
});
export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = createDepartmentSchema.partial();
export type UpdateDepartmentDto = z.infer<typeof updateDepartmentSchema>;

/**
 * A course, with the maximum obtainable mark per assessment component. These
 * caps define the weighted total (e.g. Test 20 + Practical 20 + Exam 60 = 100)
 * and bound score-range validation on upload (PRD §6).
 */
export const courseSchema = z.object({
  id: uuid,
  code: nonEmptyString,
  title: nonEmptyString,
  departmentId: uuid,
  lecturerId: uuid.nullable(),
  maxTest: z.number().nonnegative().default(20),
  maxPractical: z.number().nonnegative().default(20),
  maxAssignment: z.number().nonnegative().default(0),
  maxExamination: z.number().nonnegative().default(60),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Course = z.infer<typeof courseSchema>;

export const createCourseSchema = courseSchema
  .pick({
    code: true,
    title: true,
    departmentId: true,
    lecturerId: true,
    maxTest: true,
    maxPractical: true,
    maxAssignment: true,
    maxExamination: true,
  })
  .partial({
    lecturerId: true,
    maxTest: true,
    maxPractical: true,
    maxAssignment: true,
    maxExamination: true,
  });
export type CreateCourseDto = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = createCourseSchema.partial();
export type UpdateCourseDto = z.infer<typeof updateCourseSchema>;

/** The per-component maxima, extracted for use by pure calculation code. */
export const componentMaxSchema = z.object({
  TEST: z.number().nonnegative(),
  PRACTICAL: z.number().nonnegative(),
  ASSIGNMENT: z.number().nonnegative(),
  EXAMINATION: z.number().nonnegative(),
});
export type ComponentMax = z.infer<typeof componentMaxSchema>;
