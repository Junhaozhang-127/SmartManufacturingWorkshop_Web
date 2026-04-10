import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import { PortalFilePreviewQueryDto, PortalPublicContentListQueryDto } from './dto/portal-public.dto';
import { PortalService } from './portal.service';
import { PortalFileService } from './portal-file.service';

@Controller('portal')
export class PortalPublicController {
  constructor(
    private readonly portalService: PortalService,
    private readonly portalFileService: PortalFileService,
  ) {}

  @Get('home')
  getHome() {
    return this.portalService.getHomeData();
  }

  @Get('contents')
  listContents(@Query() query: PortalPublicContentListQueryDto) {
    return this.portalService.listPublicContents({
      contentType: query.contentType,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 12,
    });
  }

  @Get('contents/:id')
  detail(@Param('id') id: string) {
    return this.portalService.getPublicContentDetail(id);
  }

  @Get('files/preview')
  async preview(@Query() query: PortalFilePreviewQueryDto, @Res() response: Response) {
    const file = await this.portalFileService.previewFile(query.key);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Cache-Control', 'public, max-age=86400');
    response.send(file.buffer);
  }
}
