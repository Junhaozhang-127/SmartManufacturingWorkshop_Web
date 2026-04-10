import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { CurrentUserProfile } from '@smw/shared';
import type { Response } from 'express';
import { diskStorage } from 'multer';

import { CurrentUser } from '../auth/auth.decorators';
import { AuthGuard } from '../auth/auth.guard';
import { ARCHIVE_MAX_BYTES } from './attachments.constants';
import { AttachmentsService } from './attachments.service';
import { AttachmentListQueryDto, BindAttachmentsDto, UnbindAttachmentDto } from './dto/attachments.dto';

function buildTmpStorage() {
  return diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        const tmpDir = resolve(process.cwd(), 'storage', 'tmp');
        await mkdir(tmpDir, { recursive: true });
        cb(null, tmpDir);
      } catch (error: unknown) {
        cb(error instanceof Error ? error : new Error('Failed to create tmp dir'), process.cwd());
      }
    },
    filename: (_req, file, cb) => {
      const ext = (file.originalname || '').split('.').pop() || '';
      cb(null, `${randomUUID()}${ext ? `.${ext}` : ''}`);
    },
  });
}

@Controller('attachments')
@UseGuards(AuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildTmpStorage(),
      limits: { fileSize: ARCHIVE_MAX_BYTES },
    }),
  )
  async upload(
    @CurrentUser() currentUser: CurrentUserProfile,
    @UploadedFile()
    file?: {
      originalname: string;
      mimetype: string;
      size: number;
      path: string;
    },
  ) {
    if (!file) throw new BadRequestException('未接收到上传文件');
    return this.attachmentsService.createTempFile(currentUser, file);
  }

  @Get()
  list(@CurrentUser() currentUser: CurrentUserProfile, @Query() query: AttachmentListQueryDto) {
    return this.attachmentsService.listBusinessAttachments(currentUser, {
      businessType: query.businessType,
      businessId: query.businessId,
      usageType: query.usageType,
    });
  }

  @Post('bind')
  bind(@CurrentUser() currentUser: CurrentUserProfile, @Body() payload: BindAttachmentsDto) {
    return this.attachmentsService.bindAttachments(currentUser, {
      businessType: payload.businessType,
      businessId: payload.businessId,
      usageType: payload.usageType,
      fileIds: payload.fileIds,
    });
  }

  @Delete('unbind')
  unbind(@CurrentUser() currentUser: CurrentUserProfile, @Query() query: UnbindAttachmentDto) {
    return this.attachmentsService.unbindAttachment(currentUser, {
      businessType: query.businessType,
      businessId: query.businessId,
      usageType: query.usageType,
      fileId: query.fileId,
    });
  }

  @Get('temp')
  listTemp(@CurrentUser() currentUser: CurrentUserProfile) {
    return this.attachmentsService.listMyTempFiles(currentUser);
  }

  @Delete('temp/:fileId')
  deleteTemp(@CurrentUser() currentUser: CurrentUserProfile, @Param('fileId') fileId: string) {
    return this.attachmentsService.deleteMyTempFile(currentUser, fileId);
  }

  @Post('admin/cleanup-temp')
  cleanup(@CurrentUser() currentUser: CurrentUserProfile) {
    return this.attachmentsService.cleanupExpiredTempFiles(currentUser);
  }

  @Get(':fileId/download')
  async download(
    @CurrentUser() currentUser: CurrentUserProfile,
    @Param('fileId') fileId: string,
    @Query('name') name: string | undefined,
    @Res() response: Response,
  ) {
    const file = await this.attachmentsService.getDownloadStream(currentUser, fileId);
    const fileName = name?.trim() || file.fileName || 'attachment';
    response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    file.stream.pipe(response);
  }
}

