import { randomUUID } from 'node:crypto';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';

import { AppModule } from './modules/app.module';
import { HttpExceptionFilter } from './shared/http-exception.filter';
import { ResponseTransformInterceptor } from './shared/response-transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const apiPrefix = process.env.API_PREFIX ?? 'api';

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
  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(Number(process.env.APP_PORT ?? 3000));
}

void bootstrap();
