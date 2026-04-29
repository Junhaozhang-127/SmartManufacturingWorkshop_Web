import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { type CurrentUserProfile, DataScope, type DataScopeContext, PermissionCodes, RoleCode } from '@smw/shared';

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
import { AssignOrgMembersDto } from './dto/assign-org-members.dto';
import { BindMentorDto } from './dto/bind-mentor.dto';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { CreateRegularizationDto } from './dto/create-regularization.dto';
import { CreateStageEvaluationDto } from './dto/create-stage-evaluation.dto';
import { MemberQueryDto } from './dto/member-query.dto';
import { RegularizationQueryDto } from './dto/regularization-query.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UpdateOrgLeaderDto } from './dto/update-org-leader.dto';
import { MemberService } from './member.service';

@Controller()
@UseGuards(AuthGuard, PermissionGuard, DataScopeGuard)
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  private assertArchiveWritable(currentUser: CurrentUserProfile) {
    if (![RoleCode.MINISTER, RoleCode.TEACHER].includes(currentUser.activeRole.roleCode)) {
      throw new ForbiddenException('仅部长和老师允许修改成员档案');
    }
  }

  @Get('org-units/tree')
  @RequirePermissions(PermissionCodes.orgTreeView)
  @RequireDataScope()
  getOrgTree(@DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.memberService.getOrgOverview(dataScopeContext);
  }

  @Get('org-units/member-options')
  @RequirePermissions(PermissionCodes.orgTreeView)
  @RequireDataScope()
  listOrgMemberOptions(@DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.memberService.listOrgMemberOptions(dataScopeContext);
  }

  @Post('org-units/departments')
  @RequirePermissions(PermissionCodes.orgTreeView)
  @RequireDataScope()
  createDepartment(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Body() payload: CreateOrgUnitDto,
  ) {
    if (currentUser.activeRole.roleCode !== RoleCode.TEACHER) {
      throw new ForbiddenException('仅老师可新增部门');
    }
    return this.memberService.createDepartment(currentUser, payload);
  }

  @Post('org-units/groups')
  @RequirePermissions(PermissionCodes.orgTreeView)
  @RequireDataScope()
  createGroup(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Body() payload: CreateOrgUnitDto,
  ) {
    if (currentUser.activeRole.roleCode !== RoleCode.MINISTER) {
      throw new ForbiddenException('仅部长可新增小组');
    }
    return this.memberService.createGroup(currentUser, payload);
  }

  @Patch('org-units/:id/leader')
  @RequirePermissions(PermissionCodes.orgTreeView)
  @RequireDataScope()
  updateLeader(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: UpdateOrgLeaderDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    if (![RoleCode.TEACHER, RoleCode.MINISTER].includes(currentUser.activeRole.roleCode)) {
      throw new ForbiddenException('无权限调整负责人');
    }
    return this.memberService.updateOrgLeader(currentUser, id, payload.leaderUserId ?? null, dataScopeContext);
  }

  @Put('org-units/:id/members')
  @RequirePermissions(PermissionCodes.orgTreeView)
  @RequireDataScope()
  assignMembers(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: AssignOrgMembersDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    if (![RoleCode.TEACHER, RoleCode.MINISTER].includes(currentUser.activeRole.roleCode)) {
      throw new ForbiddenException('无权限分配成员');
    }
    return this.memberService.assignMembersToOrgUnit(currentUser, id, payload.memberProfileIds ?? [], dataScopeContext);
  }

  @Get('members')
  @RequirePermissions(PermissionCodes.memberListView)
  @RequireDataScope()
  listMembers(
    @Query() query: MemberQueryDto,
    @Query('viewAll') viewAll: string | undefined,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    const shouldViewAll = query.viewAll || viewAll === 'true' || viewAll === '1';
    const effectiveContext = shouldViewAll ? { ...dataScopeContext, scope: DataScope.ALL } : dataScopeContext;
    return this.memberService.listMembers(query, effectiveContext);
  }

  @Get('members/:id')
  @RequirePermissions(PermissionCodes.memberListView)
  @RequireDataScope()
  getMemberDetail(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Query('viewAll') viewAll: string | boolean | undefined,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    const effectiveContext =
      viewAll === true || viewAll === 'true' || viewAll === '1'
        ? { ...dataScopeContext, scope: DataScope.ALL }
        : dataScopeContext;
    return this.memberService.getMemberDetail(currentUser, id, effectiveContext);
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
    this.assertArchiveWritable(currentUser);
    return this.memberService.updateMember(currentUser, id, { ...dataScopeContext, scope: DataScope.ALL }, payload);
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
    this.assertArchiveWritable(currentUser);
    return this.memberService.bindMentor(currentUser, id, { ...dataScopeContext, scope: DataScope.ALL }, payload);
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
  getRegularizationDetail(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.memberService.getRegularizationDetail(currentUser, id, dataScopeContext);
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
}
