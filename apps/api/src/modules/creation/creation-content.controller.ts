import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { type CurrentUserProfile, PermissionCodes } from '@smw/shared';

import { CurrentUser, RequirePermissions } from '../auth/auth.decorators';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { CreationService } from './creation.service';
import { CreateCreationContentDto, MyCreationContentListQueryDto, UpdateCreationContentDto } from './dto/creation-content.dto';

@Controller('creation/contents')
@UseGuards(AuthGuard, PermissionGuard)
export class CreationContentController {
  constructor(private readonly creationService: CreationService) {}

  @Post()
  @RequirePermissions(PermissionCodes.creationCreate)
  createDraft(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: CreateCreationContentDto) {
    return this.creationService.createDraft(currentUser, payload);
  }

  @Get('my')
  @RequirePermissions(PermissionCodes.creationView)
  listMy(@CurrentUser() currentUser: CurrentUserProfile, @Query() query: MyCreationContentListQueryDto) {
    return this.creationService.listMy(currentUser, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
      keyword: query.keyword,
      statusCode: query.statusCode,
    });
  }

  @Get(':id')
  @RequirePermissions(PermissionCodes.creationView)
  detail(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string) {
    return this.creationService.detail(currentUser, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCodes.creationUpdate)
  update(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string, @Body() payload: UpdateCreationContentDto) {
    return this.creationService.updateDraftLike(currentUser, id, payload);
  }

  @Post(':id/submit')
  @RequirePermissions(PermissionCodes.creationCreate)
  submit(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string) {
    return this.creationService.submit(currentUser, id);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCodes.creationUpdate)
  deleteDraft(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string) {
    return this.creationService.deleteDraft(currentUser, id);
  }
}

