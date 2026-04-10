import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserProfile, PermissionCodes } from '@smw/shared';

import { CurrentUser, RequirePermissions } from '../auth/auth.decorators';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { PublishNotificationDto } from './dto/publish-notification.dto';
import { UpdatePersonalCenterDto } from './dto/update-personal-center.dto';
import { UpsertApprovalTemplateDto } from './dto/upsert-approval-template.dto';
import { UpsertConfigItemDto } from './dto/upsert-config-item.dto';
import { UpsertDictionaryDto } from './dto/upsert-dictionary.dto';
import { UpsertDictionaryItemDto } from './dto/upsert-dictionary-item.dto';
import { SystemService } from './system.service';

@Controller()
@UseGuards(AuthGuard, PermissionGuard)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('dashboard/home')
  @RequirePermissions(PermissionCodes.systemDashboardView)
  getHomeDashboard(@CurrentUser() currentUser: CurrentUserProfile) {
    return this.systemService.getHomeDashboard(currentUser);
  }

  @Get('profile/me')
  @RequirePermissions(PermissionCodes.profileView)
  getPersonalCenter(@CurrentUser() currentUser: CurrentUserProfile) {
    return this.systemService.getPersonalCenter(currentUser);
  }

  @Patch('profile/me')
  @RequirePermissions(PermissionCodes.profileView)
  updatePersonalCenter(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: UpdatePersonalCenterDto) {
    return this.systemService.updatePersonalCenter(currentUser, payload);
  }

  @Get('notifications')
  @RequirePermissions(PermissionCodes.notificationView)
  listNotifications(@CurrentUser() currentUser: CurrentUserProfile, @Query() query: NotificationQueryDto) {
    return this.systemService.listNotifications(currentUser, query);
  }

  @Post('notifications/publish')
  @RequirePermissions(PermissionCodes.notificationUpdate)
  publishNotification(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: PublishNotificationDto) {
    return this.systemService.publishNotification(currentUser, payload);
  }

  @Post('notifications/read-all')
  @RequirePermissions(PermissionCodes.notificationUpdate)
  markAllNotificationsAsRead(@CurrentUser() currentUser: CurrentUserProfile) {
    return this.systemService.markAllNotificationsAsRead(currentUser);
  }

  @Post('notifications/:id/read')
  @RequirePermissions(PermissionCodes.notificationUpdate)
  markNotificationAsRead(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string) {
    return this.systemService.markNotificationAsRead(currentUser, id);
  }

  @Get('system/configuration')
  @RequirePermissions(PermissionCodes.systemConfigView)
  getSystemConfiguration() {
    return this.systemService.getSystemConfiguration();
  }

  @Post('system/configuration/dictionaries')
  @RequirePermissions(PermissionCodes.systemConfigUpdate)
  upsertDictionary(@Body() payload: UpsertDictionaryDto) {
    return this.systemService.upsertDictionary(payload);
  }

  @Post('system/configuration/dictionaries/:dictCode/items')
  @RequirePermissions(PermissionCodes.systemConfigUpdate)
  upsertDictionaryItem(@Param('dictCode') dictCode: string, @Body() payload: UpsertDictionaryItemDto) {
    return this.systemService.upsertDictionaryItem(dictCode, payload);
  }

  @Post('system/configuration/config-items')
  @RequirePermissions(PermissionCodes.systemConfigUpdate)
  upsertConfigItem(@Body() payload: UpsertConfigItemDto) {
    return this.systemService.upsertConfigItem(payload);
  }

  @Post('system/configuration/approval-templates/:businessType')
  @RequirePermissions(PermissionCodes.systemConfigUpdate)
  upsertApprovalTemplate(
    @Param('businessType') businessType: string,
    @Body() payload: UpsertApprovalTemplateDto,
  ) {
    return this.systemService.upsertApprovalTemplate(businessType, payload);
  }
}
