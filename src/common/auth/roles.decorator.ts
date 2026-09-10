import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { UserRole } from '../../schemas';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route (or controller) to the given roles (PRD §3.3 permissions
 * matrix). Combined with RolesGuard.
 *
 *   @Roles('ADMIN')
 *   @Post('departments')
 */
export const Roles = (...roles: UserRole[]): CustomDecorator =>
  SetMetadata(ROLES_KEY, roles);

export const IS_PUBLIC_KEY = 'isPublic';

/** Mark a route as accessible without authentication (e.g. login). */
export const Public = (): CustomDecorator => SetMetadata(IS_PUBLIC_KEY, true);
