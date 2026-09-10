import { Module } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
  imports: [AuthModule]
})
export class DepartmentsModule {}


