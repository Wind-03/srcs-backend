import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { buildAuditEntry } from '../../core/audit/audit.builder';
import {
  type JwtPayload,
  type LoginDto,
  type RegisterDto,
  type SafeUser,
} from '../../schemas';

const SALT_ROUNDS = 10;

export interface LoginResult {
  accessToken: string;
  user: SafeUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Register a new account. New accounts are unapproved by default; an admin
   * must approve before the user can act on scores (PRD §4.1).
   */
  async register(dto: RegisterDto): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        passwordHash,
        role: dto.role,
        isApproved: false,
      },
    });

    return this.toSafeUser(user);
  }

  /** Authenticate, log the session, and issue a JWT (PRD §4.1). */
  async login(
    dto: LoginDto,
    context: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isApproved) {
      throw new UnauthorizedException('Account is pending approval');
    }

    // Session logging for every sign-in (PRD §4.1).
    await this.prisma.session.create({
      data: {
        userId: user.id,
        ipAddress: context.ip ?? null,
        userAgent: context.userAgent ?? null,
      },
    });
    await this.auditService.record(
      buildAuditEntry({
        action: 'LOGIN',
        actorId: user.id,
        entity: 'Session',
        metadata: { ip: context.ip, userAgent: context.userAgent },
      }),
    );

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, user: this.toSafeUser(user) };
  }

  private toSafeUser(user: {
    id: string;
    email: string;
    fullName: string;
    role: SafeUser['role'];
    isApproved: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): SafeUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isApproved: user.isApproved,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
