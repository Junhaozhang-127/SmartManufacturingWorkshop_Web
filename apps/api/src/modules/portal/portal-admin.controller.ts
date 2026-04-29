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
import { type CurrentUserProfile, PermissionCodes } from '@smw/shared';
import { memoryStorage } from 'multer';

import { CurrentUser, RequirePermissions } from '../auth/auth.decorators';
import { AuthGuard } from '../auth/auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { PortalAdminCarouselListQueryDto, UpsertPortalCarouselItemDto } from './dto/portal-admin-carousel.dto';
import { PortalAdminContentListQueryDto, UpsertPortalContentDto } from './dto/portal-admin-content.dto';
import { UpsertPortalContactConfigDto } from './dto/portal-contact-config.dto';
import { PortalService } from './portal.service';

@Controller('portal/admin')
@UseGuards(AuthGuard, PermissionGuard)
export class PortalAdminController {
  constructor(private readonly portalService: PortalService) {}

  @Get('contact-config')
  @RequirePermissions(PermissionCodes.portalContentView)
  getContactConfig(@CurrentUser() currentUser: CurrentUserProfile) {
    return this.portalService.getAdminContactConfig(currentUser);
  }

  @Post('contact-config')
  @RequirePermissions(PermissionCodes.portalContentUpdate)
  upsertContactConfig(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: UpsertPortalContactConfigDto) {
    return this.portalService.upsertContactConfig(currentUser, payload);
  }

  @Get('carousel')
  @RequirePermissions(PermissionCodes.portalContentView)
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
  @RequirePermissions(PermissionCodes.portalContentUpdate)
  createCarousel(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: UpsertPortalCarouselItemDto) {
    return this.portalService.createCarousel(currentUser, payload);
  }

  @Patch('carousel/:id')
  @RequirePermissions(PermissionCodes.portalContentUpdate)
  updateCarousel(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('id') id: string,
    @Body() payload: UpsertPortalCarouselItemDto,
  ) {
    return this.portalService.updateCarousel(currentUser, id, payload);
  }

  @Delete('carousel/:id')
  @RequirePermissions(PermissionCodes.portalContentUpdate)
  deleteCarousel(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string) {
    return this.portalService.deleteCarousel(currentUser, id);
  }

  @Get('contents')
  @RequirePermissions(PermissionCodes.portalContentView)
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
  @RequirePermissions(PermissionCodes.portalContentUpdate)
  createContent(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: UpsertPortalContentDto) {
    return this.portalService.createContent(currentUser, payload);
  }

  @Patch('contents/:id')
  @RequirePermissions(PermissionCodes.portalContentUpdate)
  updateContent(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string, @Body() payload: UpsertPortalContentDto) {
    return this.portalService.updateContent(currentUser, id, payload);
  }

  @Delete('contents/:id')
  @RequirePermissions(PermissionCodes.portalContentUpdate)
  deleteContent(@CurrentUser() currentUser: CurrentUserProfile, @Param('id') id: string) {
    return this.portalService.deleteContent(currentUser, id);
  }

  @Post('upload')
  @RequirePermissions(PermissionCodes.portalContentUpdate)
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
