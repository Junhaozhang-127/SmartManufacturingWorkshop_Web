import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserProfile, PermissionCodes } from '@smw/shared';

import { CurrentUser, RequirePermissions } from '../auth/auth.decorators';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { ApprovalService } from './approval.service';
import { ApprovalCenterQueryDto } from './dto/approval-center-query.dto';
import { ApprovalCommentDto } from './dto/approval-comment.dto';
import { ApprovalTransferDto } from './dto/approval-transfer.dto';

@Controller()
@UseGuards(AuthGuard, PermissionGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get('approval-center')
  @RequirePermissions(PermissionCodes.approvalCenterView)
  list(@CurrentUser() currentUser: CurrentUserProfile, @Query() query: ApprovalCenterQueryDto) {
    return this.approvalService.getApprovalList(currentUser, query);
  }

  @Get('approval-center/:id')
  @RequirePermissions(PermissionCodes.approvalCenterView)
  detail(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string) {
    return this.approvalService.getApprovalDetail(currentUser, id);
  }

  @Get('approval-center/:id/transfer-candidates')
  @RequirePermissions(PermissionCodes.approvalApprove)
  transferCandidates(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string) {
    return this.approvalService.getTransferCandidates(currentUser, id);
  }

  @Post('approval-center/:id/approve')
  @RequirePermissions(PermissionCodes.approvalApprove)
  approve(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: ApprovalCommentDto,
  ) {
    return this.approvalService.approve(currentUser, id, payload);
  }

  @Post('approval-center/:id/reject')
  @RequirePermissions(PermissionCodes.approvalApprove)
  reject(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: ApprovalCommentDto,
  ) {
    return this.approvalService.reject(currentUser, id, payload);
  }

  @Post('approval-center/:id/return')
  @RequirePermissions(PermissionCodes.approvalApprove)
  returnForSupplement(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: ApprovalCommentDto,
  ) {
    return this.approvalService.returnForSupplement(currentUser, id, payload);
  }

  @Post('approval-center/:id/transfer')
  @RequirePermissions(PermissionCodes.approvalApprove)
  transfer(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: ApprovalTransferDto,
  ) {
    return this.approvalService.transfer(currentUser, id, payload);
  }

  @Post('approval-center/:id/comment')
  @RequirePermissions(PermissionCodes.approvalCenterView)
  comment(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: ApprovalCommentDto,
  ) {
    return this.approvalService.comment(currentUser, id, payload);
  }

  @Post('approval-center/:id/withdraw')
  @RequirePermissions(PermissionCodes.approvalCenterView)
  withdraw(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: ApprovalCommentDto,
  ) {
    return this.approvalService.withdraw(currentUser, id, payload);
  }

  @Post('approval-center/:id/resubmit')
  @RequirePermissions(PermissionCodes.approvalCenterView)
  resubmit(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: ApprovalCommentDto,
  ) {
    return this.approvalService.resubmit(currentUser, id, payload);
  }

  @Get('dashboard/approval-summary')
  @RequirePermissions(PermissionCodes.systemDashboardView)
  summary(@CurrentUser() currentUser: CurrentUserProfile) {
    return this.approvalService.getDashboardSummary(currentUser);
  }
}
