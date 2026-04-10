import { Module } from '@nestjs/common';

import { ApprovalModule } from '../approval/approval.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { AuthModule } from '../auth/auth.module';
import { AchievementRecognitionService } from './achievement-recognition.service';
import { CompetitionAchievementController } from './competition-achievement.controller';
import { CompetitionAchievementService } from './competition-achievement.service';

@Module({
  imports: [AuthModule, ApprovalModule, AttachmentsModule],
  controllers: [CompetitionAchievementController],
  providers: [CompetitionAchievementService, AchievementRecognitionService],
  exports: [CompetitionAchievementService, AchievementRecognitionService],
})
export class CompetitionAchievementModule {}
