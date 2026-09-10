import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { CompilationModule } from '../compilation/compilation.module';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CoursesModule, CompilationModule, AuthModule],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
