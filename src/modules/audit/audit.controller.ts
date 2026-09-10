import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe';
import { auditQuerySchema, type AuditQueryDto } from '../../schemas';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /** Full audit trail across all courses — admin only (PRD §8.8). */
  @Get()
  @Roles('ADMIN')
  list(
    @Query(new ZodValidationPipe(auditQuerySchema)) query: AuditQueryDto,
  ) {
    return this.auditService.query(query);
  }
}
