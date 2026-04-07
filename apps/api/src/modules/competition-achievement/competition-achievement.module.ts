import { Module } from '@nestjs/common';

import { ApprovalModule } from '../approval/approval.module';
import { AuthModule } from '../auth/auth.module';
import { AchievementRecognitionService } from './achievement-recognition.service';
import { CompetitionAchievementController } from './competition-achievement.controller';
import { CompetitionAchievementService } from './competition-achievement.service';

@Module({
  imports: [AuthModule, ApprovalModule],
  controllers: [CompetitionAchievementController],
  providers: [CompetitionAchievementService, AchievementRecognitionService],
  exports: [CompetitionAchievementService, AchievementRecognitionService],
})
export class CompetitionAchievementModule {}
