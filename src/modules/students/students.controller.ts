import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe';
import {
  createStudentSchema,
  updateStudentSchema,
  type CreateStudentDto,
  type UpdateStudentDto,
} from '../../schemas';
import { StudentsService } from './students.service';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  findAll(@Query('departmentId') departmentId?: string) {
    return this.studentsService.findAll(departmentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Body(new ZodValidationPipe(createStudentSchema)) dto: CreateStudentDto,
  ) {
    return this.studentsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStudentSchema)) dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}
