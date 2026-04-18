import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type CurrentUserProfile,RoleCode } from '@smw/shared';

import { FileService } from '../file/file.service';
import { PrismaService } from '../prisma/prisma.service';
import type { UpsertPortalCarouselItemDto } from './dto/portal-admin-carousel.dto';
import type { UpsertPortalContentDto } from './dto/portal-admin-content.dto';
import type { UpsertPortalContactConfigDto } from './dto/portal-contact-config.dto';

type PortalContentType = 'NEWS' | 'NOTICE' | 'ACHIEVEMENT' | 'COMPETITION' | 'MEMBER_INTRO';

function isPortalManager(currentUser: CurrentUserProfile) {
  return [RoleCode.TEACHER, RoleCode.MINISTER].includes(currentUser.activeRole.roleCode);
}

const PORTAL_CONFIG_CATEGORY = 'PORTAL_HOME';
const PORTAL_CONTACT_EMAIL_KEY = 'PORTAL_CONTACT_EMAIL';
const PORTAL_CONTACT_ADDRESS_KEY = 'PORTAL_CONTACT_ADDRESS';
const PORTAL_CONTACT_PUBLIC_ACCOUNT_QR_KEY = 'PORTAL_CONTACT_PUBLIC_ACCOUNT_QR';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FileService,
  ) {}

  private normalizeText(value: string | null | undefined) {
    const trimmed = value?.trim() ?? '';
    return trimmed ? trimmed : null;
  }

  private safeParseJson<T>(value: string): T | null {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  private toId(value: unknown) {
    if (typeof value === 'bigint') return value.toString();
    return String(value);
  }

  private toIso(value: unknown) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return new Date(value).toISOString();
    return null;
  }

  assertManager(currentUser: CurrentUserProfile) {
    if (!isPortalManager(currentUser)) {
      throw new ForbiddenException('仅部长、老师可管理首页内容');
    }
  }

  buildPreviewUrl(storageKey: string) {
    const apiPrefix = process.env.API_PREFIX ?? 'api';
    return `/${apiPrefix}/portal/files/preview?key=${encodeURIComponent(storageKey)}`;
  }

  private async readPortalContactConfigs() {
    const configs = await this.prisma.sysConfigItem.findMany({
      where: {
        configKey: {
          in: [PORTAL_CONTACT_EMAIL_KEY, PORTAL_CONTACT_ADDRESS_KEY, PORTAL_CONTACT_PUBLIC_ACCOUNT_QR_KEY],
        },
      },
    });

    const map = new Map(configs.map((item) => [item.configKey, item]));
    return map;
  }

  private mapPublicAccountQr(configValue: string | null) {
    const raw = this.normalizeText(configValue);
    if (!raw) return null;
    const parsed = this.safeParseJson<{ storageKey?: unknown; fileName?: unknown }>(raw);
    if (!parsed || typeof parsed.storageKey !== 'string' || !parsed.storageKey.trim()) return null;
    const storageKey = parsed.storageKey.trim();
    const fileName = typeof parsed.fileName === 'string' && parsed.fileName.trim() ? parsed.fileName.trim() : null;

    return {
      storageKey,
      fileName,
      imageUrl: this.buildPreviewUrl(storageKey),
      previewUrl: this.buildPreviewUrl(storageKey),
    };
  }

  async getPublicContactConfig() {
    const map = await this.readPortalContactConfigs();
    const email = map.get(PORTAL_CONTACT_EMAIL_KEY);
    const address = map.get(PORTAL_CONTACT_ADDRESS_KEY);
    const qr = map.get(PORTAL_CONTACT_PUBLIC_ACCOUNT_QR_KEY);

    const contactEmail = email?.statusCode === 'ACTIVE' ? this.normalizeText(email.configValue) : null;
    const contactAddress = address?.statusCode === 'ACTIVE' ? this.normalizeText(address.configValue) : null;
    const publicAccountQr = qr?.statusCode === 'ACTIVE' ? this.mapPublicAccountQr(qr.configValue) : null;

    return {
      contactEmail,
      contactAddress,
      publicAccountQr: publicAccountQr
        ? { storageKey: publicAccountQr.storageKey, fileName: publicAccountQr.fileName, imageUrl: publicAccountQr.imageUrl }
        : null,
    };
  }

  async getAdminContactConfig(currentUser: CurrentUserProfile) {
    this.assertManager(currentUser);
    const map = await this.readPortalContactConfigs();
    const email = map.get(PORTAL_CONTACT_EMAIL_KEY);
    const address = map.get(PORTAL_CONTACT_ADDRESS_KEY);
    const qr = map.get(PORTAL_CONTACT_PUBLIC_ACCOUNT_QR_KEY);

    const contactEmail = email?.statusCode === 'ACTIVE' ? this.normalizeText(email.configValue) : null;
    const contactAddress = address?.statusCode === 'ACTIVE' ? this.normalizeText(address.configValue) : null;
    const publicAccountQr = qr?.statusCode === 'ACTIVE' ? this.mapPublicAccountQr(qr.configValue) : null;

    return {
      contactEmail,
      contactAddress,
      publicAccountQr: publicAccountQr
        ? { storageKey: publicAccountQr.storageKey, fileName: publicAccountQr.fileName, previewUrl: publicAccountQr.previewUrl }
        : null,
    };
  }

  async upsertContactConfig(currentUser: CurrentUserProfile, payload: UpsertPortalContactConfigDto) {
    this.assertManager(currentUser);

    const wantsEmailUpdate = payload.contactEmail !== undefined;
    const wantsAddressUpdate = payload.contactAddress !== undefined;
    const wantsQrUpdate = payload.publicAccountQrStorageKey !== undefined || payload.publicAccountQrFileName !== undefined;

    if (!wantsEmailUpdate && !wantsAddressUpdate && !wantsQrUpdate) {
      return this.getAdminContactConfig(currentUser);
    }

    await this.prisma.$transaction(async (tx) => {
      if (wantsEmailUpdate) {
        const configValue = payload.contactEmail ? String(payload.contactEmail).trim() : '';
        await tx.sysConfigItem.upsert({
          where: { configKey: PORTAL_CONTACT_EMAIL_KEY },
          update: {
            configCategory: PORTAL_CONFIG_CATEGORY,
            configName: 'Portal Contact Email',
            configValue,
            valueType: 'TEXT',
            statusCode: 'ACTIVE',
            remark: 'Portal contact email (public).',
            editable: true,
          },
          create: {
            configCategory: PORTAL_CONFIG_CATEGORY,
            configKey: PORTAL_CONTACT_EMAIL_KEY,
            configName: 'Portal Contact Email',
            configValue,
            valueType: 'TEXT',
            statusCode: 'ACTIVE',
            remark: 'Portal contact email (public).',
            editable: true,
          },
        });
      }

      if (wantsAddressUpdate) {
        const configValue = payload.contactAddress ? String(payload.contactAddress).trim() : '';
        await tx.sysConfigItem.upsert({
          where: { configKey: PORTAL_CONTACT_ADDRESS_KEY },
          update: {
            configCategory: PORTAL_CONFIG_CATEGORY,
            configName: 'Portal Contact Address',
            configValue,
            valueType: 'TEXT',
            statusCode: 'ACTIVE',
            remark: 'Portal contact address (public).',
            editable: true,
          },
          create: {
            configCategory: PORTAL_CONFIG_CATEGORY,
            configKey: PORTAL_CONTACT_ADDRESS_KEY,
            configName: 'Portal Contact Address',
            configValue,
            valueType: 'TEXT',
            statusCode: 'ACTIVE',
            remark: 'Portal contact address (public).',
            editable: true,
          },
        });
      }

      if (wantsQrUpdate) {
        const storageKey = payload.publicAccountQrStorageKey ? String(payload.publicAccountQrStorageKey).trim() : '';
        const fileName = payload.publicAccountQrFileName ? String(payload.publicAccountQrFileName).trim() : '';
        const configValue = storageKey ? JSON.stringify({ storageKey, fileName: fileName || null }) : '';
        await tx.sysConfigItem.upsert({
          where: { configKey: PORTAL_CONTACT_PUBLIC_ACCOUNT_QR_KEY },
          update: {
            configCategory: PORTAL_CONFIG_CATEGORY,
            configName: 'Portal Public Account QR',
            configValue,
            valueType: 'JSON',
            statusCode: 'ACTIVE',
            remark: 'Portal wechat public account QR image (public).',
            editable: true,
          },
          create: {
            configCategory: PORTAL_CONFIG_CATEGORY,
            configKey: PORTAL_CONTACT_PUBLIC_ACCOUNT_QR_KEY,
            configName: 'Portal Public Account QR',
            configValue,
            valueType: 'JSON',
            statusCode: 'ACTIVE',
            remark: 'Portal wechat public account QR image (public).',
            editable: true,
          },
        });
      }
    });

    return this.getAdminContactConfig(currentUser);
  }

  async listAdminCarousel(query: { page: number; pageSize: number; keyword?: string; statusCode?: string }) {
    const offset = (query.page - 1) * query.pageSize;
    const keyword = query.keyword?.trim();
    const statusCode = query.statusCode?.trim();

    const whereSql = Prisma.sql`
      WHERE is_deleted = 0
      ${statusCode ? Prisma.sql`AND status_code = ${statusCode}` : Prisma.empty}
      ${keyword ? Prisma.sql`AND title LIKE ${`%${keyword}%`}` : Prisma.empty}
    `;

    const [totalRows, items] = await this.prisma.$transaction([
      this.prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*) AS total
        FROM portal_carousel_item
        ${whereSql}
      `),
      this.prisma.$queryRaw<
        Array<{
          id: bigint | number;
          title: string;
          summary: string | null;
          image_storage_key: string | null;
          image_file_name: string | null;
          target_url: string | null;
          theme_code: string;
          sort_no: number | null;
          status_code: string;
          created_at: Date;
          updated_at: Date;
          creation_id: bigint | number | null;
        }>
      >(Prisma.sql`
        SELECT
          id,
          title,
          summary,
          image_storage_key,
          image_file_name,
          target_url,
          theme_code,
          sort_no,
          status_code,
          created_at,
          updated_at,
          cc.creation_id
        FROM portal_carousel_item
        LEFT JOIN (
          SELECT portal_carousel_id, MIN(id) AS creation_id
          FROM creation_content
          WHERE is_deleted = 0 AND portal_carousel_id IS NOT NULL
          GROUP BY portal_carousel_id
        ) cc ON cc.portal_carousel_id = portal_carousel_item.id
        ${whereSql}
        ORDER BY sort_no ASC, id DESC
        LIMIT ${query.pageSize} OFFSET ${offset}
      `),
    ]);

    const total = Number(totalRows?.[0]?.total ?? 0);

    return {
      items: items.map((item) => ({
        id: this.toId(item.id),
        title: item.title,
        summary: item.summary,
        imageStorageKey: item.image_storage_key,
        imageFileName: item.image_file_name,
        imageUrl: item.image_storage_key ? this.buildPreviewUrl(item.image_storage_key) : null,
        targetUrl: item.target_url,
        themeCode: item.theme_code as 'blue' | 'gold' | 'teal',
        sortNo: item.sort_no,
        statusCode: item.status_code as 'ACTIVE' | 'INACTIVE',
        sourceType: item.creation_id ? 'KNOWLEDGE' : 'MANUAL',
        sourceCreationId: item.creation_id ? this.toId(item.creation_id) : null,
        createdAt: this.toIso(item.created_at),
        updatedAt: this.toIso(item.updated_at),
      })),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async createCarousel(currentUser: CurrentUserProfile, payload: UpsertPortalCarouselItemDto) {
    this.assertManager(currentUser);
    const title = payload.title;
    const summary = payload.summary ?? null;
    const imageStorageKey = payload.imageStorageKey ?? null;
    const imageFileName = payload.imageFileName ?? null;
    const targetUrl = payload.targetUrl ?? null;
    const themeCode = payload.themeCode ?? 'blue';
    const sortNo = payload.sortNo ?? null;
    const statusCode = payload.statusCode ?? 'ACTIVE';

    const [, rows] = await this.prisma.$transaction([
      this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO portal_carousel_item
          (title, summary, image_storage_key, image_file_name, target_url, theme_code, sort_no, status_code, created_at, updated_at, created_by, is_deleted)
        VALUES
          (${title}, ${summary}, ${imageStorageKey}, ${imageFileName}, ${targetUrl}, ${themeCode}, ${sortNo}, ${statusCode}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), ${BigInt(currentUser.id)}, 0)
      `),
      this.prisma.$queryRaw<Array<{ id: bigint | number }>>(Prisma.sql`SELECT LAST_INSERT_ID() AS id`),
    ]);

    return { id: this.toId(rows[0].id) };
  }

  async updateCarousel(currentUser: CurrentUserProfile, id: string, payload: UpsertPortalCarouselItemDto) {
    this.assertManager(currentUser);
    const rows = await this.prisma.$queryRaw<Array<{ id: bigint | number }>>(Prisma.sql`
      SELECT id FROM portal_carousel_item WHERE id = ${BigInt(id)} AND is_deleted = 0 LIMIT 1
    `);
    if (!rows.length) throw new NotFoundException('轮播内容不存在');

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE portal_carousel_item
      SET
        title = ${payload.title},
        summary = ${payload.summary ?? null},
        image_storage_key = ${payload.imageStorageKey ?? null},
        image_file_name = ${payload.imageFileName ?? null},
        target_url = ${payload.targetUrl ?? null},
        theme_code = ${payload.themeCode ?? 'blue'},
        sort_no = ${payload.sortNo ?? null},
        status_code = ${payload.statusCode ?? 'ACTIVE'},
        updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ${BigInt(id)} AND is_deleted = 0
    `);
  }

  async deleteCarousel(currentUser: CurrentUserProfile, id: string) {
    this.assertManager(currentUser);
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE portal_carousel_item
      SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ${BigInt(id)}
    `);
  }

  async listAdminContents(query: {
    page: number;
    pageSize: number;
    keyword?: string;
    contentType?: PortalContentType;
    statusCode?: string;
  }) {
    const offset = (query.page - 1) * query.pageSize;
    const keyword = query.keyword?.trim();
    const contentType = query.contentType?.trim();
    const statusCode = query.statusCode?.trim();

    const whereSql = Prisma.sql`
      WHERE is_deleted = 0
      ${contentType ? Prisma.sql`AND content_type = ${contentType}` : Prisma.empty}
      ${statusCode ? Prisma.sql`AND status_code = ${statusCode}` : Prisma.empty}
      ${
        keyword
          ? Prisma.sql`AND (title LIKE ${`%${keyword}%`} OR summary LIKE ${`%${keyword}%`})`
          : Prisma.empty
      }
    `;

    const [totalRows, items] = await this.prisma.$transaction([
      this.prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*) AS total
        FROM portal_content
        ${whereSql}
      `),
      this.prisma.$queryRaw<
        Array<{
          id: bigint | number;
          content_type: string;
          title: string;
          summary: string | null;
          body: string | null;
          cover_storage_key: string | null;
          cover_file_name: string | null;
          link_url: string | null;
          sort_no: number | null;
          status_code: string;
          published_at: Date | null;
          created_at: Date;
          updated_at: Date;
          creation_id: bigint | number | null;
        }>
      >(Prisma.sql`
        SELECT
          id,
          content_type,
          title,
          summary,
          body,
          cover_storage_key,
          cover_file_name,
          link_url,
          sort_no,
          status_code,
          published_at,
          created_at,
          updated_at,
          cc.creation_id
        FROM portal_content
        LEFT JOIN (
          SELECT portal_content_id, MIN(id) AS creation_id
          FROM creation_content
          WHERE is_deleted = 0 AND portal_content_id IS NOT NULL
          GROUP BY portal_content_id
        ) cc ON cc.portal_content_id = portal_content.id
        ${whereSql}
        ORDER BY published_at DESC, sort_no ASC, id DESC
        LIMIT ${query.pageSize} OFFSET ${offset}
      `),
    ]);

    const total = Number(totalRows?.[0]?.total ?? 0);

    return {
      items: items.map((item) => ({
        id: this.toId(item.id),
        contentType: item.content_type,
        title: item.title,
        summary: item.summary,
        body: item.body,
        coverStorageKey: item.cover_storage_key,
        coverFileName: item.cover_file_name,
        coverUrl: item.cover_storage_key ? this.buildPreviewUrl(item.cover_storage_key) : null,
        linkUrl: item.link_url,
        sortNo: item.sort_no,
        statusCode: item.status_code,
        sourceType: item.creation_id ? 'KNOWLEDGE' : 'MANUAL',
        sourceCreationId: item.creation_id ? this.toId(item.creation_id) : null,
        publishedAt: this.toIso(item.published_at),
        createdAt: this.toIso(item.created_at),
        updatedAt: this.toIso(item.updated_at),
      })),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async createContent(currentUser: CurrentUserProfile, payload: UpsertPortalContentDto) {
    this.assertManager(currentUser);
    const shouldPublish = (payload.statusCode ?? 'ACTIVE') === 'ACTIVE';
    const statusCode = payload.statusCode ?? 'ACTIVE';
    const publishedAt = shouldPublish ? new Date() : null;

    const [, rows] = await this.prisma.$transaction([
      this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO portal_content
          (content_type, title, summary, body, cover_storage_key, cover_file_name, link_url, sort_no, status_code, published_at, created_at, updated_at, created_by, is_deleted)
        VALUES
          (
            ${payload.contentType},
            ${payload.title},
            ${payload.summary ?? null},
            ${payload.body ?? null},
            ${payload.coverStorageKey ?? null},
            ${payload.coverFileName ?? null},
            ${payload.linkUrl ?? null},
            ${payload.sortNo ?? null},
            ${statusCode},
            ${publishedAt},
            CURRENT_TIMESTAMP(3),
            CURRENT_TIMESTAMP(3),
            ${BigInt(currentUser.id)},
            0
          )
      `),
      this.prisma.$queryRaw<Array<{ id: bigint | number }>>(Prisma.sql`SELECT LAST_INSERT_ID() AS id`),
    ]);

    return { id: this.toId(rows[0].id) };
  }

  async updateContent(currentUser: CurrentUserProfile, id: string, payload: UpsertPortalContentDto) {
    this.assertManager(currentUser);
    const existingRows = await this.prisma.$queryRaw<Array<{ published_at: Date | null; status_code: string }>>(Prisma.sql`
      SELECT published_at, status_code
      FROM portal_content
      WHERE id = ${BigInt(id)} AND is_deleted = 0
      LIMIT 1
    `);
    if (!existingRows.length) throw new NotFoundException('内容不存在');

    const existing = existingRows[0];
    const nextStatus = payload.statusCode ?? existing.status_code;

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE portal_content
      SET
        title = ${payload.title},
        summary = ${payload.summary ?? null},
        body = ${payload.body ?? null},
        cover_storage_key = ${payload.coverStorageKey ?? null},
        cover_file_name = ${payload.coverFileName ?? null},
        link_url = ${payload.linkUrl ?? null},
        sort_no = ${payload.sortNo ?? null},
        status_code = ${nextStatus},
        published_at = CASE
          WHEN published_at IS NOT NULL THEN published_at
          WHEN ${nextStatus} = 'ACTIVE' THEN CURRENT_TIMESTAMP(3)
          ELSE NULL
        END,
        updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ${BigInt(id)} AND is_deleted = 0
    `);
  }

  async deleteContent(currentUser: CurrentUserProfile, id: string) {
    this.assertManager(currentUser);
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE portal_content
      SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP(3)
      WHERE id = ${BigInt(id)}
    `);
  }

  async getHomeData() {
    const [carousel, news, notices, achievements, competitions, members] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          id: bigint | number;
          title: string;
          summary: string | null;
          image_storage_key: string | null;
          target_url: string | null;
          theme_code: string;
        }>
      >(Prisma.sql`
        SELECT id, title, summary, image_storage_key, target_url, theme_code
        FROM portal_carousel_item
        WHERE is_deleted = 0 AND status_code = 'ACTIVE'
        ORDER BY sort_no ASC, id DESC
        LIMIT 10
      `),
      this.prisma.$queryRaw<Array<{ id: bigint | number; title: string; published_at: Date | null; created_at: Date }>>(Prisma.sql`
        SELECT id, title, published_at, created_at
        FROM portal_content
        WHERE is_deleted = 0 AND status_code = 'ACTIVE' AND content_type = 'NEWS'
        ORDER BY published_at DESC, id DESC
        LIMIT 6
      `),
      this.prisma.$queryRaw<Array<{ id: bigint | number; title: string; published_at: Date | null; created_at: Date }>>(Prisma.sql`
        SELECT id, title, published_at, created_at
        FROM portal_content
        WHERE is_deleted = 0 AND status_code = 'ACTIVE' AND content_type = 'NOTICE'
        ORDER BY published_at DESC, id DESC
        LIMIT 6
      `),
      this.prisma.$queryRaw<
        Array<{ id: bigint | number; title: string; summary: string | null; cover_storage_key: string | null }>
      >(Prisma.sql`
        SELECT id, title, summary, cover_storage_key
        FROM portal_content
        WHERE is_deleted = 0 AND status_code = 'ACTIVE' AND content_type = 'ACHIEVEMENT'
        ORDER BY published_at DESC, sort_no ASC, id DESC
        LIMIT 8
      `),
      this.prisma.$queryRaw<
        Array<{ id: bigint | number; title: string; summary: string | null; cover_storage_key: string | null }>
      >(Prisma.sql`
        SELECT id, title, summary, cover_storage_key
        FROM portal_content
        WHERE is_deleted = 0 AND status_code = 'ACTIVE' AND content_type = 'COMPETITION'
        ORDER BY published_at DESC, sort_no ASC, id DESC
        LIMIT 8
      `),
      this.prisma.$queryRaw<
        Array<{ id: bigint | number; title: string; summary: string | null; cover_storage_key: string | null }>
      >(Prisma.sql`
        SELECT id, title, summary, cover_storage_key
        FROM portal_content
        WHERE is_deleted = 0 AND status_code = 'ACTIVE' AND content_type = 'MEMBER_INTRO'
        ORDER BY published_at DESC, sort_no ASC, id DESC
        LIMIT 8
      `),
    ]);

    return {
      carousel: carousel.map((item) => ({
        id: this.toId(item.id),
        title: item.title,
        summary: item.summary,
        targetUrl: item.target_url,
        themeCode: item.theme_code as 'blue' | 'gold' | 'teal',
        imageUrl: item.image_storage_key ? this.buildPreviewUrl(item.image_storage_key) : null,
      })),
      news: news.map((item) => ({
        id: this.toId(item.id),
        title: item.title,
        publishedAt: this.toIso(item.published_at ?? item.created_at),
      })),
      notices: notices.map((item) => ({
        id: this.toId(item.id),
        title: item.title,
        publishedAt: this.toIso(item.published_at ?? item.created_at),
      })),
      achievements: achievements.map((item) => ({
        id: this.toId(item.id),
        title: item.title,
        summary: item.summary,
        coverUrl: item.cover_storage_key ? this.buildPreviewUrl(item.cover_storage_key) : null,
      })),
      competitions: competitions.map((item) => ({
        id: this.toId(item.id),
        title: item.title,
        summary: item.summary,
        coverUrl: item.cover_storage_key ? this.buildPreviewUrl(item.cover_storage_key) : null,
      })),
      members: members.map((item) => ({
        id: this.toId(item.id),
        title: item.title,
        summary: item.summary,
        coverUrl: item.cover_storage_key ? this.buildPreviewUrl(item.cover_storage_key) : null,
      })),
    };
  }

  async listPublicContents(payload: { contentType: PortalContentType; page: number; pageSize: number }) {
    const offset = (payload.page - 1) * payload.pageSize;
    const [totalRows, items] = await this.prisma.$transaction([
      this.prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*) AS total
        FROM portal_content
        WHERE is_deleted = 0 AND status_code = 'ACTIVE' AND content_type = ${payload.contentType}
      `),
      this.prisma.$queryRaw<
        Array<{ id: bigint | number; title: string; summary: string | null; cover_storage_key: string | null; published_at: Date | null; created_at: Date }>
      >(Prisma.sql`
        SELECT id, title, summary, cover_storage_key, published_at, created_at
        FROM portal_content
        WHERE is_deleted = 0 AND status_code = 'ACTIVE' AND content_type = ${payload.contentType}
        ORDER BY published_at DESC, sort_no ASC, id DESC
        LIMIT ${payload.pageSize} OFFSET ${offset}
      `),
    ]);

    const total = Number(totalRows?.[0]?.total ?? 0);

    return {
      items: items.map((item) => ({
        id: this.toId(item.id),
        title: item.title,
        summary: item.summary,
        coverUrl: item.cover_storage_key ? this.buildPreviewUrl(item.cover_storage_key) : null,
        publishedAt: this.toIso(item.published_at ?? item.created_at),
      })),
      meta: { page: payload.page, pageSize: payload.pageSize, total },
    };
  }

  async getPublicContentDetail(id: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: bigint | number;
        content_type: string;
        title: string;
        summary: string | null;
        body: string | null;
        cover_storage_key: string | null;
        link_url: string | null;
        published_at: Date | null;
        created_at: Date;
        status_code: string;
        is_deleted: number;
      }>
    >(Prisma.sql`
      SELECT id, content_type, title, summary, body, cover_storage_key, link_url, published_at, created_at, status_code, is_deleted
      FROM portal_content
      WHERE id = ${BigInt(id)}
      LIMIT 1
    `);
    const record = rows[0];

    if (!record || record.is_deleted || record.status_code !== 'ACTIVE') {
      throw new NotFoundException('内容不存在或未发布');
    }

    return {
      id: this.toId(record.id),
      contentType: record.content_type,
      title: record.title,
      summary: record.summary,
      body: record.body,
      coverUrl: record.cover_storage_key ? this.buildPreviewUrl(record.cover_storage_key) : null,
      linkUrl: record.link_url,
      publishedAt: this.toIso(record.published_at ?? record.created_at),
    };
  }

  async uploadPortalAsset(currentUser: CurrentUserProfile, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    this.assertManager(currentUser);
    const saved = await this.fileService.saveFile(file, 'portal');
    return {
      storageKey: saved.storageKey,
      fileName: saved.fileName,
      previewUrl: this.buildPreviewUrl(saved.storageKey),
    };
  }
}
