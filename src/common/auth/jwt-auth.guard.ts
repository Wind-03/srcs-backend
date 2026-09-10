import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { jwtPayloadSchema } from '../../schemas';
import { IS_PUBLIC_KEY } from './roles.decorator';
import type { AuthenticatedRequest } from './current-user.decorator';

/**
 * Verifies the `Authorization: Bearer <token>` header, validates the decoded
 * payload with Zod, and attaches the typed user to the request. Routes marked
 * @Public() bypass the check.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearer(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const decoded: unknown = await this.jwtService.verifyAsync(token);
      const payload = jwtPayloadSchema.parse(decoded);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

function extractBearer(header?: string): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  return scheme === 'Bearer' && value ? value : null;
}
