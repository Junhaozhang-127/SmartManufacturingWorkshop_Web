import { validateEnv } from '@api/shared/env.validation';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApprovalModule } from './approval/approval.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { CompetitionAchievementModule } from './competition-achievement/competition-achievement.module';
import { CreationModule } from './creation/creation.module';
import { DeviceModule } from './device/device.module';
import { EvaluationPromotionModule } from './evaluation-promotion/evaluation-promotion.module';
import { FileModule } from './file/file.module';
import { FinanceModule } from './finance/finance.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { MemberModule } from './member/member.module';
import { PortalModule } from './portal/portal.module';
import { PrismaModule } from './prisma/prisma.module';
import { SystemModule } from './system/system.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    FileModule,
    AttachmentsModule,
    FinanceModule,
    AuthModule,
    MemberModule,
    InventoryModule,
    CompetitionAchievementModule,
    EvaluationPromotionModule,
    DeviceModule,
    ApprovalModule,
    SystemModule,
    PortalModule,
    CreationModule,
  ],
})
export class AppModule {}
