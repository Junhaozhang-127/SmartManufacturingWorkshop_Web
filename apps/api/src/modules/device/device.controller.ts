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
import { CreateDeviceDto } from './dto/create-device.dto';
import { CreateDeviceRepairDto } from './dto/create-device-repair.dto';
import { DeviceLedgerQueryDto } from './dto/device-ledger-query.dto';
import { DeviceRepairQueryDto } from './dto/device-repair-query.dto';
import { ResolveDeviceRepairDto } from './dto/resolve-device-repair.dto';

@Controller()
@UseGuards(AuthGuard, PermissionGuard, DataScopeGuard)
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get('devices')
  @RequirePermissions(PermissionCodes.deviceRepairView)
  @RequireDataScope()
  listDevices(@Query() query: DeviceLedgerQueryDto, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.deviceService.listDevices(
      {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 10,
        keyword: query.keyword,
        statusCode: query.statusCode,
      },
      dataScopeContext,
    );
  }

  @Get('devices/:id')
  @RequirePermissions(PermissionCodes.deviceRepairView)
  @RequireDataScope()
  getDeviceDetail(@Param('id') id: string, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.deviceService.getDeviceDetail(id, dataScopeContext);
  }

  @Post('devices')
  @RequirePermissions(PermissionCodes.deviceLedgerCreate)
  @RequireDataScope()
  createDevice(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Body() payload: CreateDeviceDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.deviceService.createDevice(currentUser, payload, dataScopeContext);
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
