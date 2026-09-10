import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '../../schemas';
import { ROLES_KEY } from './roles.decorator';
import type { AuthenticatedRequest } from './current-user.decorator';

/**
 * Enforces the @Roles(...) metadata. Runs after JwtAuthGuard, so the user is
 * already attached. A route with no @Roles is allowed for any authenticated
 * user (PRD §3.3).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `This action requires one of roles: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
