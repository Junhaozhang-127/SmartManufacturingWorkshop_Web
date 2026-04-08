import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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
import { CreateFundApplicationDto } from './dto/create-fund-application.dto';
import { FundApplicationQueryDto } from './dto/fund-application-query.dto';
import { MarkFundPaymentDto } from './dto/mark-fund-payment.dto';
import { FinanceService } from './finance.service';

@Controller('funds')
@UseGuards(AuthGuard, PermissionGuard, DataScopeGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('overview')
  @RequirePermissions(PermissionCodes.fundView)
  @RequireDataScope()
  getOverview(@CurrentUser() currentUser: CurrentUserProfile, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.financeService.getOverview(currentUser, dataScopeContext);
  }

  @Get('accounts')
  @RequirePermissions(PermissionCodes.fundCreate)
  @RequireDataScope()
  listAccounts(@DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.financeService.listAccounts(dataScopeContext);
  }

  @Get('applications')
  @RequirePermissions(PermissionCodes.fundCreate)
  @RequireDataScope()
  listApplications(@Query() query: FundApplicationQueryDto, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.financeService.listApplications(query, dataScopeContext);
  }

  @Get('applications/:id')
  @RequirePermissions(PermissionCodes.fundCreate)
  @RequireDataScope()
  getApplicationDetail(@Param('id') id: string, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.financeService.getApplicationDetail(id, dataScopeContext);
  }

  @Post('applications')
  @RequirePermissions(PermissionCodes.fundCreate)
  @RequireDataScope()
  createApplication(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Body() payload: CreateFundApplicationDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.financeService.createApplication(currentUser, payload, dataScopeContext);
  }

  @Post('applications/:id/pay')
  @RequirePermissions(PermissionCodes.fundUpdate)
  @RequireDataScope()
  markPayment(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: MarkFundPaymentDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.financeService.markPayment(currentUser, id, payload, dataScopeContext);
  }

  @Get('projects/:projectId')
  @RequirePermissions(PermissionCodes.fundCreate)
  @RequireDataScope()
  getProjectDetail(@Param('projectId') projectId: string, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.financeService.getProjectDetail(projectId, dataScopeContext);
  }
}
