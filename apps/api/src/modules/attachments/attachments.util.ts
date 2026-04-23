import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, stat, unlink } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';

import { BadRequestException } from '@nestjs/common';

import {
  ARCHIVE_EXTS,
  ARCHIVE_MAX_BYTES,
  DOCUMENT_EXTS,
  DOCUMENT_MAX_BYTES,
  IMAGE_MAX_BYTES,
} from './attachments.constants';
import type { FileCategory } from './attachments.types';

export function safeOriginalName(originalName: string) {
  return basename(originalName).replace(/[^\w.\-\u4e00-\u9fa5]/g, '_').slice(0, 255);
}

export function normalizeExt(originalName: string) {
  return extname(originalName).replace('.', '').toLowerCase().slice(0, 32);
}

export function resolveFileCategory(ext: string, mimeType?: string | null): FileCategory {
  if (DOCUMENT_EXTS.has(ext)) return 'DOCUMENT';
  if (ARCHIVE_EXTS.has(ext)) return 'ARCHIVE';
  if (mimeType?.startsWith('image/')) return 'IMAGE';
  return 'OTHER';
}

export function assertSizeLimit(fileSize: number, category: FileCategory) {
  if (category === 'IMAGE' && fileSize > IMAGE_MAX_BYTES) {
    throw new BadRequestException(`图片文件大小不能超过 ${IMAGE_MAX_BYTES} bytes`);
  }
  if (category === 'DOCUMENT' && fileSize > DOCUMENT_MAX_BYTES) {
    throw new BadRequestException(`文档类文件大小不能超过 ${DOCUMENT_MAX_BYTES} bytes`);
  }
  if (category === 'ARCHIVE' && fileSize > ARCHIVE_MAX_BYTES) {
    throw new BadRequestException(`压缩包文件大小不能超过 ${ARCHIVE_MAX_BYTES} bytes`);
  }

  // For other categories, apply document limit as a conservative default
  if (category === 'OTHER' && fileSize > DOCUMENT_MAX_BYTES) {
    throw new BadRequestException(`文件大小不能超过 ${DOCUMENT_MAX_BYTES} bytes`);
  }
}

export async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

export async function moveFile(from: string, to: string) {
  await ensureDir(dirname(to));
  try {
    await rename(from, to);
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: unknown }).code : undefined;
    if (code !== 'EXDEV') {
      throw error;
    }
    // Cross-device fallback: stream copy then unlink
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const read = createReadStream(from);
      const write = createWriteStream(to);
      read.on('error', rejectPromise);
      write.on('error', rejectPromise);
      write.on('finish', () => resolvePromise());
      read.pipe(write);
    });
    await unlink(from);
  }
}

export async function getFileSize(path: string) {
  const info = await stat(path);
  return info.size;
}

export function resolveWithinRoot(rootDir: string, storageKey: string) {
  const filePath = resolve(rootDir, storageKey);
  if (!filePath.startsWith(rootDir)) {
    throw new BadRequestException('非法文件路径');
  }
  return filePath;
}
