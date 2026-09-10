import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { GradingModule } from '../grading/grading.module';
import { CompilationModule } from '../compilation/compilation.module';
import { ScalingService } from './scaling.service';
import { ScalingController } from './scaling.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CoursesModule, GradingModule, CompilationModule, AuthModule],
  controllers: [ScalingController],
  providers: [ScalingService],
  exports: [ScalingService],
})
export class ScalingModule {}
