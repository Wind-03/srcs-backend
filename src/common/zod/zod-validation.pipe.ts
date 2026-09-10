import {
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { ZodError, type ZodSchema } from 'zod';

/**
 * A NestJS pipe that validates and parses an incoming value against a Zod
 * schema. On success it returns the parsed (and transformed) value, so
 * controllers receive fully typed, normalised data. On failure it throws a 400
 * with a structured list of field errors.
 *
 * Usage:
 *   @Body(new ZodValidationPipe(createCourseSchema)) dto: CreateCourseDto
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: formatZodError(result.error),
      });
    }
    return result.data;
  }
}

export function formatZodError(
  error: ZodError,
): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}
