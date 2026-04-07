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
import { ConsumableQueryDto } from './dto/consumable-query.dto';
import { ConsumableRequestQueryDto } from './dto/consumable-request-query.dto';
import { CreateConsumableDto } from './dto/create-consumable.dto';
import { CreateConsumableRequestDto } from './dto/create-consumable-request.dto';
import { CreateInventoryTxnDto } from './dto/create-inventory-txn.dto';
import { InventoryTxnQueryDto } from './dto/inventory-txn-query.dto';
import { InventoryService } from './inventory.service';

@Controller()
@UseGuards(AuthGuard, PermissionGuard, DataScopeGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('inventory/consumables')
  @RequirePermissions(PermissionCodes.inventoryView)
  @RequireDataScope()
  listConsumables(@Query() query: ConsumableQueryDto, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.inventoryService.listConsumables(query, dataScopeContext);
  }

  @Get('inventory/consumables/:id')
  @RequirePermissions(PermissionCodes.inventoryView)
  @RequireDataScope()
  getConsumableDetail(@Param('id') id: string, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.inventoryService.getConsumableDetail(id, dataScopeContext);
  }

  @Post('inventory/consumables')
  @RequirePermissions(PermissionCodes.inventoryCreate)
  @RequireDataScope()
  createConsumable(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Body() payload: CreateConsumableDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.inventoryService.createConsumable(currentUser, payload, dataScopeContext);
  }

  @Get('inventory/requests')
  @RequirePermissions(PermissionCodes.inventoryView)
  @RequireDataScope()
  listRequests(@Query() query: ConsumableRequestQueryDto, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.inventoryService.listRequests(query, dataScopeContext);
  }

  @Get('inventory/requests/:id')
  @RequirePermissions(PermissionCodes.inventoryView)
  @RequireDataScope()
  getRequestDetail(@Param('id') id: string, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.inventoryService.getRequestDetail(id, dataScopeContext);
  }

  @Post('inventory/requests')
  @RequirePermissions(PermissionCodes.inventoryCreate)
  @RequireDataScope()
  createRequest(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Body() payload: CreateConsumableRequestDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.inventoryService.createRequest(currentUser, payload, dataScopeContext);
  }

  @Get('inventory/transactions')
  @RequirePermissions(PermissionCodes.inventoryView)
  @RequireDataScope()
  listTransactions(@Query() query: InventoryTxnQueryDto, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.inventoryService.listTransactions(query, dataScopeContext);
  }

  @Post('inventory/transactions/inbound')
  @RequirePermissions(PermissionCodes.inventoryUpdate)
  @RequireDataScope()
  createInboundTxn(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Body() payload: CreateInventoryTxnDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.inventoryService.createInboundTxn(currentUser, payload, dataScopeContext);
  }

  @Post('inventory/transactions/outbound')
  @RequirePermissions(PermissionCodes.inventoryUpdate)
  @RequireDataScope()
  createOutboundTxn(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Body() payload: CreateInventoryTxnDto,
    @DataScopeContextParam() dataScopeContext: DataScopeContext,
  ) {
    return this.inventoryService.createOutboundTxn(currentUser, payload, dataScopeContext);
  }
}
