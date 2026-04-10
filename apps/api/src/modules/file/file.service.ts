import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class FileService {
  private readonly rootDir = resolve(process.cwd(), 'storage', 'uploads');

  async saveUploadedDiskFile(
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      path: string;
    },
    bucket = 'funds',
  ) {
    if (!file.originalname) {
      throw new BadRequestException('文件名不能为空');
    }

    const dateDir = new Date().toISOString().slice(0, 10).replaceAll('-', '/');
    const safeExt = extname(file.originalname).slice(0, 20);
    const safeName = basename(file.originalname).replace(/[^\w.\-\u4e00-\u9fa5]/g, '_');
    const storageKey = `${bucket}/${dateDir}/${randomUUID()}${safeExt || ''}`;
    const filePath = resolve(this.rootDir, storageKey);

    if (!filePath.startsWith(this.rootDir)) {
      throw new BadRequestException('闈炴硶鏂囦欢璺緞');
    }

    await mkdir(dirname(filePath), { recursive: true });
    await this.safeRename(file.path, filePath);

    return {
      storageKey,
      fileName: safeName,
      mimeType: file.mimetype || null,
      size: file.size || null,
      downloadUrl: this.buildDownloadUrl(storageKey, safeName),
    };
  }

  async saveFile(
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    bucket = 'funds',
  ) {
    if (!file.originalname) {
      throw new BadRequestException('文件名不能为空');
    }

    const dateDir = new Date().toISOString().slice(0, 10).replaceAll('-', '/');
    const safeExt = extname(file.originalname).slice(0, 20);
    const safeName = basename(file.originalname).replace(/[^\w.\-\u4e00-\u9fa5]/g, '_');
    const storageKey = `${bucket}/${dateDir}/${randomUUID()}${safeExt || ''}`;
    const filePath = resolve(this.rootDir, storageKey);

    if (!filePath.startsWith(this.rootDir)) {
      throw new BadRequestException('闈炴硶鏂囦欢璺緞');
    }

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, file.buffer);

    return {
      storageKey,
      fileName: safeName,
      mimeType: file.mimetype || null,
      size: file.size || null,
      downloadUrl: this.buildDownloadUrl(storageKey, safeName),
    };
  }

  async loadFile(storageKey: string) {
    const filePath = resolve(this.rootDir, storageKey);
    if (!filePath.startsWith(this.rootDir)) {
      throw new BadRequestException('闈炴硶鏂囦欢璺緞');
    }

    try {
      const buffer = await readFile(filePath);
      return {
        buffer,
        filePath,
      };
    } catch {
      throw new NotFoundException('文件不存在');
    }
  }

  createDownloadStream(storageKey: string) {
    const filePath = resolve(this.rootDir, storageKey);
    if (!filePath.startsWith(this.rootDir)) {
      throw new BadRequestException('闈炴硶鏂囦欢璺緞');
    }

    return {
      filePath,
      stream: createReadStream(filePath),
      ensureExists: async () => {
        try {
          await stat(filePath);
        } catch {
          throw new NotFoundException('文件不存在');
        }
      },
    };
  }

  buildDownloadUrl(storageKey: string, fileName?: string | null) {
    const baseUrl = process.env.APP_BASE_URL ?? `http://localhost:${process.env.APP_PORT ?? '3000'}`;
    const apiPrefix = process.env.API_PREFIX ?? 'api';
    const query = new URLSearchParams({ key: storageKey });

    if (fileName) {
      query.set('name', fileName);
    }

    return `${baseUrl.replace(/\/$/, '')}/${apiPrefix}/files/download?${query.toString()}`;
  }

  private async safeRename(from: string, to: string) {
    try {
      await rename(from, to);
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: unknown }).code : undefined;
      if (code !== 'EXDEV') throw error;
      await copyFile(from, to);
      await unlink(from);
    }
  }
}
