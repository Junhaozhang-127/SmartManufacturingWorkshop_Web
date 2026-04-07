import { Module } from '@nestjs/common';

import { ApprovalModule } from '../approval/approval.module';
import { AuthModule } from '../auth/auth.module';
import { EvaluationPromotionModule } from '../evaluation-promotion/evaluation-promotion.module';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';

@Module({
  imports: [AuthModule, ApprovalModule, EvaluationPromotionModule],
  controllers: [MemberController],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}
