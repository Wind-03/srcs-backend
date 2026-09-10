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
  createCourseSchema,
  updateCourseSchema,
  type CreateCourseDto,
  type UpdateCourseDto,
} from '../../schemas';
import { CoursesService } from './courses.service';

@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll(@Query('lecturerId') lecturerId?: string) {
    return this.coursesService.findAll(lecturerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Body(new ZodValidationPipe(createCourseSchema)) dto: CreateCourseDto,
  ) {
    return this.coursesService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCourseSchema)) dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }
}
