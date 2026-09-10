import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  type CreateDepartmentDto,
  type UpdateDepartmentDto,
} from '../../schemas';
import { DepartmentsService } from './departments.service';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Body(new ZodValidationPipe(createDepartmentSchema))
    dto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDepartmentSchema))
    dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }
}
