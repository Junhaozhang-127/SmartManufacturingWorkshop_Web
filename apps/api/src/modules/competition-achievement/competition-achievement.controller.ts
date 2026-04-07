import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { type CurrentUserProfile, type DataScopeContext, PermissionCodes } from '@smw/shared';

import {
  CurrentUser,
  DataScopeContextParam,
  RequireDataScope,
  RequirePermissions,
} from '../auth/auth.decorators';
import { AuthGuard } from '../auth/auth.guard';
import { DataScopeGuard } from '../auth/data-scope.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { CompetitionAchievementService } from './competition-achievement.service';
import { AchievementQueryDto } from './dto/achievement-query.dto';
import { CompetitionQueryDto } from './dto/competition-query.dto';
import { RegisterCompetitionTeamDto } from './dto/register-competition-team.dto';
import { UpsertAchievementDto } from './dto/upsert-achievement.dto';
import { UpsertCompetitionDto } from './dto/upsert-competition.dto';

@Controller()
@UseGuards(AuthGuard, PermissionGuard, DataScopeGuard)
export class CompetitionAchievementController {
  constructor(private readonly competitionAchievementService: CompetitionAchievementService) {}

  @Get('competitions')
  @RequirePermissions(PermissionCodes.competitionView)
  @RequireDataScope()
  listCompetitions(@Query() query: CompetitionQueryDto) {
    return this.competitionAchievementService.listCompetitions(query);
  }

  @Get('competitions/options')
  @RequirePermissions(PermissionCodes.competitionView)
  listCompetitionOptions() {
    return this.competitionAchievementService.listCompetitionOptions();
  }

  @Get('competitions/:id')
  @RequirePermissions(PermissionCodes.competitionView)
  @RequireDataScope()
  getCompetitionDetail(@Param('id') id: string, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.competitionAchievementService.getCompetitionDetail(id, dataScopeContext);
  }

  @Post('competitions')
  @RequirePermissions(PermissionCodes.competitionCreate)
  createCompetition(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: UpsertCompetitionDto) {
    return this.competitionAchievementService.upsertCompetition(currentUser, null, payload);
  }

  @Patch('competitions/:id')
  @RequirePermissions(PermissionCodes.competitionUpdate)
  updateCompetition(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: UpsertCompetitionDto,
  ) {
    return this.competitionAchievementService.upsertCompetition(currentUser, id, payload);
  }

  @Post('competitions/:id/teams')
  @RequirePermissions(PermissionCodes.competitionRegistrationCreate)
  @RequireDataScope()
  registerCompetitionTeam(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: RegisterCompetitionTeamDto,
  ) {
    return this.competitionAchievementService.registerCompetitionTeam(currentUser, id, payload);
  }

  @Get('achievement-users/options')
  @RequirePermissions(PermissionCodes.achievementView)
  listUsers() {
    return this.competitionAchievementService.listUserOptions();
  }

  @Get('achievements')
  @RequirePermissions(PermissionCodes.achievementView)
  @RequireDataScope()
  listAchievements(@Query() query: AchievementQueryDto, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.competitionAchievementService.listAchievements(query, dataScopeContext);
  }

  @Get('achievements/:id')
  @RequirePermissions(PermissionCodes.achievementView)
  @RequireDataScope()
  getAchievementDetail(@Param('id') id: string, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.competitionAchievementService.getAchievementDetail(id, dataScopeContext);
  }

  @Post('achievements')
  @RequirePermissions(PermissionCodes.achievementCreate)
  @RequireDataScope()
  createAchievement(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Body() payload: UpsertAchievementDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.competitionAchievementService.createAchievement(currentUser, payload, dataScopeContext);
  }

  @Patch('achievements/:id')
  @RequirePermissions(PermissionCodes.achievementUpdate)
  @RequireDataScope()
  updateAchievement(
    @Param('id') id: string,
    @CurrentUser() currentUser: CurrentUserProfile,
    @Body() payload: UpsertAchievementDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.competitionAchievementService.updateAchievement(id, currentUser, payload, dataScopeContext);
  }
}
