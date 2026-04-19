import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, rename, stat, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CurrentUserProfile } from '@smw/shared';
import { RoleCode } from '@smw/shared';

import { PrismaService } from '../prisma/prisma.service';
import { AttachmentAuthService } from './attachment-auth.service';
import {
  ATTACHMENT_BUCKET,
  DEFAULT_TEMP_TTL_DAYS,
} from './attachments.constants';
import { assertSizeLimit, normalizeExt, resolveFileCategory, safeOriginalName } from './attachments.util';

type UploadedDiskFile = {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

@Injectable()
export class AttachmentsService {
  private readonly rootDir = resolve(process.cwd(), 'storage', 'uploads');
  private readonly tmpDir = resolve(process.cwd(), 'storage', 'tmp');

  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AttachmentAuthService,
  ) {}

  private toBigInt(value: string) {
    return BigInt(value);
  }

  private buildDownloadUrl(fileId: string, fileName?: string | null) {
    const apiPrefix = process.env.API_PREFIX ?? 'api';
    const query = new URLSearchParams();
    if (fileName) query.set('name', fileName);
    const qs = query.toString();
    return `/${apiPrefix}/attachments/${encodeURIComponent(fileId)}/download${qs ? `?${qs}` : ''}`;
  }

  private buildPreviewUrl(fileId: string) {
    const apiPrefix = process.env.API_PREFIX ?? 'api';
    return `/${apiPrefix}/attachments/${encodeURIComponent(fileId)}/preview`;
  }

  private resolvePreviewContentType(file: { mimeType: string | null; fileExt: string }) {
    const mime = file.mimeType?.trim();
    if (mime) return mime;

    const ext = (file.fileExt || '').toLowerCase().replace(/^\./, '');
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'svg':
        return 'image/svg+xml';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  async ensureTmpDir() {
    // tmp dir is owned by multer storage config; keep the method for compatibility
    await mkdir(this.tmpDir, { recursive: true });
  }

  async createTempFile(currentUser: CurrentUserProfile, file: UploadedDiskFile) {
    if (!file?.originalname) {
      throw new BadRequestException('未接收到上传文件');
    }

    try {
      const originalName = safeOriginalName(file.originalname);
      const ext = normalizeExt(originalName);
      const category = resolveFileCategory(ext, file.mimetype);

      assertSizeLimit(file.size, category);

      const dateDir = new Date().toISOString().slice(0, 10).replaceAll('-', '/');
      const storageKey = `${ATTACHMENT_BUCKET}/${dateDir}/${randomUUID()}${ext ? `.${ext}` : ''}`;
      const targetPath = resolve(this.rootDir, storageKey);

      if (!targetPath.startsWith(this.rootDir)) {
        throw new BadRequestException('非法文件路径');
      }

      await mkdir(dirname(targetPath), { recursive: true });
      await this.safeRename(file.path, targetPath);

      const expiresAt = new Date(Date.now() + DEFAULT_TEMP_TTL_DAYS * 24 * 60 * 60 * 1000);

      const created = await this.prisma.sysFile.create({
        data: {
          originalName,
          storageKey,
          fileExt: ext || '',
          mimeType: file.mimetype || null,
          fileSize: BigInt(file.size),
          fileCategory: category,
          uploadedBy: this.toBigInt(currentUser.id),
          isTemporary: true,
          expiresAt,
          boundAt: null,
        },
      });

      return {
        fileId: String(created.id),
        storageKey: created.storageKey,
        originalName: created.originalName,
        fileSize: Number(created.fileSize.toString()),
        fileCategory: created.fileCategory,
        downloadUrl: this.buildDownloadUrl(String(created.id), created.originalName),
        previewUrl: category === 'IMAGE' ? this.buildPreviewUrl(String(created.id)) : null,
        mimeType: created.mimeType,
        fileExt: created.fileExt,
        createdAt: created.createdAt.toISOString(),
      };
    } catch (error: unknown) {
      await this.cleanupTmpFile(file.path);
      throw error;
    }
  }

  async listBusinessAttachments(
    currentUser: CurrentUserProfile,
    params: { businessType: string; businessId: string; usageType: string },
  ) {
    await this.authz.assertCanViewBusiness(currentUser, { businessType: params.businessType, businessId: params.businessId });

    const links = await this.prisma.sysFileLink.findMany({
      where: { businessType: params.businessType, businessId: params.businessId, usageType: params.usageType },
      include: {
        file: {
          include: {
            uploader: { select: { id: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return links.map((link) => ({
      fileId: String(link.fileId),
      storageKey: link.file.storageKey,
      originalName: link.file.originalName,
      fileExt: link.file.fileExt,
      mimeType: link.file.mimeType,
      fileSize: Number(link.file.fileSize.toString()),
      fileCategory: link.file.fileCategory,
      uploadedBy: String(link.file.uploadedBy),
      uploadedByName: link.file.uploader.displayName,
      createdAt: link.file.createdAt.toISOString(),
      downloadUrl: this.buildDownloadUrl(String(link.fileId), link.file.originalName),
      previewUrl: link.file.fileCategory === 'IMAGE' ? this.buildPreviewUrl(String(link.fileId)) : null,
    }));
  }

  async bindAttachments(
    currentUser: CurrentUserProfile,
    params: { businessType: string; businessId: string; usageType: string; fileIds: string[] },
  ) {
    await this.authz.assertCanEditBusinessAttachments(currentUser, { businessType: params.businessType, businessId: params.businessId });

    const normalizedFileIds = [...new Set(params.fileIds.map((id) => id.trim()).filter(Boolean))];
    if (!normalizedFileIds.length) {
      return [];
    }

    const files = await this.prisma.sysFile.findMany({
      where: { id: { in: normalizedFileIds.map((id) => this.toBigInt(id)) } },
      select: { id: true, uploadedBy: true, isTemporary: true },
    });

    const fileMap = new Map(files.map((item) => [String(item.id), item]));
    for (const fileId of normalizedFileIds) {
      const file = fileMap.get(fileId);
      if (!file) throw new NotFoundException('附件不存在');
      if (String(file.uploadedBy) !== currentUser.id) throw new BadRequestException('只能绑定本人上传的文件');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sysFileLink.createMany({
        data: normalizedFileIds.map((fileId) => ({
          businessType: params.businessType,
          businessId: params.businessId,
          usageType: params.usageType,
          fileId: this.toBigInt(fileId),
        })),
        skipDuplicates: true,
      });

      await tx.sysFile.updateMany({
        where: {
          id: { in: normalizedFileIds.map((id) => this.toBigInt(id)) },
          isTemporary: true,
        },
        data: {
          isTemporary: false,
          expiresAt: null,
          boundAt: new Date(),
        },
      });
    });

    return this.listBusinessAttachments(currentUser, params);
  }

  async unbindAttachment(
    currentUser: CurrentUserProfile,
    params: { businessType: string; businessId: string; usageType: string; fileId: string },
  ) {
    await this.authz.assertCanEditBusinessAttachments(currentUser, { businessType: params.businessType, businessId: params.businessId });

    await this.prisma.sysFileLink.deleteMany({
      where: {
        businessType: params.businessType,
        businessId: params.businessId,
        usageType: params.usageType,
        fileId: this.toBigInt(params.fileId),
      },
    });

    return null;
  }

  async listMyTempFiles(currentUser: CurrentUserProfile) {
    const files = await this.prisma.sysFile.findMany({
      where: {
        uploadedBy: this.toBigInt(currentUser.id),
        isTemporary: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return files.map((file) => ({
      fileId: String(file.id),
      storageKey: file.storageKey,
      originalName: file.originalName,
      fileExt: file.fileExt,
      mimeType: file.mimeType,
      fileSize: Number(file.fileSize.toString()),
      fileCategory: file.fileCategory,
      expiresAt: file.expiresAt?.toISOString() ?? null,
      createdAt: file.createdAt.toISOString(),
      downloadUrl: this.buildDownloadUrl(String(file.id), file.originalName),
      previewUrl: file.fileCategory === 'IMAGE' ? this.buildPreviewUrl(String(file.id)) : null,
    }));
  }

  async deleteMyTempFile(currentUser: CurrentUserProfile, fileId: string) {
    const file = await this.prisma.sysFile.findUnique({
      where: { id: this.toBigInt(fileId) },
      select: { id: true, storageKey: true, uploadedBy: true, isTemporary: true },
    });
    if (!file) throw new NotFoundException('临时文件不存在');
    this.authz.assertCanViewTempFile(currentUser, file);

    const link = await this.prisma.sysFileLink.findFirst({
      where: { fileId: file.id },
      select: { id: true },
    });
    if (link) {
      throw new BadRequestException('文件已绑定业务，不能删除');
    }

    await this.prisma.sysFile.delete({ where: { id: file.id } });
    await this.removePhysicalFile(file.storageKey);
    return null;
  }

  async cleanupExpiredTempFiles(currentUser: CurrentUserProfile) {
    if (![RoleCode.TEACHER, RoleCode.MINISTER].includes(currentUser.activeRole.roleCode)) {
      throw new ForbiddenException('无权限执行清理');
    }

    const now = new Date();
    const files = await this.prisma.sysFile.findMany({
      where: { isTemporary: true, expiresAt: { lt: now } },
      select: { id: true, storageKey: true },
      take: 200,
    });

    let deletedCount = 0;
    for (const file of files) {
      const link = await this.prisma.sysFileLink.findFirst({ where: { fileId: file.id }, select: { id: true } });
      if (link) continue;

      await this.prisma.sysFile.delete({ where: { id: file.id } });
      await this.removePhysicalFile(file.storageKey);
      deletedCount += 1;
    }

    return { deletedCount };
  }

  async getDownloadStream(
    currentUser: CurrentUserProfile,
    fileId: string,
  ) {
    const file = await this.prisma.sysFile.findUnique({
      where: { id: this.toBigInt(fileId) },
      select: { id: true, storageKey: true, originalName: true, uploadedBy: true, isTemporary: true, fileExt: true, mimeType: true },
    });
    if (!file) throw new NotFoundException('附件不存在');

    const links = await this.prisma.sysFileLink.findMany({
      where: { fileId: file.id },
      select: { businessType: true, businessId: true },
      take: 10,
    });

    if (!links.length) {
      this.authz.assertCanViewTempFile(currentUser, file);
    } else {
      // Allow if any linked business is visible (or approval fallback).
      let allowed = false;
      for (const link of links) {
        try {
          await this.authz.assertCanViewBusiness(currentUser, { businessType: link.businessType, businessId: link.businessId });
          allowed = true;
          break;
        } catch {
          // keep trying other links
        }
      }
      if (!allowed) {
        throw new ForbiddenException('无权下载该附件');
      }
    }

    const filePath = resolve(this.rootDir, file.storageKey);
    if (!filePath.startsWith(this.rootDir)) {
      throw new BadRequestException('非法文件路径');
    }
    try {
      await stat(filePath);
    } catch {
      throw new NotFoundException('文件不存在');
    }
    return {
      fileName: file.originalName,
      stream: createReadStream(filePath),
    };
  }

  async getPreviewFile(currentUser: CurrentUserProfile, fileId: string) {
    const file = await this.prisma.sysFile.findUnique({
      where: { id: this.toBigInt(fileId) },
      select: { id: true, storageKey: true, originalName: true, uploadedBy: true, isTemporary: true, fileExt: true, mimeType: true },
    });
    if (!file) throw new NotFoundException('Attachment not found.');

    const links = await this.prisma.sysFileLink.findMany({
      where: { fileId: file.id },
      select: { businessType: true, businessId: true },
      take: 10,
    });

    if (!links.length) {
      this.authz.assertCanViewTempFile(currentUser, file);
    } else {
      let allowed = false;
      for (const link of links) {
        try {
          await this.authz.assertCanViewBusiness(currentUser, { businessType: link.businessType, businessId: link.businessId });
          allowed = true;
          break;
        } catch {
          // keep trying other links
        }
      }
      if (!allowed) {
        throw new ForbiddenException('Not allowed to preview this attachment.');
      }
    }

    const filePath = resolve(this.rootDir, file.storageKey);
    if (!filePath.startsWith(this.rootDir)) {
      throw new BadRequestException('闈炴硶鏂囦欢璺緞');
    }
    try {
      await stat(filePath);
    } catch {
      throw new NotFoundException('File not found.');
    }

    const buffer = await readFile(filePath);
    return {
      contentType: this.resolvePreviewContentType(file),
      buffer,
    };
  }

  private async cleanupTmpFile(filePath: string) {
    if (!filePath?.trim()) return;
    if (!filePath.startsWith(this.tmpDir)) return;
    try {
      await unlink(filePath);
    } catch {
      // ignore
    }
  }

  async bindAttachmentsAsSystem(
    tx: Prisma.TransactionClient,
    currentUser: CurrentUserProfile,
    params: { businessType: string; businessId: string; usageType: string; fileIds: string[] },
  ) {
    const normalizedFileIds = [...new Set(params.fileIds.map((id) => id.trim()).filter(Boolean))];
    if (!normalizedFileIds.length) return;

    const files = await tx.sysFile.findMany({
      where: { id: { in: normalizedFileIds.map((id) => this.toBigInt(id)) } },
      select: { id: true, uploadedBy: true, isTemporary: true },
    });
    const fileMap = new Map(files.map((item) => [String(item.id), item]));
    for (const fileId of normalizedFileIds) {
      const file = fileMap.get(fileId);
      if (!file) throw new NotFoundException('附件不存在');
      if (String(file.uploadedBy) !== currentUser.id) throw new BadRequestException('只能绑定本人上传的文件');
    }

    await tx.sysFileLink.createMany({
      data: normalizedFileIds.map((fileId) => ({
        businessType: params.businessType,
        businessId: params.businessId,
        usageType: params.usageType,
        fileId: this.toBigInt(fileId),
      })),
      skipDuplicates: true,
    });

    await tx.sysFile.updateMany({
      where: { id: { in: normalizedFileIds.map((id) => this.toBigInt(id)) }, isTemporary: true },
      data: { isTemporary: false, expiresAt: null, boundAt: new Date() },
    });
  }

  private async safeRename(from: string, to: string) {
    await mkdir(dirname(to), { recursive: true });
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

  private async removePhysicalFile(storageKey: string) {
    const filePath = resolve(this.rootDir, storageKey);
    if (!filePath.startsWith(this.rootDir)) return;
    try {
      await unlink(filePath);
    } catch {
      // ignore
    }
  }
}
