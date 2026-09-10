import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload } from '../../schemas';
import { CoursesService } from '../courses/courses.service';
import { CompilationService } from './compilation.service';

@Controller('courses/:courseId/compile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompilationController {
  constructor(
    private readonly compilationService: CompilationService,
    private readonly coursesService: CoursesService,
  ) {}

  /** Compile & match all uploaded component tables into one result (PRD §8.4). */
  @Post()
  async compile(
    @Param('courseId') courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.coursesService.assertCanManage(courseId, user);
    return this.compilationService.compileAndLog(courseId, user);
  }
}
