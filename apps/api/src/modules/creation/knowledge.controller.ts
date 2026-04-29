import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PermissionCodes } from '@smw/shared';

import { RequirePermissions } from '../auth/auth.decorators';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { CreationService } from './creation.service';
import { KnowledgeListQueryDto } from './dto/knowledge.dto';

@Controller('knowledge')
@UseGuards(AuthGuard, PermissionGuard)
export class KnowledgeController {
  constructor(private readonly creationService: CreationService) {}

  @Get('contents')
  @RequirePermissions(PermissionCodes.knowledgeView)
  list(@Query() query: KnowledgeListQueryDto) {
    return this.creationService.listKnowledge({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 12,
      keyword: query.keyword,
    });
  }

  @Get('contents/:id')
  @RequirePermissions(PermissionCodes.knowledgeView)
  detail(@Param('id') id: string) {
    return this.creationService.knowledgeDetail(id);
  }
}

