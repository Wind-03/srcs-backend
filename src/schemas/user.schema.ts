import { z } from 'zod';
import { UserRole, nonEmptyString, uuid } from './common.schema';

export const userSchema = z.object({
  id: uuid,
  email: z.string().trim().toLowerCase().email(),
  fullName: nonEmptyString,
  role: UserRole,
  isApproved: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof userSchema>;

/** Public-safe user (never expose the password hash). */
export type SafeUser = User;

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  fullName: nonEmptyString,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
  role: UserRole.default('LECTURER'),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: nonEmptyString,
});
export type LoginDto = z.infer<typeof loginSchema>;

/** Payload embedded in the JWT and attached to the request. */
export const jwtPayloadSchema = z.object({
  sub: uuid,
  email: z.string().email(),
  role: UserRole,
});
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
