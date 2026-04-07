import { Module } from '@nestjs/common';

import { ApprovalModule } from '../approval/approval.module';
import { AuthModule } from '../auth/auth.module';
import { EvaluationPromotionController } from './evaluation-promotion.controller';
import { EvaluationPromotionService } from './evaluation-promotion.service';
import { PromotionQualificationService } from './promotion-qualification.service';

@Module({
  imports: [AuthModule, ApprovalModule],
  controllers: [EvaluationPromotionController],
  providers: [EvaluationPromotionService, PromotionQualificationService],
  exports: [EvaluationPromotionService, PromotionQualificationService],
})
export class EvaluationPromotionModule {}
