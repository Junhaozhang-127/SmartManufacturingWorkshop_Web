import { BadRequestException,ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreationContent, Prisma } from '@prisma/client';
import { type CurrentUserProfile, normalizePagination, RoleCode } from '@smw/shared';

import { FileService } from '../file/file.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCreationContentDto, UpdateCreationContentDto } from './dto/creation-content.dto';
import type { ApproveCreationContentDto, HomeSection, PublishCreationContentDto } from './dto/creation-review.dto';

type CreationStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

function isReviewer(currentUser: CurrentUserProfile) {
  return [RoleCode.TEACHER, RoleCode.MINISTER].includes(currentUser.activeRole.roleCode);
}

@Injectable()
export class CreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FileService,
  ) {}

  private toId(value: unknown) {
    if (typeof value === 'bigint') return value.toString();
    return String(value);
  }

  private toIso(value: Date | null) {
    return value ? value.toISOString() : null;
  }

  private buildPrivateDownloadUrl(storageKey: string, fileName?: string | null) {
    const apiPrefix = process.env.API_PREFIX ?? 'api';
    const query = new URLSearchParams({ key: storageKey });
    if (fileName) query.set('name', fileName);
    return `/${apiPrefix}/files/download?${query.toString()}`;
  }

  private buildPortalPreviewUrl(storageKey: string) {
    const apiPrefix = process.env.API_PREFIX ?? 'api';
    return `/${apiPrefix}/portal/files/preview?key=${encodeURIComponent(storageKey)}`;
  }

  private assertReviewer(currentUser: CurrentUserProfile) {
    if (!isReviewer(currentUser)) {
      throw new ForbiddenException('仅老师、部长可审核与分发创作内容');
    }
  }

  private async loadContentForUser(currentUser: CurrentUserProfile, id: string) {
    const record = await this.prisma.creationContent.findFirst({
      where: {
        id: BigInt(id),
        isDeleted: false,
      },
      include: {
        author: true,
        reviewer: true,
      },
    });

    if (!record) throw new NotFoundException('创作内容不存在');

    const isOwner = record.authorUserId === BigInt(currentUser.id);
    if (!isOwner && !isReviewer(currentUser)) {
      throw new ForbiddenException('无权访问该创作内容');
    }

    return { record, isOwner };
  }

  private async copyFileToPortalBucket(storageKey: string | null, fileName: string | null) {
    if (!storageKey) return null;
    if (storageKey.startsWith('portal/')) {
      return {
        storageKey,
        fileName,
        previewUrl: this.buildPortalPreviewUrl(storageKey),
      };
    }

    const loaded = await this.fileService.loadFile(storageKey);
    const originalname = fileName || 'asset';
    const saved = await this.fileService.saveFile(
      {
        originalname,
        mimetype: '',
        size: loaded.buffer.length,
        buffer: loaded.buffer,
      },
      'portal',
    );

    return {
      storageKey: saved.storageKey,
      fileName: saved.fileName,
      previewUrl: this.buildPortalPreviewUrl(saved.storageKey),
    };
  }

  async createDraft(currentUser: CurrentUserProfile, payload: CreateCreationContentDto) {
    const title = payload.title?.trim() || '未命名';
    const summary = payload.summary?.trim() || null;
    const body = payload.body ?? null;
    const coverStorageKey = payload.coverStorageKey?.trim() || null;
    const coverFileName = payload.coverFileName?.trim() || null;

    const created = await this.prisma.creationContent.create({
      data: {
        title,
        summary,
        body,
        coverStorageKey,
        coverFileName,
        authorUserId: BigInt(currentUser.id),
        statusCode: 'DRAFT',
        inKnowledgeBase: false,
        recommendToHome: false,
        homeSection: null,
        createdBy: BigInt(currentUser.id),
      },
      select: { id: true },
    });

    return { id: this.toId(created.id) };
  }

  async listMy(currentUser: CurrentUserProfile, query: { page: number; pageSize: number; keyword?: string; statusCode?: CreationStatus }) {
    const pagination = normalizePagination({ page: query.page, pageSize: query.pageSize });
    const keyword = query.keyword?.trim();

    const where: Prisma.CreationContentWhereInput = {
      isDeleted: false,
      authorUserId: BigInt(currentUser.id),
      ...(query.statusCode ? { statusCode: query.statusCode } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword } },
              { summary: { contains: keyword } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.creationContent.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        select: {
          id: true,
          title: true,
          summary: true,
          statusCode: true,
          submittedAt: true,
          reviewedAt: true,
          reviewComment: true,
          inKnowledgeBase: true,
          recommendToHome: true,
          homeSection: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.creationContent.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: this.toId(item.id),
        title: item.title,
        summary: item.summary,
        statusCode: item.statusCode as CreationStatus,
        submittedAt: this.toIso(item.submittedAt),
        reviewedAt: this.toIso(item.reviewedAt),
        reviewComment: item.reviewComment,
        inKnowledgeBase: item.inKnowledgeBase,
        recommendToHome: item.recommendToHome,
        homeSection: item.homeSection,
        createdAt: this.toIso(item.createdAt),
        updatedAt: this.toIso(item.updatedAt),
      })),
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async detail(currentUser: CurrentUserProfile, id: string) {
    const { record } = await this.loadContentForUser(currentUser, id);

    return {
      id: this.toId(record.id),
      title: record.title,
      summary: record.summary,
      body: record.body,
      coverStorageKey: record.coverStorageKey,
      coverFileName: record.coverFileName,
      coverUrl:
        record.coverStorageKey ? this.buildPrivateDownloadUrl(record.coverStorageKey, record.coverFileName) : null,
      author: {
        id: this.toId(record.author.id),
        displayName: record.author.displayName,
      },
      statusCode: record.statusCode as CreationStatus,
      submittedAt: this.toIso(record.submittedAt),
      reviewer: record.reviewer
        ? { id: this.toId(record.reviewer.id), displayName: record.reviewer.displayName }
        : null,
      reviewComment: record.reviewComment,
      reviewedAt: this.toIso(record.reviewedAt),
      inKnowledgeBase: record.inKnowledgeBase,
      recommendToHome: record.recommendToHome,
      homeSection: record.homeSection,
      portalContentId: record.portalContentId ? this.toId(record.portalContentId) : null,
      portalCarouselId: record.portalCarouselId ? this.toId(record.portalCarouselId) : null,
      createdAt: this.toIso(record.createdAt),
      updatedAt: this.toIso(record.updatedAt),
    };
  }

  async updateDraftLike(currentUser: CurrentUserProfile, id: string, payload: UpdateCreationContentDto) {
    const { record, isOwner } = await this.loadContentForUser(currentUser, id);
    if (!isOwner) throw new ForbiddenException('仅作者可编辑');

    const status = record.statusCode as CreationStatus;
    if (status !== 'DRAFT' && status !== 'REJECTED') {
      throw new BadRequestException('仅草稿或已驳回内容可编辑');
    }

    await this.prisma.creationContent.update({
      where: { id: BigInt(id) },
      data: {
        ...(payload.title !== undefined ? { title: payload.title.trim() || '未命名' } : {}),
        ...(payload.summary !== undefined ? { summary: payload.summary.trim() || null } : {}),
        ...(payload.body !== undefined ? { body: payload.body } : {}),
        ...(payload.coverStorageKey !== undefined ? { coverStorageKey: payload.coverStorageKey.trim() || null } : {}),
        ...(payload.coverFileName !== undefined ? { coverFileName: payload.coverFileName.trim() || null } : {}),
      },
    });

    return null;
  }

  async submit(currentUser: CurrentUserProfile, id: string) {
    const { record, isOwner } = await this.loadContentForUser(currentUser, id);
    if (!isOwner) throw new ForbiddenException('仅作者可提交审核');

    const status = record.statusCode as CreationStatus;
    if (status !== 'DRAFT' && status !== 'REJECTED') {
      throw new BadRequestException('当前状态不可提交审核');
    }

    await this.prisma.creationContent.update({
      where: { id: BigInt(id) },
      data: {
        statusCode: 'PENDING',
        submittedAt: new Date(),
        reviewerUserId: null,
        reviewComment: null,
        reviewedAt: null,
      },
    });

    return null;
  }

  async deleteDraft(currentUser: CurrentUserProfile, id: string) {
    const { record, isOwner } = await this.loadContentForUser(currentUser, id);
    if (!isOwner) throw new ForbiddenException('仅作者可删除草稿');

    const status = record.statusCode as CreationStatus;
    if (status !== 'DRAFT') {
      throw new BadRequestException('仅草稿状态允许删除');
    }

    await this.prisma.creationContent.update({
      where: { id: BigInt(id) },
      data: { isDeleted: true },
    });

    return null;
  }

  async listPendingReviews(currentUser: CurrentUserProfile, query: { page: number; pageSize: number; keyword?: string }) {
    this.assertReviewer(currentUser);
    const pagination = normalizePagination({ page: query.page, pageSize: query.pageSize });
    const keyword = query.keyword?.trim();

    const where: Prisma.CreationContentWhereInput = {
      isDeleted: false,
      statusCode: 'PENDING',
      ...(keyword
        ? {
            OR: [{ title: { contains: keyword } }, { summary: { contains: keyword } }],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.creationContent.findMany({
        where,
        orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        include: {
          author: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.creationContent.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: this.toId(item.id),
        title: item.title,
        summary: item.summary,
        statusCode: item.statusCode as CreationStatus,
        submittedAt: this.toIso(item.submittedAt),
        author: { id: this.toId(item.author.id), displayName: item.author.displayName },
        coverUrl: item.coverStorageKey ? this.buildPrivateDownloadUrl(item.coverStorageKey, item.coverFileName) : null,
      })),
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async listApprovedReviews(currentUser: CurrentUserProfile, query: { page: number; pageSize: number; keyword?: string }) {
    this.assertReviewer(currentUser);
    const pagination = normalizePagination({ page: query.page, pageSize: query.pageSize });
    const keyword = query.keyword?.trim();

    const where: Prisma.CreationContentWhereInput = {
      isDeleted: false,
      statusCode: 'APPROVED',
      ...(keyword
        ? {
            OR: [{ title: { contains: keyword } }, { summary: { contains: keyword } }],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.creationContent.findMany({
        where,
        orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        include: {
          author: { select: { id: true, displayName: true } },
          reviewer: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.creationContent.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: this.toId(item.id),
        title: item.title,
        summary: item.summary,
        reviewedAt: this.toIso(item.reviewedAt),
        reviewComment: item.reviewComment,
        author: { id: this.toId(item.author.id), displayName: item.author.displayName },
        reviewer: item.reviewer ? { id: this.toId(item.reviewer.id), displayName: item.reviewer.displayName } : null,
        inKnowledgeBase: item.inKnowledgeBase,
        recommendToHome: item.recommendToHome,
        homeSection: item.homeSection,
        portalContentId: item.portalContentId ? this.toId(item.portalContentId) : null,
        portalCarouselId: item.portalCarouselId ? this.toId(item.portalCarouselId) : null,
      })),
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  private async importToPortal(
    currentUser: CurrentUserProfile,
    record: CreationContent,
    homeSection: HomeSection,
  ) {
    if (homeSection === 'CAROUSEL') {
      if (record.portalCarouselId) {
        return { portalContentId: record.portalContentId, portalCarouselId: record.portalCarouselId };
      }

      const image = await this.copyFileToPortalBucket(record.coverStorageKey, record.coverFileName);
      const created = await this.prisma.portalCarouselItem.create({
        data: {
          title: record.title,
          summary: record.summary,
          imageStorageKey: image?.storageKey ?? null,
          imageFileName: image?.fileName ?? null,
          targetUrl: `/knowledge/contents/${this.toId(record.id)}`,
          themeCode: 'blue',
          sortNo: null,
          statusCode: 'ACTIVE',
          createdBy: BigInt(currentUser.id),
          isDeleted: false,
        },
        select: { id: true },
      });

      return { portalContentId: record.portalContentId, portalCarouselId: created.id };
    }

    if (record.portalContentId) {
      return { portalContentId: record.portalContentId, portalCarouselId: record.portalCarouselId };
    }

    const cover = await this.copyFileToPortalBucket(record.coverStorageKey, record.coverFileName);
    const created = await this.prisma.portalContent.create({
      data: {
        contentType: homeSection,
        title: record.title,
        summary: record.summary,
        body: record.body,
        coverStorageKey: cover?.storageKey ?? null,
        coverFileName: cover?.fileName ?? null,
        linkUrl: null,
        sortNo: null,
        statusCode: 'ACTIVE',
        publishedAt: new Date(),
        createdBy: BigInt(currentUser.id),
        isDeleted: false,
      },
      select: { id: true },
    });

    return { portalContentId: created.id, portalCarouselId: record.portalCarouselId };
  }

  async approve(currentUser: CurrentUserProfile, id: string, payload: ApproveCreationContentDto) {
    this.assertReviewer(currentUser);
    const publishMode = payload.publishMode ?? 'KNOWLEDGE';
    const homeSection = payload.homeSection;

    const record = await this.prisma.creationContent.findFirst({
      where: { id: BigInt(id), isDeleted: false },
    });
    if (!record) throw new NotFoundException('创作内容不存在');
    if ((record.statusCode as CreationStatus) !== 'PENDING') {
      throw new BadRequestException('仅待审核内容可审核通过');
    }

    const shouldKnowledge = publishMode === 'KNOWLEDGE' || publishMode === 'BOTH';
    const shouldHome = publishMode === 'HOME' || publishMode === 'BOTH';

    if (shouldHome && !homeSection) {
      throw new BadRequestException('推荐到首页时必须选择首页栏目');
    }

    let portalContentId: bigint | null = record.portalContentId;
    let portalCarouselId: bigint | null = record.portalCarouselId;
    if (shouldHome && homeSection) {
      const imported = await this.importToPortal(currentUser, record, homeSection);
      portalContentId = imported.portalContentId ?? null;
      portalCarouselId = imported.portalCarouselId ?? null;
    }

    await this.prisma.creationContent.update({
      where: { id: BigInt(id) },
      data: {
        statusCode: 'APPROVED',
        reviewerUserId: BigInt(currentUser.id),
        reviewComment: payload.reviewComment?.trim() || null,
        reviewedAt: new Date(),
        inKnowledgeBase: shouldKnowledge,
        recommendToHome: shouldHome,
        homeSection: shouldHome ? homeSection ?? null : null,
        portalContentId,
        portalCarouselId,
      },
    });

    return null;
  }

  async reject(currentUser: CurrentUserProfile, id: string, reviewComment: string) {
    this.assertReviewer(currentUser);
    const comment = reviewComment.trim();
    if (!comment) throw new BadRequestException('驳回原因不能为空');

    const record = await this.prisma.creationContent.findFirst({
      where: { id: BigInt(id), isDeleted: false },
      select: { id: true, statusCode: true },
    });
    if (!record) throw new NotFoundException('创作内容不存在');
    if ((record.statusCode as CreationStatus) !== 'PENDING') {
      throw new BadRequestException('仅待审核内容可驳回');
    }

    await this.prisma.creationContent.update({
      where: { id: BigInt(id) },
      data: {
        statusCode: 'REJECTED',
        reviewerUserId: BigInt(currentUser.id),
        reviewComment: comment,
        reviewedAt: new Date(),
      },
    });

    return null;
  }

  async publishSettings(currentUser: CurrentUserProfile, id: string, payload: PublishCreationContentDto) {
    this.assertReviewer(currentUser);
    const record = await this.prisma.creationContent.findFirst({
      where: { id: BigInt(id), isDeleted: false },
    });
    if (!record) throw new NotFoundException('创作内容不存在');
    if ((record.statusCode as CreationStatus) !== 'APPROVED') {
      throw new BadRequestException('仅已通过内容可设置发布');
    }

    const data: Prisma.CreationContentUpdateInput = {};

    if (payload.inKnowledgeBase === true && record.inKnowledgeBase === false) {
      data.inKnowledgeBase = true;
    }

    const wantsRecommend = payload.recommendToHome === true && record.recommendToHome === false;
    if (wantsRecommend) {
      const homeSection = payload.homeSection ?? (record.homeSection as HomeSection | null);
      if (!homeSection) throw new BadRequestException('推荐到首页时必须选择首页栏目');

      if (record.portalContentId || record.portalCarouselId) {
        data.recommendToHome = true;
        data.homeSection = homeSection;
      } else {
        const imported = await this.importToPortal(currentUser, record, homeSection);
        data.recommendToHome = true;
        data.homeSection = homeSection;
        data.portalContentId = imported.portalContentId ?? null;
        data.portalCarouselId = imported.portalCarouselId ?? null;
      }
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException('没有可更新的发布设置（仅支持从否到是）');
    }

    await this.prisma.creationContent.update({
      where: { id: BigInt(id) },
      data,
    });

    return null;
  }

  async listKnowledge(query: { page: number; pageSize: number; keyword?: string }) {
    const pagination = normalizePagination({ page: query.page, pageSize: query.pageSize });
    const keyword = query.keyword?.trim();

    const where: Prisma.CreationContentWhereInput = {
      isDeleted: false,
      statusCode: 'APPROVED',
      inKnowledgeBase: true,
      ...(keyword
        ? { OR: [{ title: { contains: keyword } }, { summary: { contains: keyword } }] }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.creationContent.findMany({
        where,
        orderBy: [{ reviewedAt: 'desc' }, { id: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        include: {
          author: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.creationContent.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: this.toId(item.id),
        title: item.title,
        summary: item.summary,
        coverUrl: item.coverStorageKey ? this.buildPrivateDownloadUrl(item.coverStorageKey, item.coverFileName) : null,
        author: { id: this.toId(item.author.id), displayName: item.author.displayName },
        reviewedAt: this.toIso(item.reviewedAt),
      })),
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async knowledgeDetail(id: string) {
    const record = await this.prisma.creationContent.findFirst({
      where: { id: BigInt(id), isDeleted: false, statusCode: 'APPROVED', inKnowledgeBase: true },
      include: {
        author: { select: { id: true, displayName: true } },
        reviewer: { select: { id: true, displayName: true } },
      },
    });
    if (!record) throw new NotFoundException('智库内容不存在');

    return {
      id: this.toId(record.id),
      title: record.title,
      summary: record.summary,
      body: record.body,
      coverUrl: record.coverStorageKey ? this.buildPrivateDownloadUrl(record.coverStorageKey, record.coverFileName) : null,
      author: { id: this.toId(record.author.id), displayName: record.author.displayName },
      reviewer: record.reviewer ? { id: this.toId(record.reviewer.id), displayName: record.reviewer.displayName } : null,
      reviewedAt: this.toIso(record.reviewedAt),
      createdAt: this.toIso(record.createdAt),
      updatedAt: this.toIso(record.updatedAt),
    };
  }
}
