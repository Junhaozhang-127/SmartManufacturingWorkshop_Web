import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { type CurrentUserProfile, PermissionCodes } from '@smw/shared';

import { CurrentUser, RequirePermissions } from '../auth/auth.decorators';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { CreationService } from './creation.service';
import { ApproveCreationContentDto, PublishCreationContentDto, RejectCreationContentDto, ReviewListQueryDto } from './dto/creation-review.dto';

@Controller('creation/review')
@UseGuards(AuthGuard, PermissionGuard)
export class CreationReviewController {
  constructor(private readonly creationService: CreationService) {}

  @Get('pending')
  @RequirePermissions(PermissionCodes.approvalCenterView)
  listPending(@CurrentUser() currentUser: CurrentUserProfile, @Query() query: ReviewListQueryDto) {
    return this.creationService.listPendingReviews(currentUser, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
      keyword: query.keyword,
    });
  }

  @Get('approved')
  @RequirePermissions(PermissionCodes.approvalCenterView)
  listApproved(@CurrentUser() currentUser: CurrentUserProfile, @Query() query: ReviewListQueryDto) {
    return this.creationService.listApprovedReviews(currentUser, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
      keyword: query.keyword,
    });
  }

  @Post(':id/approve')
  @RequirePermissions(PermissionCodes.approvalApprove)
  approve(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string, @Body() payload: ApproveCreationContentDto) {
    return this.creationService.approve(currentUser, id, payload);
  }

  @Post(':id/reject')
  @RequirePermissions(PermissionCodes.approvalApprove)
  reject(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string, @Body() payload: RejectCreationContentDto) {
    return this.creationService.reject(currentUser, id, payload.reviewComment);
  }

  @Patch(':id/publish')
  @RequirePermissions(PermissionCodes.approvalApprove)
  publish(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string, @Body() payload: PublishCreationContentDto) {
    return this.creationService.publishSettings(currentUser, id, payload);
  }
}

