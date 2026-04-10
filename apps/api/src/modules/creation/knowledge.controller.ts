import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { CreationService } from './creation.service';
import { KnowledgeListQueryDto } from './dto/knowledge.dto';

@Controller('knowledge')
@UseGuards(AuthGuard)
export class KnowledgeController {
  constructor(private readonly creationService: CreationService) {}

  @Get('contents')
  list(@Query() query: KnowledgeListQueryDto) {
    return this.creationService.listKnowledge({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 12,
      keyword: query.keyword,
    });
  }

  @Get('contents/:id')
  detail(@Param('id') id: string) {
    return this.creationService.knowledgeDetail(id);
  }
}

