import { ApprovalService } from '@api/modules/approval/approval.service';
import { AttachmentsService } from '@api/modules/attachments/attachments.service';
import { PrismaService } from '@api/modules/prisma/prisma.service';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ApprovalBusinessType,
  type CurrentUserProfile,
  DataScope,
  type DataScopeContext,
  DeviceRepairAction,
  DeviceRepairStatus,
  DeviceStatus,
  normalizePagination,
} from '@smw/shared';

import type { AssignDeviceRepairDto } from './dto/assign-device-repair.dto';
import type { ConfirmDeviceRepairDto } from './dto/confirm-device-repair.dto';
import type { CreateDeviceDto } from './dto/create-device.dto';
import type { CreateDeviceRepairDto } from './dto/create-device-repair.dto';
import type { DeviceActionDto } from './dto/device-action.dto';
import type { DeviceRepairQueryDto } from './dto/device-repair-query.dto';
import type { ResolveDeviceRepairDto } from './dto/resolve-device-repair.dto';

type RepairRecord = Prisma.AssetDeviceRepairGetPayload<{
  include: {
    applicant: true;
    handler: true;
    device: {
      include: {
        orgUnit: true;
        responsibleUser: true;
      };
    };
  };
}>;

type VisibleDeviceRecord = {
  orgUnitId: bigint | null;
  responsibleUserId: bigint | null;
  repairOrders?: Array<{ applicantUserId: bigint; handlerUserId: bigint | null }>;
};

type StatusLog = {
  actionType: string;
  fromStatus: string | null;
  toStatus: string | null;
  operatorUserId: string | null;
  operatorName: string | null;
  resultStatus?: string | null;
  comment: string | null;
  createdAt: string;
};

const ACTIVE_REPAIR_STATUSES = [
  DeviceRepairStatus.IN_APPROVAL,
  DeviceRepairStatus.PROCESSING,
  DeviceRepairStatus.RESOLVED,
];

@Injectable()
export class DeviceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  async listDevices(
    query: { page: number; pageSize: number; keyword?: string; statusCode?: string },
    dataScopeContext: DataScopeContext,
  ) {
    const pagination = normalizePagination(query);
    const clauses: Prisma.AssetDeviceWhereInput[] = [{ isDeleted: false }, this.buildDeviceScopeWhere(dataScopeContext)];

    if (query.statusCode) {
      clauses.push({ statusCode: query.statusCode });
    }

    if (pagination.keyword) {
      clauses.push({
        OR: [
          { deviceCode: { contains: pagination.keyword } },
          { deviceName: { contains: pagination.keyword } },
          { categoryName: { contains: pagination.keyword } },
          { model: { contains: pagination.keyword } },
        ],
      });
    }

    const where = { AND: clauses } satisfies Prisma.AssetDeviceWhereInput;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.assetDevice.findMany({
        where,
        include: {
          orgUnit: true,
          responsibleUser: true,
          latestRepair: {
            select: {
              id: true,
              repairNo: true,
              statusCode: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.assetDevice.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: String(item.id),
        deviceCode: item.deviceCode,
        deviceName: item.deviceName,
        categoryName: item.categoryName,
        model: item.model,
        statusCode: item.statusCode,
        orgUnitId: item.orgUnitId ? String(item.orgUnitId) : null,
        orgUnitName: item.orgUnit?.unitName ?? null,
        responsibleUserId: item.responsibleUserId ? String(item.responsibleUserId) : null,
        responsibleUserName: item.responsibleUser?.displayName ?? null,
        locationLabel: item.locationLabel,
        latestRepairId: item.latestRepairId ? String(item.latestRepairId) : null,
        latestRepairNo: item.latestRepair?.repairNo ?? null,
        latestRepairStatus: item.latestRepair?.statusCode ?? null,
        updatedAt: item.updatedAt.toISOString(),
      })),
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async getDeviceDetail(id: string, dataScopeContext: DataScopeContext) {
    const record = await this.prisma.assetDevice.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        orgUnit: true,
        responsibleUser: true,
        latestRepair: {
          select: {
            id: true,
            repairNo: true,
            statusCode: true,
            latestResult: true,
            reportedAt: true,
          },
        },
        repairOrders: {
          where: { isDeleted: false },
          select: { applicantUserId: true, handlerUserId: true },
        },
      },
    });

    if (!record || record.isDeleted) {
      throw new NotFoundException('设备不存在');
    }

    this.ensureDeviceVisible(
      {
        orgUnitId: record.orgUnitId,
        responsibleUserId: record.responsibleUserId,
        repairOrders: record.repairOrders,
      },
      dataScopeContext,
    );

    return {
      id: String(record.id),
      deviceCode: record.deviceCode,
      deviceName: record.deviceName,
      categoryName: record.categoryName,
      model: record.model,
      specification: record.specification,
      manufacturer: record.manufacturer,
      serialNo: record.serialNo,
      assetTag: record.assetTag,
      statusCode: record.statusCode,
      orgUnitId: record.orgUnitId ? String(record.orgUnitId) : null,
      orgUnitName: record.orgUnit?.unitName ?? null,
      responsibleUserId: record.responsibleUserId ? String(record.responsibleUserId) : null,
      responsibleUserName: record.responsibleUser?.displayName ?? null,
      locationLabel: record.locationLabel,
      purchaseDate: record.purchaseDate?.toISOString().slice(0, 10) ?? null,
      warrantyUntil: record.warrantyUntil?.toISOString().slice(0, 10) ?? null,
      purchaseAmount: this.toNumber(record.purchaseAmount),
      remarks: record.remarks,
      latestRepairId: record.latestRepairId ? String(record.latestRepairId) : null,
      statusChangedAt: record.statusChangedAt?.toISOString() ?? null,
      statusLogs: this.readStatusLogs(record.statusLogs),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      latestRepair: record.latestRepair
        ? {
            id: String(record.latestRepair.id),
            repairNo: record.latestRepair.repairNo,
            statusCode: record.latestRepair.statusCode,
            latestResult: record.latestRepair.latestResult,
            reportedAt: record.latestRepair.reportedAt.toISOString(),
          }
        : null,
    };
  }

  async createDevice(currentUser: CurrentUserProfile, payload: CreateDeviceDto, dataScopeContext: DataScopeContext) {
    const deviceCode = payload.deviceCode.trim();
    const deviceName = payload.deviceName.trim();
    const categoryName = payload.categoryName.trim();
    const orgUnitId = payload.orgUnitId ? this.toBigInt(payload.orgUnitId) : null;
    const responsibleUserId = payload.responsibleUserId ? this.toBigInt(payload.responsibleUserId) : null;

    this.ensureDeviceCreatable({ orgUnitId, responsibleUserId }, dataScopeContext);

    const existing = await this.prisma.assetDevice.findUnique({ where: { deviceCode } });
    if (existing && !existing.isDeleted) {
      throw new BadRequestException('设备编号已存在');
    }

    const record = await this.prisma.assetDevice.create({
      data: {
        deviceCode,
        deviceName,
        categoryName,
        model: payload.model?.trim() || null,
        locationLabel: payload.locationLabel?.trim() || null,
        statusCode: payload.statusCode ?? 'IDLE',
        orgUnitId,
        responsibleUserId,
        remarks: payload.remarks?.trim() || null,
        purchaseAmount: payload.purchaseAmount === undefined ? undefined : this.toDecimal(payload.purchaseAmount),
        purchaseDate: payload.purchaseDate ? this.parseDateOnly(payload.purchaseDate, '购置日期') : undefined,
        warrantyUntil: payload.warrantyUntil ? this.parseDateOnly(payload.warrantyUntil, '质保到期') : undefined,
        statusChangedAt: new Date(),
        createdBy: this.toBigInt(currentUser.id),
      },
    });

    return this.getDeviceDetail(String(record.id), dataScopeContext);
  }

  async disableDevice(
    currentUser: CurrentUserProfile,
    id: string,
    payload: DeviceActionDto,
    dataScopeContext: DataScopeContext,
  ) {
    const record = await this.prisma.assetDevice.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        repairOrders: {
          where: { isDeleted: false },
          select: { applicantUserId: true, handlerUserId: true },
        },
      },
    });

    if (!record || record.isDeleted) {
      throw new NotFoundException('设备不存在');
    }

    this.ensureDeviceVisible(record, dataScopeContext);

    if (record.statusCode === DeviceStatus.SCRAPPED) {
      throw new BadRequestException('设备已报废，不能停用');
    }

    await this.prisma.assetDevice.update({
      where: { id: record.id },
      data: {
        statusCode: DeviceStatus.SCRAP_PENDING,
        statusChangedAt: new Date(),
        statusLogs: this.appendStatusLog(record.statusLogs, {
          actionType: 'DEVICE_DISABLED',
          fromStatus: record.statusCode,
          toStatus: DeviceStatus.SCRAP_PENDING,
          operatorUserId: currentUser.id,
          operatorName: currentUser.displayName,
          resultStatus: 'SUCCESS',
          comment: payload.comment?.trim() || '设备已停用',
        }),
      },
    });

    return this.getDeviceDetail(id, dataScopeContext);
  }

  async scrapDevice(
    currentUser: CurrentUserProfile,
    id: string,
    payload: DeviceActionDto,
    dataScopeContext: DataScopeContext,
  ) {
    const record = await this.prisma.assetDevice.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        repairOrders: {
          where: { isDeleted: false },
          select: { applicantUserId: true, handlerUserId: true },
        },
      },
    });

    if (!record || record.isDeleted) {
      throw new NotFoundException('设备不存在');
    }

    this.ensureDeviceVisible(record, dataScopeContext);

    const activeRepair = await this.prisma.assetDeviceRepair.findFirst({
      where: { deviceId: record.id, isDeleted: false, statusCode: { in: ACTIVE_REPAIR_STATUSES } },
      select: { id: true },
    });
    if (activeRepair) {
      throw new BadRequestException('设备存在进行中的维修工单，不能报废');
    }

    await this.prisma.assetDevice.update({
      where: { id: record.id },
      data: {
        statusCode: DeviceStatus.SCRAPPED,
        statusChangedAt: new Date(),
        statusLogs: this.appendStatusLog(record.statusLogs, {
          actionType: 'DEVICE_SCRAPPED',
          fromStatus: record.statusCode,
          toStatus: DeviceStatus.SCRAPPED,
          operatorUserId: currentUser.id,
          operatorName: currentUser.displayName,
          resultStatus: 'SUCCESS',
          comment: payload.comment?.trim() || '设备已报废',
        }),
      },
    });

    return this.getDeviceDetail(id, dataScopeContext);
  }

  async deleteDevice(currentUser: CurrentUserProfile, id: string, dataScopeContext: DataScopeContext) {
    const record = await this.prisma.assetDevice.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        repairOrders: {
          where: { isDeleted: false },
          select: { id: true, applicantUserId: true, handlerUserId: true },
        },
      },
    });

    if (!record || record.isDeleted) {
      throw new NotFoundException('设备不存在');
    }

    this.ensureDeviceVisible(record, dataScopeContext);

    if (record.repairOrders.length > 0) {
      throw new BadRequestException('设备已有维修记录，不允许删除，只能停用或报废');
    }

    await this.prisma.assetDevice.update({
      where: { id: record.id },
      data: {
        isDeleted: true,
        statusChangedAt: new Date(),
        statusLogs: this.appendStatusLog(record.statusLogs, {
          actionType: 'DEVICE_DELETED',
          fromStatus: record.statusCode,
          toStatus: null,
          operatorUserId: currentUser.id,
          operatorName: currentUser.displayName,
          resultStatus: 'SUCCESS',
          comment: '设备已删除',
        }),
      },
    });

    return { ok: true };
  }

  async listRepairs(query: DeviceRepairQueryDto, dataScopeContext: DataScopeContext) {
    const pagination = normalizePagination(query);
    const clauses: Prisma.AssetDeviceRepairWhereInput[] = [{ isDeleted: false }, this.buildRepairScopeWhere(dataScopeContext)];

    if (query.statusCode) {
      clauses.push({ statusCode: query.statusCode });
    }
    if (query.severity) {
      clauses.push({ severity: query.severity });
    }
    if (query.handlerUserId) {
      clauses.push({ handlerUserId: this.toBigInt(query.handlerUserId) });
    }
    if (pagination.keyword) {
      clauses.push({
        OR: [
          { repairNo: { contains: pagination.keyword } },
          { faultDescription: { contains: pagination.keyword } },
          { device: { deviceCode: { contains: pagination.keyword } } },
          { device: { deviceName: { contains: pagination.keyword } } },
        ],
      });
    }

    const where = { AND: clauses } satisfies Prisma.AssetDeviceRepairWhereInput;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.assetDeviceRepair.findMany({
        where,
        include: {
          applicant: true,
          handler: true,
          device: {
            include: {
              orgUnit: true,
              responsibleUser: true,
            },
          },
        },
        orderBy: [{ statusCode: 'asc' }, { reportedAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.assetDeviceRepair.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapRepair(item)),
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async getRepairDetail(id: string, dataScopeContext: DataScopeContext) {
    const record = await this.loadRepairRecord(id);
    this.ensureRepairVisible(record, dataScopeContext);

    return {
      ...this.mapRepair(record),
      deviceStatusBeforeRepair: record.deviceStatusBeforeRepair,
      applicantRoleCode: record.applicantRoleCode,
      handlerComment: record.handlerComment,
      resolutionSummary: record.resolutionSummary,
      costEstimate: this.toNumber(record.costEstimate),
      actualCost: this.toNumber(record.actualCost),
      fundLinkCode: record.fundLinkCode,
      attachments: this.readAttachments(record.attachments),
      canCurrentUserConfirm: record.statusCode === DeviceRepairStatus.RESOLVED,
      availableActions: this.resolveAvailableActions(record),
      statusLogs: this.readStatusLogs(record.statusLogs),
      device: {
        id: String(record.device.id),
        deviceCode: record.device.deviceCode,
        deviceName: record.device.deviceName,
        categoryName: record.device.categoryName,
        model: record.device.model,
        statusCode: record.device.statusCode,
        responsibleUserId: record.device.responsibleUserId ? String(record.device.responsibleUserId) : null,
        responsibleUserName: record.device.responsibleUser?.displayName ?? null,
        locationLabel: record.device.locationLabel,
        latestRepairId: record.device.latestRepairId ? String(record.device.latestRepairId) : null,
      },
    };
  }

  async createRepair(currentUser: CurrentUserProfile, payload: CreateDeviceRepairDto, dataScopeContext: DataScopeContext) {
    const device = await this.prisma.assetDevice.findUnique({
      where: { id: this.toBigInt(payload.deviceId) },
      include: {
        orgUnit: true,
        responsibleUser: true,
        repairOrders: {
          where: { isDeleted: false },
          select: {
            applicantUserId: true,
            handlerUserId: true,
          },
        },
      },
    });

    if (!device || device.isDeleted) {
      throw new NotFoundException('设备不存在');
    }

    this.ensureDeviceVisible(device, dataScopeContext);

    const activeRepair = await this.prisma.assetDeviceRepair.findFirst({
      where: {
        deviceId: device.id,
        isDeleted: false,
        statusCode: { in: ACTIVE_REPAIR_STATUSES },
      },
      select: { id: true },
    });

    if (activeRepair) {
      throw new BadRequestException('当前设备已有进行中的报修工单');
    }

    const handlerUserId = payload.handlerUserId ? this.toBigInt(payload.handlerUserId) : null;
    if (handlerUserId) {
      await this.ensureUserActive(handlerUserId, '处理人不存在或已停用');
    }

    return this.prisma.$transaction(async (tx) => {
      const repair = await tx.assetDeviceRepair.create({
        data: {
          deviceId: device.id,
          repairNo: `RP-${Date.now()}`,
          applicantUserId: this.toBigInt(currentUser.id),
          applicantRoleCode: currentUser.activeRole.roleCode,
          handlerUserId,
          statusCode: DeviceRepairStatus.DRAFT,
          severity: payload.severity.trim(),
          faultDescription: payload.faultDescription.trim(),
          requestedAmount: this.toDecimal(payload.requestedAmount),
          costEstimate: this.toDecimal(payload.costEstimate),
          fundLinkCode: payload.fundLinkCode?.trim() || null,
          deviceStatusBeforeRepair: device.statusCode,
          attachments: this.toAttachmentJson(payload.attachments),
          statusChangedAt: new Date(),
          statusLogs: this.appendStatusLog(null, {
            actionType: 'REPORT_CREATED',
            fromStatus: null,
            toStatus: DeviceRepairStatus.DRAFT,
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: payload.faultDescription.trim(),
          }),
          createdBy: this.toBigInt(currentUser.id),
        },
      });

      if (Array.isArray(payload.attachmentFileIds) && payload.attachmentFileIds.length) {
        await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
          businessType: ApprovalBusinessType.REPAIR_ORDER,
          businessId: String(repair.id),
          usageType: 'REPAIR_FAULT_IMAGE',
          fileIds: payload.attachmentFileIds,
        });
      }

      const approval = await this.approvalService.startBusinessApproval(tx, {
        businessType: ApprovalBusinessType.REPAIR_ORDER,
        businessId: String(repair.id),
        title: `设备报修 - ${device.deviceName}`,
        applicantUserId: this.toBigInt(currentUser.id),
        applicantRoleCode: currentUser.activeRole.roleCode,
        formData: {
          repairNo: repair.repairNo,
          deviceCode: device.deviceCode,
          deviceName: device.deviceName,
          severity: payload.severity.trim(),
          faultDescription: payload.faultDescription.trim(),
          requestedAmount: payload.requestedAmount ?? null,
          costEstimate: payload.costEstimate ?? null,
          handlerUserId: payload.handlerUserId ?? null,
        },
      });

      const now = new Date();
      await tx.assetDeviceRepair.update({
        where: { id: repair.id },
        data: {
          approvalInstanceId: approval.id,
          statusCode: DeviceRepairStatus.IN_APPROVAL,
          latestResult: '报修工单已提交审批',
          statusChangedAt: now,
          statusLogs: this.appendStatusLog(repair.statusLogs, {
            actionType: 'APPROVAL_SUBMITTED',
            fromStatus: DeviceRepairStatus.DRAFT,
            toStatus: DeviceRepairStatus.IN_APPROVAL,
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: '已接入审批中心',
          }),
        },
      });

      await tx.assetDevice.update({
        where: { id: device.id },
        data: {
          statusCode: DeviceStatus.REPAIRING,
          latestRepairId: repair.id,
          statusChangedAt: now,
          statusLogs: this.appendStatusLog(device.statusLogs, {
            actionType: 'REPAIR_REPORTED',
            fromStatus: device.statusCode,
            toStatus: DeviceStatus.REPAIRING,
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: `报修单 ${repair.repairNo} 已创建`,
          }),
        },
      });

      return this.getRepairDetail(String(repair.id), dataScopeContext);
    });
  }

  async assignRepair(
    currentUser: CurrentUserProfile,
    id: string,
    payload: AssignDeviceRepairDto,
    dataScopeContext: DataScopeContext,
  ) {
    const record = await this.loadRepairRecord(id);
    this.ensureRepairVisible(record, dataScopeContext);

    if (![DeviceRepairStatus.IN_APPROVAL, DeviceRepairStatus.PROCESSING].includes(record.statusCode as DeviceRepairStatus)) {
      throw new BadRequestException('当前状态不允许分配处理人');
    }

    const handler = await this.ensureUserActive(this.toBigInt(payload.handlerUserId), '处理人不存在或已停用');
    await this.prisma.assetDeviceRepair.update({
      where: { id: record.id },
      data: {
        handlerUserId: handler.id,
        latestResult: `已分配处理人：${handler.displayName}`,
        handlerComment: payload.comment?.trim() || null,
        statusLogs: this.appendStatusLog(record.statusLogs, {
          actionType: 'HANDLER_ASSIGNED',
          fromStatus: record.statusCode,
          toStatus: record.statusCode,
          operatorUserId: currentUser.id,
          operatorName: currentUser.displayName,
          comment: payload.comment?.trim() || `处理人已更新为 ${handler.displayName}`,
        }),
      },
    });

    return this.getRepairDetail(id, dataScopeContext);
  }

  async resolveRepair(
    currentUser: CurrentUserProfile,
    id: string,
    payload: ResolveDeviceRepairDto,
    dataScopeContext: DataScopeContext,
  ) {
    const record = await this.loadRepairRecord(id);
    this.ensureRepairVisible(record, dataScopeContext);

    if (record.statusCode !== DeviceRepairStatus.PROCESSING) {
      throw new BadRequestException('仅处理中工单可提交处理结果');
    }
    if (record.handlerUserId && String(record.handlerUserId) !== currentUser.id) {
      throw new ForbiddenException('仅当前处理人可提交维修结果');
    }

    const now = new Date();
    await this.prisma.assetDeviceRepair.update({
      where: { id: record.id },
      data: {
        resolutionSummary: payload.resolutionSummary.trim(),
        handlerComment: payload.handlerComment?.trim() || null,
        actualCost: this.toDecimal(payload.actualCost),
        statusCode: DeviceRepairStatus.RESOLVED,
        latestResult: '维修完成，待报修人确认',
        resolvedAt: now,
        statusChangedAt: now,
        statusLogs: this.appendStatusLog(record.statusLogs, {
          actionType: 'REPAIR_RESOLVED',
          fromStatus: record.statusCode,
          toStatus: DeviceRepairStatus.RESOLVED,
          operatorUserId: currentUser.id,
          operatorName: currentUser.displayName,
          comment: payload.resolutionSummary.trim(),
        }),
      },
    });

    return this.getRepairDetail(id, dataScopeContext);
  }

  async confirmRepair(
    currentUser: CurrentUserProfile,
    id: string,
    payload: ConfirmDeviceRepairDto,
    dataScopeContext: DataScopeContext,
  ) {
    const record = await this.loadRepairRecord(id);
    this.ensureRepairVisible(record, dataScopeContext);

    if (record.statusCode !== DeviceRepairStatus.RESOLVED) {
      throw new BadRequestException('仅待确认工单可执行结果确认');
    }
    if (String(record.applicantUserId) !== currentUser.id) {
      throw new ForbiddenException('仅报修人可确认维修结果');
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.assetDeviceRepair.update({
        where: { id: record.id },
        data: {
          statusCode: DeviceRepairStatus.CONFIRMED,
          latestResult: '报修人已确认维修结果',
          confirmedAt: now,
          statusChangedAt: now,
          statusLogs: this.appendStatusLog(record.statusLogs, {
            actionType: 'RESULT_CONFIRMED',
            fromStatus: record.statusCode,
            toStatus: DeviceRepairStatus.CONFIRMED,
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: payload.comment?.trim() || '维修结果确认通过',
          }),
        },
      });

      const restoredStatus =
        record.deviceStatusBeforeRepair && record.deviceStatusBeforeRepair !== DeviceStatus.REPAIRING
          ? record.deviceStatusBeforeRepair
          : DeviceStatus.IDLE;

      await tx.assetDevice.update({
        where: { id: record.deviceId },
        data: {
          statusCode: restoredStatus,
          statusChangedAt: now,
          statusLogs: this.appendStatusLog(record.device.statusLogs, {
            actionType: 'REPAIR_CONFIRMED',
            fromStatus: record.device.statusCode,
            toStatus: restoredStatus,
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: payload.comment?.trim() || `工单 ${record.repairNo} 已确认`,
          }),
        },
      });

      return this.getRepairDetail(id, dataScopeContext);
    });
  }

  async getDashboardSummary(dataScopeContext: DataScopeContext) {
    const repairScope = this.buildRepairScopeWhere(dataScopeContext);
    const deviceScope = this.buildDeviceScopeWhere(dataScopeContext);

    const [pendingRepairCount, processingRepairCount, abnormalDeviceCount, recentRepairs] = await this.prisma.$transaction([
      this.prisma.assetDeviceRepair.count({
        where: {
          AND: [{ isDeleted: false }, repairScope, { statusCode: DeviceRepairStatus.IN_APPROVAL }],
        },
      }),
      this.prisma.assetDeviceRepair.count({
        where: {
          AND: [{ isDeleted: false }, repairScope, { statusCode: DeviceRepairStatus.PROCESSING }],
        },
      }),
      this.prisma.assetDevice.count({
        where: {
          AND: [{ isDeleted: false }, deviceScope, { statusCode: DeviceStatus.REPAIRING }],
        },
      }),
      this.prisma.assetDeviceRepair.findMany({
        where: {
          AND: [
            { isDeleted: false },
            repairScope,
            {
              statusCode: {
                in: [DeviceRepairStatus.IN_APPROVAL, DeviceRepairStatus.PROCESSING, DeviceRepairStatus.RESOLVED],
              },
            },
          ],
        },
        include: {
          applicant: true,
          handler: true,
          device: {
            include: {
              orgUnit: true,
              responsibleUser: true,
            },
          },
        },
        orderBy: {
          reportedAt: 'desc',
        },
        take: 5,
      }),
    ]);

    return {
      abnormalDeviceCount,
      pendingRepairCount,
      processingRepairCount,
      recentRepairs: recentRepairs.map((item) => this.mapRepair(item)),
    };
  }

  private async loadRepairRecord(id: string) {
    const record = await this.prisma.assetDeviceRepair.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        applicant: true,
        handler: true,
        device: {
          include: {
            orgUnit: true,
            responsibleUser: true,
          },
        },
      },
    });

    if (!record || record.isDeleted) {
      throw new NotFoundException('维修工单不存在');
    }

    return record;
  }

  private mapRepair(item: RepairRecord) {
    return {
      id: String(item.id),
      repairNo: item.repairNo,
      deviceId: String(item.deviceId),
      deviceName: item.device.deviceName,
      deviceCode: item.device.deviceCode,
      faultDescription: item.faultDescription,
      severity: item.severity,
      statusCode: item.statusCode,
      applicantUserId: String(item.applicantUserId),
      applicantName: item.applicant.displayName,
      handlerUserId: item.handlerUserId ? String(item.handlerUserId) : null,
      handlerName: item.handler?.displayName ?? null,
      approvalInstanceId: item.approvalInstanceId ? String(item.approvalInstanceId) : null,
      latestResult: item.latestResult,
      requestedAmount: this.toNumber(item.requestedAmount),
      reportedAt: item.reportedAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      resolvedAt: item.resolvedAt?.toISOString() ?? null,
      confirmedAt: item.confirmedAt?.toISOString() ?? null,
    };
  }

  private resolveAvailableActions(record: RepairRecord) {
    const actions: DeviceRepairAction[] = [];
    if ([DeviceRepairStatus.IN_APPROVAL, DeviceRepairStatus.PROCESSING].includes(record.statusCode as DeviceRepairStatus)) {
      actions.push(DeviceRepairAction.ASSIGN);
    }
    if (record.statusCode === DeviceRepairStatus.PROCESSING) {
      actions.push(DeviceRepairAction.RESOLVE);
    }
    if (record.statusCode === DeviceRepairStatus.RESOLVED) {
      actions.push(
        DeviceRepairAction.CONFIRM_RESULT,
        DeviceRepairAction.REQUEST_STATUS_RESTORE,
        DeviceRepairAction.REQUEST_SCRAP,
      );
    }
    return actions;
  }

  private buildDeviceScopeWhere(dataScopeContext: DataScopeContext): Prisma.AssetDeviceWhereInput {
    switch (dataScopeContext.scope) {
      case DataScope.ALL:
        return {};
      case DataScope.DEPT_PROJECT:
        return {
          OR: [
            {
              orgUnitId: {
                in: dataScopeContext.departmentAndDescendantIds.map((id) => this.toBigInt(id)),
              },
            },
            { responsibleUserId: this.toBigInt(dataScopeContext.userId) },
          ],
        };
      case DataScope.GROUP_PROJECT:
        return {
          OR: [
            ...(dataScopeContext.groupId ? [{ orgUnitId: this.toBigInt(dataScopeContext.groupId) }] : []),
            { responsibleUserId: this.toBigInt(dataScopeContext.userId) },
          ],
        };
      case DataScope.SELF_PARTICIPATE:
      default:
        return {
          OR: [
            { responsibleUserId: this.toBigInt(dataScopeContext.userId) },
            {
              repairOrders: {
                some: {
                  isDeleted: false,
                  OR: [
                    { applicantUserId: this.toBigInt(dataScopeContext.userId) },
                    { handlerUserId: this.toBigInt(dataScopeContext.userId) },
                  ],
                },
              },
            },
          ],
        };
    }
  }

  private buildRepairScopeWhere(dataScopeContext: DataScopeContext): Prisma.AssetDeviceRepairWhereInput {
    switch (dataScopeContext.scope) {
      case DataScope.ALL:
        return {};
      case DataScope.DEPT_PROJECT:
        return {
          OR: [
            {
              device: {
                orgUnitId: {
                  in: dataScopeContext.departmentAndDescendantIds.map((id) => this.toBigInt(id)),
                },
              },
            },
            { applicantUserId: this.toBigInt(dataScopeContext.userId) },
            { handlerUserId: this.toBigInt(dataScopeContext.userId) },
          ],
        };
      case DataScope.GROUP_PROJECT:
        return {
          OR: [
            ...(dataScopeContext.groupId ? [{ device: { orgUnitId: this.toBigInt(dataScopeContext.groupId) } }] : []),
            { applicantUserId: this.toBigInt(dataScopeContext.userId) },
            { handlerUserId: this.toBigInt(dataScopeContext.userId) },
          ],
        };
      case DataScope.SELF_PARTICIPATE:
      default:
        return {
          OR: [
            { applicantUserId: this.toBigInt(dataScopeContext.userId) },
            { handlerUserId: this.toBigInt(dataScopeContext.userId) },
            { device: { responsibleUserId: this.toBigInt(dataScopeContext.userId) } },
          ],
        };
    }
  }

  private ensureDeviceCreatable(
    record: Pick<VisibleDeviceRecord, 'orgUnitId' | 'responsibleUserId'>,
    dataScopeContext: DataScopeContext,
  ) {
    if (dataScopeContext.scope === DataScope.ALL) {
      return;
    }

    const currentUserId = this.toBigInt(dataScopeContext.userId);
    if (record.responsibleUserId === currentUserId) {
      return;
    }

    if (
      dataScopeContext.scope === DataScope.DEPT_PROJECT &&
      record.orgUnitId &&
      dataScopeContext.departmentAndDescendantIds.includes(String(record.orgUnitId))
    ) {
      return;
    }

    if (dataScopeContext.scope === DataScope.GROUP_PROJECT && record.orgUnitId && dataScopeContext.groupId) {
      if (String(record.orgUnitId) === dataScopeContext.groupId) {
        return;
      }
    }

    throw new ForbiddenException('当前数据范围不可新建设备');
  }

  private ensureDeviceVisible(record: VisibleDeviceRecord, dataScopeContext: DataScopeContext) {
    if (dataScopeContext.scope === DataScope.ALL) {
      return;
    }

    const currentUserId = this.toBigInt(dataScopeContext.userId);
    if (record.responsibleUserId === currentUserId) {
      return;
    }
    if (record.repairOrders?.some((item) => item.applicantUserId === currentUserId || item.handlerUserId === currentUserId)) {
      return;
    }
    if (
      dataScopeContext.scope === DataScope.DEPT_PROJECT &&
      record.orgUnitId &&
      dataScopeContext.departmentAndDescendantIds.includes(String(record.orgUnitId))
    ) {
      return;
    }
    if (dataScopeContext.scope === DataScope.GROUP_PROJECT && record.orgUnitId && dataScopeContext.groupId) {
      if (String(record.orgUnitId) === dataScopeContext.groupId) {
        return;
      }
    }

    throw new ForbiddenException('当前数据范围不可访问该设备');
  }

  private ensureRepairVisible(record: RepairRecord, dataScopeContext: DataScopeContext) {
    this.ensureDeviceVisible(
      {
        orgUnitId: record.device.orgUnitId,
        responsibleUserId: record.device.responsibleUserId,
        repairOrders: [{ applicantUserId: record.applicantUserId, handlerUserId: record.handlerUserId }],
      },
      dataScopeContext,
    );
  }

  private appendStatusLog(raw: Prisma.JsonValue | null, entry: Omit<StatusLog, 'createdAt'>): Prisma.InputJsonValue {
    const list = this.readStatusLogs(raw);
    list.push({ ...entry, createdAt: new Date().toISOString() });
    return list as Prisma.InputJsonValue;
  }

  private readStatusLogs(raw: Prisma.JsonValue | null) {
    if (!Array.isArray(raw)) {
      return [] as StatusLog[];
    }
    return raw.filter((item): item is StatusLog => typeof item === 'object' && item !== null);
  }

  private readAttachments(raw: Prisma.JsonValue | null) {
    if (!Array.isArray(raw)) {
      return [] as string[];
    }
    return raw
      .map((item) => (typeof item === 'object' && item && 'url' in item ? String((item as { url: unknown }).url) : null))
      .filter((item): item is string => Boolean(item));
  }

  private toAttachmentJson(attachments?: Array<{ url: string }>) {
    if (!attachments?.length) {
      return undefined;
    }
    return attachments.map((item) => ({ url: item.url.trim() })) as Prisma.InputJsonValue;
  }

  private async ensureUserActive(id: bigint, message: string) {
    const user = await this.prisma.sysUser.findUnique({ where: { id } });
    if (!user || user.isDeleted || user.statusCode !== 'ACTIVE') {
      throw new BadRequestException(message);
    }
    return user;
  }

  private parseDateOnly(value: string, label: string) {
    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException(`${label}格式应为 YYYY-MM-DD`);
    }
    const parsed = new Date(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label}无效`);
    }
    return parsed;
  }

  private toBigInt(value: string) {
    return BigInt(value);
  }

  private toDecimal(value?: number | null) {
    if (value === undefined || value === null) {
      return null;
    }
    return new Prisma.Decimal(value);
  }

  private toNumber(value?: Prisma.Decimal | null) {
    return value ? Number(value.toString()) : null;
  }
}
