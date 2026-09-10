import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { CompilationModule } from '../compilation/compilation.module';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';

@Module({
  imports: [CoursesModule, CompilationModule],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
