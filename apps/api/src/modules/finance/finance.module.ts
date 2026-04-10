import { ApprovalModule } from '@api/modules/approval/approval.module';
import { AttachmentsModule } from '@api/modules/attachments/attachments.module';
import { AuthModule } from '@api/modules/auth/auth.module';
import { Module } from '@nestjs/common';

import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [ApprovalModule, AuthModule, AttachmentsModule],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
