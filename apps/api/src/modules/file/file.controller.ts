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
import { memoryStorage } from 'multer';

import { FileService } from './file.service';

@Controller('files')
@UseGuards(AuthGuard)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async upload(
    @UploadedFile()
    file?: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    if (!file) {
      throw new BadRequestException('未接收到上传文件');
    }

    return this.fileService.saveFile(file);
  }

  @Get('download')
  async download(@Query('key') key: string, @Query('name') name: string | undefined, @Res() response: Response) {
    const { buffer } = await this.fileService.loadFile(key);
    response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name || 'attachment')}`);
    response.send(buffer);
  }
}
