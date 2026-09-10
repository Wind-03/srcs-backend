import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { CompilationModule } from '../compilation/compilation.module';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CoursesModule, CompilationModule, AuthModule],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
