import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload } from '../../schemas';
import { CoursesService } from '../courses/courses.service';
import { ReportingService } from './reporting.service';

@Controller('courses/:courseId')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly coursesService: CoursesService,
  ) {}

  @Get('summary')
  async summary(
    @Param('courseId') courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.coursesService.assertCanManage(courseId, user);
    return this.reportingService.summary(courseId);
  }
}
