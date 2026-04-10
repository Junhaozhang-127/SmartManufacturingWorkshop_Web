import { extname } from 'node:path';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { FileService } from '../file/file.service';

@Injectable()
export class PortalFileService {
  constructor(private readonly fileService: FileService) {}

  private ensurePortalKey(storageKey: string) {
    if (!storageKey?.startsWith('portal/')) {
      throw new BadRequestException('仅支持访问 portal 资源');
    }
  }

  private resolveContentType(storageKey: string) {
    const ext = extname(storageKey).toLowerCase();
    switch (ext) {
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.gif':
        return 'image/gif';
      case '.webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }

  async previewFile(storageKey: string) {
    this.ensurePortalKey(storageKey);
    try {
      const { buffer } = await this.fileService.loadFile(storageKey);
      return {
        contentType: this.resolveContentType(storageKey),
        buffer,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }
}
