import { validateEnv } from '@api/shared/env.validation';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApprovalModule } from './approval/approval.module';
import { AuthModule } from './auth/auth.module';
import { CompetitionAchievementModule } from './competition-achievement/competition-achievement.module';
import { ExampleModule } from './example/example.module';
import { HealthModule } from './health/health.module';
import { MemberModule } from './member/member.module';
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
    MemberModule,
    CompetitionAchievementModule,
    ApprovalModule,
  ],
})
export class AppModule {}
