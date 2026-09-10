import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { Env } from './common/config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.enableCors();
  app.setGlobalPrefix('api');

  // Per-route ZodValidationPipe handles body/query DTOs; this global pipe is a
  // safety net for any primitive param transforms.
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  new Logger('Bootstrap').log(`SRCS API listening on http://localhost:${port}/api`);
}

void bootstrap();
