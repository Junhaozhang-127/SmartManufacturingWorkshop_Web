import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { CurrentUserProfile } from '@smw/shared';

import { CurrentUser } from '../auth/auth.decorators';
import { AuthGuard } from '../auth/auth.guard';
import { CreationService } from './creation.service';
import { CreateCreationContentDto, MyCreationContentListQueryDto, UpdateCreationContentDto } from './dto/creation-content.dto';

@Controller('creation/contents')
@UseGuards(AuthGuard)
export class CreationContentController {
  constructor(private readonly creationService: CreationService) {}

  @Post()
  createDraft(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: CreateCreationContentDto) {
    return this.creationService.createDraft(currentUser, payload);
  }

  @Get('my')
  listMy(@CurrentUser() currentUser: CurrentUserProfile, @Query() query: MyCreationContentListQueryDto) {
    return this.creationService.listMy(currentUser, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
      keyword: query.keyword,
      statusCode: query.statusCode,
    });
  }

  @Get(':id')
  detail(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string) {
    return this.creationService.detail(currentUser, id);
  }

  @Patch(':id')
  update(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string, @Body() payload: UpdateCreationContentDto) {
    return this.creationService.updateDraftLike(currentUser, id, payload);
  }

  @Post(':id/submit')
  submit(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string) {
    return this.creationService.submit(currentUser, id);
  }
}

