import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { ScoresService } from './scores.service';
import { ScoresController } from './scores.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CoursesModule, AuthModule],
  controllers: [ScoresController],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}
