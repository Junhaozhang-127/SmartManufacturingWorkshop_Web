import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { CurrentUserProfile } from '@smw/shared';
import { memoryStorage } from 'multer';

import { CurrentUser } from '../auth/auth.decorators';
import { AuthGuard } from '../auth/auth.guard';
import { PortalAdminCarouselListQueryDto, UpsertPortalCarouselItemDto } from './dto/portal-admin-carousel.dto';
import { PortalAdminContentListQueryDto, UpsertPortalContentDto } from './dto/portal-admin-content.dto';
import { UpsertPortalContactConfigDto } from './dto/portal-contact-config.dto';
import { PortalService } from './portal.service';

@Controller('portal/admin')
@UseGuards(AuthGuard)
export class PortalAdminController {
  constructor(private readonly portalService: PortalService) {}

  @Get('contact-config')
  getContactConfig(@CurrentUser() currentUser: CurrentUserProfile) {
    return this.portalService.getAdminContactConfig(currentUser);
  }

  @Post('contact-config')
  upsertContactConfig(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: UpsertPortalContactConfigDto) {
    return this.portalService.upsertContactConfig(currentUser, payload);
  }

  @Get('carousel')
  listCarousel(@CurrentUser() currentUser: CurrentUserProfile, @Query() query: PortalAdminCarouselListQueryDto) {
    this.portalService.assertManager(currentUser);
    return this.portalService.listAdminCarousel({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
      keyword: query.keyword,
      statusCode: query.statusCode,
    });
  }

  @Post('carousel')
  createCarousel(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: UpsertPortalCarouselItemDto) {
    return this.portalService.createCarousel(currentUser, payload);
  }

  @Patch('carousel/:id')
  updateCarousel(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: UpsertPortalCarouselItemDto,
  ) {
    return this.portalService.updateCarousel(currentUser, id, payload);
  }

  @Delete('carousel/:id')
  deleteCarousel(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string) {
    return this.portalService.deleteCarousel(currentUser, id);
  }

  @Get('contents')
  listContents(@CurrentUser() currentUser: CurrentUserProfile, @Query() query: PortalAdminContentListQueryDto) {
    this.portalService.assertManager(currentUser);
    return this.portalService.listAdminContents({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
      keyword: query.keyword,
      contentType: query.contentType,
      statusCode: query.statusCode,
    });
  }

  @Post('contents')
  createContent(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: UpsertPortalContentDto) {
    return this.portalService.createContent(currentUser, payload);
  }

  @Patch('contents/:id')
  updateContent(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string, @Body() payload: UpsertPortalContentDto) {
    return this.portalService.updateContent(currentUser, id, payload);
  }

  @Delete('contents/:id')
  deleteContent(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string) {
    return this.portalService.deleteContent(currentUser, id);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() currentUser: CurrentUserProfile,
    @UploadedFile()
    file?: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    if (!file) {
      return { storageKey: null, fileName: null, previewUrl: null };
    }
    return this.portalService.uploadPortalAsset(currentUser, file);
  }
}

