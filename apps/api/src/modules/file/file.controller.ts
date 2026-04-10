import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { AuthGuard } from '@api/modules/auth/auth.guard';
import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';

import { ARCHIVE_MAX_BYTES } from '../attachments/attachments.constants';
import { FileService } from './file.service';

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

@Controller('files')
@UseGuards(AuthGuard)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildTmpStorage(),
      limits: { fileSize: ARCHIVE_MAX_BYTES },
    }),
  )
  async upload(
    @Query('bucket') bucket: string | undefined,
    @UploadedFile()
    file?: {
      originalname: string;
      mimetype: string;
      size: number;
      path: string;
    },
  ) {
    if (!file) {
      throw new BadRequestException('未接收到上传文件');
    }

    const targetBucket = bucket?.trim();
    if (!targetBucket) {
      return this.fileService.saveUploadedDiskFile(file);
    }

    if (targetBucket !== 'funds' && targetBucket !== 'portal') {
      throw new BadRequestException('bucket 仅支持 funds / portal');
    }

    return this.fileService.saveUploadedDiskFile(file, targetBucket);
  }

  @Get('download')
  async download(@Query('key') key: string, @Query('name') name: string | undefined, @Res() response: Response) {
    const { stream, ensureExists } = this.fileService.createDownloadStream(key);
    await ensureExists();
    response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name || 'attachment')}`);
    stream.pipe(response);
  }
}
