import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe';
import { UserRole } from '../../schemas';
import { UsersService } from './users.service';

const approvalSchema = z.object({ isApproved: z.boolean() });
type ApprovalDto = z.infer<typeof approvalSchema>;

const roleSchema = z.object({ role: UserRole });
type RoleDto = z.infer<typeof roleSchema>;

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/approval')
  setApproval(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(approvalSchema)) dto: ApprovalDto,
  ) {
    return this.usersService.setApproval(id, dto.isApproved);
  }

  @Patch(':id/role')
  setRole(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(roleSchema)) dto: RoleDto,
  ) {
    return this.usersService.setRole(id, dto.role);
  }
}
