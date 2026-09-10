import { Module } from '@nestjs/common';
import { GradingService } from './grading.service';
import { GradingController } from './grading.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [GradingController],
  providers: [GradingService],
  exports: [GradingService],
  imports: [AuthModule]
})
export class GradingModule {}
