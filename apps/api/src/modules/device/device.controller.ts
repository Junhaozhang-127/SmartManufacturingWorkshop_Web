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
import { DeviceService } from './device.service';
import { AssignDeviceRepairDto } from './dto/assign-device-repair.dto';
import { ConfirmDeviceRepairDto } from './dto/confirm-device-repair.dto';
import { CreateDeviceRepairDto } from './dto/create-device-repair.dto';
import { DeviceQueryDto } from './dto/device-query.dto';
import { DeviceRepairQueryDto } from './dto/device-repair-query.dto';
import { ResolveDeviceRepairDto } from './dto/resolve-device-repair.dto';

@Controller()
@UseGuards(AuthGuard, PermissionGuard, DataScopeGuard)
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get('devices')
  @RequirePermissions(PermissionCodes.deviceView)
  @RequireDataScope()
  listDevices(@Query() query: DeviceQueryDto, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.deviceService.listDevices(query, dataScopeContext);
  }

  @Get('devices/:id')
  @RequirePermissions(PermissionCodes.deviceView)
  @RequireDataScope()
  getDeviceDetail(@Param('id') id: string, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.deviceService.getDeviceDetail(id, dataScopeContext);
  }

  @Get('device-repairs')
  @RequirePermissions(PermissionCodes.deviceRepairView)
  @RequireDataScope()
  listRepairs(@Query() query: DeviceRepairQueryDto, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.deviceService.listRepairs(query, dataScopeContext);
  }

  @Get('device-repairs/:id')
  @RequirePermissions(PermissionCodes.deviceRepairView)
  @RequireDataScope()
  getRepairDetail(@Param('id') id: string, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.deviceService.getRepairDetail(id, dataScopeContext);
  }

  @Post('device-repairs')
  @RequirePermissions(PermissionCodes.deviceRepairCreate)
  @RequireDataScope()
  createRepair(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Body() payload: CreateDeviceRepairDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.deviceService.createRepair(currentUser, payload, dataScopeContext);
  }

  @Post('device-repairs/:id/assign')
  @RequirePermissions(PermissionCodes.deviceRepairUpdate)
  @RequireDataScope()
  assignRepair(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: AssignDeviceRepairDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.deviceService.assignRepair(currentUser, id, payload, dataScopeContext);
  }

  @Post('device-repairs/:id/resolve')
  @RequirePermissions(PermissionCodes.deviceRepairUpdate)
  @RequireDataScope()
  resolveRepair(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: ResolveDeviceRepairDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.deviceService.resolveRepair(currentUser, id, payload, dataScopeContext);
  }

  @Post('device-repairs/:id/confirm')
  @RequirePermissions(PermissionCodes.deviceRepairCreate)
  @RequireDataScope()
  confirmRepair(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: ConfirmDeviceRepairDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.deviceService.confirmRepair(currentUser, id, payload, dataScopeContext);
  }

  @Get('dashboard/device-summary')
  @RequirePermissions(PermissionCodes.systemDashboardView)
  @RequireDataScope()
  getDashboardSummary(@DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.deviceService.getDashboardSummary(dataScopeContext);
  }
}
