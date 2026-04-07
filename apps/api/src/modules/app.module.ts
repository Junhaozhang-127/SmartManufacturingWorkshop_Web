import { validateEnv } from '@api/shared/env.validation';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApprovalModule } from './approval/approval.module';
import { AuthModule } from './auth/auth.module';
import { ExampleModule } from './example/example.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    ExampleModule,
    ApprovalModule,
  ],
})
export class AppModule {}
