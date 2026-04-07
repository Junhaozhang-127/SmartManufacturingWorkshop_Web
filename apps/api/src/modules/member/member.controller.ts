import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { type CurrentUserProfile, type DataScopeContext, PermissionCodes } from '@smw/shared';

import { ApprovalCommentDto } from '../approval/dto/approval-comment.dto';
import {
  CurrentUser,
  DataScopeContextParam,
  RequireDataScope,
  RequirePermissions,
} from '../auth/auth.decorators';
import { AuthGuard } from '../auth/auth.guard';
import { DataScopeGuard } from '../auth/data-scope.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { BindMentorDto } from './dto/bind-mentor.dto';
import { CreateRegularizationDto } from './dto/create-regularization.dto';
import { CreateStageEvaluationDto } from './dto/create-stage-evaluation.dto';
import { MemberQueryDto } from './dto/member-query.dto';
import { RegularizationQueryDto } from './dto/regularization-query.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberService } from './member.service';

@Controller()
@UseGuards(AuthGuard, PermissionGuard, DataScopeGuard)
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get('org-units/tree')
  @RequirePermissions(PermissionCodes.orgTreeView)
  @RequireDataScope()
  getOrgTree(@DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.memberService.getOrgOverview(dataScopeContext);
  }

  @Get('members')
  @RequirePermissions(PermissionCodes.memberListView)
  @RequireDataScope()
  listMembers(@Query() query: MemberQueryDto, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.memberService.listMembers(query, dataScopeContext);
  }

  @Get('members/:id')
  @RequirePermissions(PermissionCodes.memberListView)
  @RequireDataScope()
  getMemberDetail(@Param('id') id: string, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.memberService.getMemberDetail(id, dataScopeContext);
  }

  @Patch('members/:id')
  @RequirePermissions(PermissionCodes.memberUpdate)
  @RequireDataScope()
  updateMember(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
    @Body() payload: UpdateMemberDto,
  ) {
    return this.memberService.updateMember(currentUser, id, dataScopeContext, payload);
  }

  @Post('members/:id/mentor-binding')
  @RequirePermissions(PermissionCodes.memberUpdate)
  @RequireDataScope()
  bindMentor(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
    @Body() payload: BindMentorDto,
  ) {
    return this.memberService.bindMentor(currentUser, id, dataScopeContext, payload);
  }

  @Post('members/:id/stage-evaluations')
  @RequirePermissions(PermissionCodes.memberApprove)
  @RequireDataScope()
  createStageEvaluation(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
    @Body() payload: CreateStageEvaluationDto,
  ) {
    return this.memberService.createStageEvaluation(currentUser, id, dataScopeContext, payload);
  }

  @Get('member-regularizations')
  @RequirePermissions(PermissionCodes.memberListView)
  @RequireDataScope()
  listRegularizations(
    @Query() query: RegularizationQueryDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.memberService.listRegularizations(query, dataScopeContext);
  }

  @Get('member-regularizations/:id')
  @RequirePermissions(PermissionCodes.memberListView)
  @RequireDataScope()
  getRegularizationDetail(@Param('id') id: string, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.memberService.getRegularizationDetail(id, dataScopeContext);
  }

  @Post('member-regularizations')
  @RequirePermissions(PermissionCodes.memberCreate)
  @RequireDataScope()
  createRegularization(
    @CurrentUser() currentUser: CurrentUserProfile,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
    @Body() payload: CreateRegularizationDto,
  ) {
    return this.memberService.createRegularization(currentUser, dataScopeContext, payload);
  }

  @Post('member-regularizations/:id/approve')
  @RequirePermissions(PermissionCodes.memberApprove)
  @RequireDataScope()
  approveRegularization(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
    @Body() payload: ApprovalCommentDto,
  ) {
    return this.memberService.approveRegularization(currentUser, id, dataScopeContext, payload);
  }

  @Post('member-regularizations/:id/reject')
  @RequirePermissions(PermissionCodes.memberApprove)
  @RequireDataScope()
  rejectRegularization(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
    @Body() payload: ApprovalCommentDto,
  ) {
    return this.memberService.rejectRegularization(currentUser, id, dataScopeContext, payload);
  }

  @Post('member-regularizations/:id/withdraw')
  @RequirePermissions(PermissionCodes.memberCreate)
  @RequireDataScope()
  withdrawRegularization(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
    @Body() payload: ApprovalCommentDto,
  ) {
    return this.memberService.withdrawRegularization(currentUser, id, dataScopeContext, payload);
  }

  @Get('member-transfers/reserved')
  @RequirePermissions(PermissionCodes.memberListView)
  getReservedTransferFeature() {
    return this.memberService.getReservedTransferFeature();
  }

  @Get('member-exits/reserved')
  @RequirePermissions(PermissionCodes.memberListView)
  getReservedExitFeature() {
    return this.memberService.getReservedExitFeature();
  }
}
