import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { ScoresService } from './scores.service';
import { ScoresController } from './scores.controller';

@Module({
  imports: [CoursesModule],
  controllers: [ScoresController],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}
