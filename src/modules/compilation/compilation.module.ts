import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { GradingModule } from '../grading/grading.module';
import { CompilationService } from './compilation.service';
import { CompilationController } from './compilation.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CoursesModule, GradingModule, AuthModule],
  controllers: [CompilationController],
  providers: [CompilationService],
  exports: [CompilationService],
})
export class CompilationModule {}
