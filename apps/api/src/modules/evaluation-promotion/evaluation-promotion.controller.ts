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
import { CreatePromotionApplicationDto } from './dto/create-promotion-application.dto';
import { EvaluationQueryDto } from './dto/evaluation-query.dto';
import { PromotionApplicationQueryDto } from './dto/promotion-application-query.dto';
import { PromotionEligibilityQueryDto } from './dto/promotion-eligibility-query.dto';
import { PublishPromotionResultDto } from './dto/publish-promotion-result.dto';
import { UpdateManualScoreDto } from './dto/update-manual-score.dto';
import { UpdatePromotionReviewDto } from './dto/update-promotion-review.dto';
import { EvaluationPromotionService } from './evaluation-promotion.service';

@Controller()
@UseGuards(AuthGuard, PermissionGuard, DataScopeGuard)
export class EvaluationPromotionController {
  constructor(private readonly evaluationPromotionService: EvaluationPromotionService) {}

  @Get('evaluation-schemes')
  @RequirePermissions(PermissionCodes.evaluationView)
  listSchemes() {
    return this.evaluationPromotionService.listSchemes();
  }

  @Get('evaluation-scores')
  @RequirePermissions(PermissionCodes.evaluationView)
  @RequireDataScope()
  listEvaluationScores(
    @Query() query: EvaluationQueryDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.evaluationPromotionService.listEvaluationScores(query, dataScopeContext);
  }

  @Get('evaluation-scores/:id')
  @RequirePermissions(PermissionCodes.evaluationView)
  @RequireDataScope()
  getEvaluationScoreDetail(@Param('id') id: string, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.evaluationPromotionService.getEvaluationScoreDetail(id, dataScopeContext);
  }

  @Post('evaluation-schemes/:id/refresh')
  @RequirePermissions(PermissionCodes.evaluationUpdate)
  @RequireDataScope()
  refreshEvaluationScores(@Param('id') id: string, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.evaluationPromotionService.refreshEvaluationScores(id, dataScopeContext);
  }

  @Patch('evaluation-scores/:id/manual-score')
  @RequirePermissions(PermissionCodes.evaluationUpdate)
  @RequireDataScope()
  updateManualScore(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
    @Body() payload: UpdateManualScoreDto,
  ) {
    return this.evaluationPromotionService.updateManualScore(currentUser, id, dataScopeContext, payload);
  }

  @Get('promotion-eligibility')
  @RequirePermissions(PermissionCodes.promotionView)
  @RequireDataScope()
  listPromotionEligibility(
    @Query() query: PromotionEligibilityQueryDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.evaluationPromotionService.listPromotionEligibility(query, dataScopeContext);
  }

  @Get('promotion-applications')
  @RequirePermissions(PermissionCodes.promotionView)
  @RequireDataScope()
  listPromotionApplications(
    @Query() query: PromotionApplicationQueryDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.evaluationPromotionService.listPromotionApplications(query, dataScopeContext);
  }

  @Get('promotion-applications/:id')
  @RequirePermissions(PermissionCodes.promotionView)
  @RequireDataScope()
  getPromotionApplicationDetail(
    @Param('id') id: string,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.evaluationPromotionService.getPromotionApplicationDetail(id, dataScopeContext);
  }

  @Post('promotion-applications')
  @RequirePermissions(PermissionCodes.promotionCreate)
  @RequireDataScope()
  createPromotionApplication(
    @CurrentUser() currentUser: CurrentUserProfile,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
    @Body() payload: CreatePromotionApplicationDto,
  ) {
    return this.evaluationPromotionService.createPromotionApplication(currentUser, dataScopeContext, payload);
  }

  @Patch('promotion-applications/:id/review')
  @RequirePermissions(PermissionCodes.promotionApprove)
  @RequireDataScope()
  updatePromotionReview(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
    @Body() payload: UpdatePromotionReviewDto,
  ) {
    return this.evaluationPromotionService.updatePromotionReview(currentUser, id, dataScopeContext, payload);
  }

  @Post('promotion-applications/:id/publish')
  @RequirePermissions(PermissionCodes.promotionApprove)
  @RequireDataScope()
  publishPromotionResult(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
    @Body() payload: PublishPromotionResultDto,
  ) {
    return this.evaluationPromotionService.publishPromotionResult(currentUser, id, dataScopeContext, payload);
  }

  @Post('promotion-applications/:id/approve')
  @RequirePermissions(PermissionCodes.promotionApprove)
  @RequireDataScope()
  approvePromotion(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
    @Body() payload: ApprovalCommentDto,
  ) {
    return this.evaluationPromotionService.approvePromotion(currentUser, id, dataScopeContext, payload);
  }

  @Post('promotion-applications/:id/reject')
  @RequirePermissions(PermissionCodes.promotionApprove)
  @RequireDataScope()
  rejectPromotion(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
    @Body() payload: ApprovalCommentDto,
  ) {
    return this.evaluationPromotionService.rejectPromotion(currentUser, id, dataScopeContext, payload);
  }

  @Post('promotion-applications/:id/withdraw')
  @RequirePermissions(PermissionCodes.promotionCreate)
  @RequireDataScope()
  withdrawPromotion(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
    @Body() payload: ApprovalCommentDto,
  ) {
    return this.evaluationPromotionService.withdrawPromotion(currentUser, id, dataScopeContext, payload);
  }
}
