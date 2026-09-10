import {
  type ExecutionContext,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../../schemas';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Injects the authenticated user (the validated JWT payload) into a handler:
 *
 *   getProfile(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
