import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { GradingModule } from '../grading/grading.module';
import { CompilationService } from './compilation.service';
import { CompilationController } from './compilation.controller';

@Module({
  imports: [CoursesModule, GradingModule],
  controllers: [CompilationController],
  providers: [CompilationService],
  exports: [CompilationService],
})
export class CompilationModule {}
