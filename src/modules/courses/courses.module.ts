import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
  imports: [AuthModule]
})
export class CoursesModule {}
