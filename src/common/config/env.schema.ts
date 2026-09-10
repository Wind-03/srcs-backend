import { z } from 'zod';

/**
 * Environment validation (fail-fast on boot). If a required variable is missing
 * or malformed, the app refuses to start with a clear message rather than
 * failing later at runtime.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Supabase Postgres connection (used by Prisma).
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Auth
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('1d'),

  // Uploads
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(5),
});

export type Env = z.infer<typeof envSchema>;

/** Validate `process.env` and return a typed config object. */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const details = Object.entries(flat)
      .map(([key, errs]) => `  - ${key}: ${(errs ?? []).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}
