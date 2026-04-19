import { randomUUID } from 'node:crypto';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';

import { AppModule } from './modules/app.module';
import { HttpExceptionFilter } from './shared/http-exception.filter';
import { ResponseTransformInterceptor } from './shared/response-transform.interceptor';

function parseAllowedOrigins(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const apiPrefix = process.env.API_PREFIX ?? 'api';
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  app.use((request: Request & { requestId?: string }, _response: Response, next: NextFunction) => {
    request.requestId = randomUUID();
    next();
  });

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  const allowedOrigins = parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);
  const allowCredentials = process.env.CORS_ALLOW_CREDENTIALS === 'true';

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);

      if (!allowedOrigins.length) {
        return callback(null, nodeEnv !== 'production');
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin denied'), false);
    },
    credentials: allowCredentials,
  });

  await app.listen(Number(process.env.APP_PORT ?? 3000));
}

void bootstrap();
