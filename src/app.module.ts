import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { validateEnv } from './common/config/env.schema';
import { PrismaModule } from './common/prisma/prisma.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { StudentsModule } from './modules/students/students.module';
import { CoursesModule } from './modules/courses/courses.module';
import { GradingModule } from './modules/grading/grading.module';
import { ScoresModule } from './modules/scores/scores.module';
import { CompilationModule } from './modules/compilation/compilation.module';
import { ScalingModule } from './modules/scaling/scaling.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { ExportModule } from './modules/export/export.module';

@Module({
  imports: [
    // Global, Zod-validated configuration (fails fast on a bad environment).
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),

    // Infrastructure
    PrismaModule,
    AuditModule,

    // Features
    AuthModule,
    UsersModule,
    DepartmentsModule,
    StudentsModule,
    CoursesModule,
    GradingModule,
    ScoresModule,
    CompilationModule,
    ScalingModule,
    ReportingModule,
    ExportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
