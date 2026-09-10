import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload } from '../../schemas';
import { CoursesService } from '../courses/courses.service';
import { ExportService, type ExportFile } from './export.service';

@Controller('courses/:courseId/export')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly coursesService: CoursesService,
  ) {}

  @Get('xlsx')
  async xlsx(
    @Param('courseId') courseId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    await this.coursesService.assertCanManage(courseId, user);
    const file = await this.exportService.toExcel(courseId, user);
    this.send(res, file);
  }

  @Get('pdf')
  async pdf(
    @Param('courseId') courseId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    await this.coursesService.assertCanManage(courseId, user);
    const file = await this.exportService.toPdf(courseId, user);
    this.send(res, file);
  }

  private send(res: Response, file: ExportFile): void {
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Content-Length': String(file.buffer.length),
    });
    res.end(file.buffer);
  }
}
