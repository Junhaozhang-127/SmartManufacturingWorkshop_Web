import { ApprovalService } from '@api/modules/approval/approval.service';
import { PrismaService } from '@api/modules/prisma/prisma.service';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ApprovalBusinessType,
  ConsumableInventoryStatus,
  ConsumableRequestStatus,
  ConsumableStatus,
  type CurrentUserProfile,
  DataScope,
  type DataScopeContext,
  InventoryTxnType,
  normalizePagination,
} from '@smw/shared';

import type { ConsumableQueryDto } from './dto/consumable-query.dto';
import type { ConsumableRequestQueryDto } from './dto/consumable-request-query.dto';
import type { CreateConsumableDto } from './dto/create-consumable.dto';
import type { CreateConsumableRequestDto } from './dto/create-consumable-request.dto';
import type { CreateInventoryTxnDto } from './dto/create-inventory-txn.dto';
import type { InventoryTxnQueryDto } from './dto/inventory-txn-query.dto';

type ConsumableRecord = Prisma.InvConsumableGetPayload<{
  include: {
    orgUnit: true;
  };
}>;

type ConsumableDetailRecord = Prisma.InvConsumableGetPayload<{
  include: {
    orgUnit: true;
    txns: {
      include: {
        consumable: true;
        operator: true;
      };
      orderBy: {
        txnAt: 'desc';
      };
      take: 10;
    };
  };
}>;

type RequestRecord = Prisma.InvConsumableRequestGetPayload<{
  include: {
    applicant: true;
    consumable: {
      include: {
        orgUnit: true;
      };
    };
    outboundTxn: {
      include: {
        consumable: true;
        operator: true;
      };
    };
  };
}>;

type TxnRecord = Prisma.InvInventoryTxnGetPayload<{
  include: {
    consumable: true;
    operator: true;
  };
}>;

type InventoryStatusLog = {
  actionType: string;
  fromStatus: string | null;
  toStatus: string | null;
  operatorUserId: string | null;
  operatorName: string | null;
  comment: string | null;
  createdAt: string;
};

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
  ) {}

  async listConsumables(query: ConsumableQueryDto, dataScopeContext: DataScopeContext) {
    const pagination = normalizePagination(query);
    const clauses: Prisma.InvConsumableWhereInput[] = [{ isDeleted: false }, this.buildConsumableScopeWhere(dataScopeContext)];

    if (query.categoryName) {
      clauses.push({ categoryName: { contains: query.categoryName.trim() } });
    }
    if (query.statusCode) {
      clauses.push(this.buildConsumableStatusWhere(query.statusCode));
    }
    if (query.warningFlag === 'true') {
      clauses.push({ warningFlag: true });
    }
    if (query.warningFlag === 'false') {
      clauses.push({ warningFlag: false });
    }
    if (pagination.keyword) {
      clauses.push({
        OR: [
          { consumableCode: { contains: pagination.keyword } },
          { consumableName: { contains: pagination.keyword } },
          { categoryName: { contains: pagination.keyword } },
        ],
      });
    }

    const where = { AND: clauses } satisfies Prisma.InvConsumableWhereInput;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.invConsumable.findMany({
        where,
        include: { orgUnit: true },
        orderBy: [{ warningFlag: 'desc' }, { updatedAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.invConsumable.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapConsumable(item)),
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async getConsumableDetail(id: string, dataScopeContext: DataScopeContext) {
    const record = await this.prisma.invConsumable.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        orgUnit: true,
        txns: {
          include: {
            consumable: true,
            operator: true,
          },
          orderBy: { txnAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!record || record.isDeleted) {
      throw new NotFoundException('耗材不存在');
    }

    this.ensureConsumableVisible(record, dataScopeContext);

    return {
      ...this.mapConsumable(record),
      recentTxns: record.txns.map((item) => this.mapTxn(item)),
    };
  }

  async createConsumable(currentUser: CurrentUserProfile, payload: CreateConsumableDto, dataScopeContext: DataScopeContext) {
    const initialStock = payload.initialStock ?? 0;
    const now = new Date();
    const inventoryState = this.resolveInventoryState(ConsumableStatus.ACTIVE, initialStock, payload.warningThreshold);
    const orgUnitId = this.resolveBusinessOrgUnitId(currentUser);

    const created = await this.prisma.$transaction(async (tx) => {
      const consumable = await tx.invConsumable.create({
        data: {
          consumableCode: `CS-${Date.now()}`,
          consumableName: payload.consumableName.trim(),
          categoryName: payload.categoryName.trim(),
          specification: payload.specification?.trim() || null,
          unitName: payload.unitName.trim(),
          statusCode: ConsumableStatus.ACTIVE,
          inventoryStatus: inventoryState.inventoryStatus,
          currentStock: this.toDecimal(initialStock)!,
          warningThreshold: this.toDecimal(payload.warningThreshold)!,
          warningFlag: inventoryState.warningFlag,
          orgUnitId,
          defaultLocation: payload.defaultLocation?.trim() || null,
          replenishmentTriggeredAt: inventoryState.warningFlag ? now : null,
          lastTxnAt: initialStock > 0 ? now : null,
          createdBy: this.toBigInt(currentUser.id),
        },
      });

      if (initialStock > 0) {
        await tx.invInventoryTxn.create({
          data: {
            consumableId: consumable.id,
            txnType: InventoryTxnType.INBOUND,
            quantity: this.toDecimal(initialStock)!,
            balanceAfter: this.toDecimal(initialStock)!,
            operatorUserId: this.toBigInt(currentUser.id),
            operatorRoleCode: currentUser.activeRole.roleCode,
            remark: '建账初始库存',
            txnAt: now,
          },
        });
      }

      return consumable;
    });

    return this.getConsumableDetail(String(created.id), dataScopeContext);
  }

  async listRequests(query: ConsumableRequestQueryDto, dataScopeContext: DataScopeContext) {
    const pagination = normalizePagination(query);
    const clauses: Prisma.InvConsumableRequestWhereInput[] = [this.buildRequestScopeWhere(dataScopeContext)];

    if (query.categoryName) {
      clauses.push({ consumable: { categoryName: { contains: query.categoryName.trim() } } });
    }
    if (query.statusCode) {
      clauses.push({ statusCode: query.statusCode });
    }
    if (query.warningFlag === 'true') {
      clauses.push({ consumable: { warningFlag: true } });
    }
    if (query.warningFlag === 'false') {
      clauses.push({ consumable: { warningFlag: false } });
    }
    if (pagination.keyword) {
      clauses.push({
        OR: [
          { requestNo: { contains: pagination.keyword } },
          { purpose: { contains: pagination.keyword } },
          { consumable: { consumableName: { contains: pagination.keyword } } },
          { consumable: { consumableCode: { contains: pagination.keyword } } },
        ],
      });
    }

    const where = { AND: clauses } satisfies Prisma.InvConsumableRequestWhereInput;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.invConsumableRequest.findMany({
        where,
        include: {
          applicant: true,
          consumable: {
            include: {
              orgUnit: true,
            },
          },
          outboundTxn: {
            include: {
              consumable: true,
              operator: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.invConsumableRequest.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapRequest(item)),
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async getRequestDetail(id: string, dataScopeContext: DataScopeContext) {
    const record = await this.prisma.invConsumableRequest.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        applicant: true,
        consumable: {
          include: {
            orgUnit: true,
          },
        },
        outboundTxn: {
          include: {
            consumable: true,
            operator: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('申领单不存在');
    }

    this.ensureRequestVisible(record, dataScopeContext);

    return {
      ...this.mapRequest(record),
      statusLogs: this.readStatusLogs(record.statusLogs),
      consumable: {
        id: String(record.consumable.id),
        consumableCode: record.consumable.consumableCode,
        consumableName: record.consumable.consumableName,
        categoryName: record.consumable.categoryName,
        specification: record.consumable.specification,
        unitName: record.consumable.unitName,
        inventoryStatus: record.consumable.inventoryStatus,
        currentStock: this.toNumber(record.consumable.currentStock) ?? 0,
        warningThreshold: this.toNumber(record.consumable.warningThreshold) ?? 0,
        warningFlag: record.consumable.warningFlag,
      },
    };
  }

  async createRequest(
    currentUser: CurrentUserProfile,
    payload: CreateConsumableRequestDto,
    dataScopeContext: DataScopeContext,
  ) {
    const consumable = await this.prisma.invConsumable.findUnique({
      where: { id: this.toBigInt(payload.consumableId) },
      include: { orgUnit: true },
    });

    if (!consumable || consumable.isDeleted) {
      throw new NotFoundException('耗材不存在');
    }
    this.ensureConsumableVisible(consumable, dataScopeContext);
    if (consumable.statusCode === ConsumableStatus.DISABLED) {
      throw new BadRequestException('停用耗材不支持申领');
    }

    const quantity = payload.quantity;
    const currentStock = this.toNumber(consumable.currentStock) ?? 0;
    if (quantity > currentStock) {
      throw new BadRequestException('申领数量超过当前库存，暂不可提交');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.invConsumableRequest.create({
        data: {
          requestNo: `REQ-${Date.now()}`,
          consumableId: consumable.id,
          applicantUserId: this.toBigInt(currentUser.id),
          applicantRoleCode: currentUser.activeRole.roleCode,
          quantity: this.toDecimal(quantity)!,
          purpose: payload.purpose.trim(),
          projectId: payload.projectId?.trim() || null,
          projectName: payload.projectName?.trim() || null,
          statusCode: ConsumableRequestStatus.DRAFT,
          latestResult: '申领单已创建',
          statusLogs: this.appendStatusLog(null, {
            actionType: 'REQUEST_CREATED',
            fromStatus: null,
            toStatus: ConsumableRequestStatus.DRAFT,
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: payload.purpose.trim(),
          }),
        },
      });

      const approval = await this.approvalService.startBusinessApproval(tx, {
        businessType: ApprovalBusinessType.CONSUMABLE_REQUEST,
        businessId: String(request.id),
        title: `耗材申领 - ${consumable.consumableName}`,
        applicantUserId: this.toBigInt(currentUser.id),
        applicantRoleCode: currentUser.activeRole.roleCode,
        formData: {
          requestNo: request.requestNo,
          consumableCode: consumable.consumableCode,
          consumableName: consumable.consumableName,
          quantity,
          unitName: consumable.unitName,
          purpose: payload.purpose.trim(),
          projectId: payload.projectId?.trim() || null,
          projectName: payload.projectName?.trim() || null,
        },
      });

      await tx.invConsumableRequest.update({
        where: { id: request.id },
        data: {
          approvalInstanceId: approval.id,
          statusCode: ConsumableRequestStatus.IN_APPROVAL,
          latestResult: '申领单已提交审批',
          statusLogs: this.appendStatusLog(request.statusLogs, {
            actionType: 'APPROVAL_SUBMITTED',
            fromStatus: ConsumableRequestStatus.DRAFT,
            toStatus: ConsumableRequestStatus.IN_APPROVAL,
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: '已接入统一审批中心',
          }),
        },
      });

      return request;
    });

    return this.getRequestDetail(String(created.id), dataScopeContext);
  }

  async listTransactions(query: InventoryTxnQueryDto, dataScopeContext: DataScopeContext) {
    const pagination = normalizePagination(query);
    const clauses: Prisma.InvInventoryTxnWhereInput[] = [this.buildTxnScopeWhere(dataScopeContext)];

    if (query.txnType) {
      clauses.push({ txnType: query.txnType });
    }
    if (query.consumableId) {
      clauses.push({ consumableId: this.toBigInt(query.consumableId) });
    }
    if (pagination.keyword) {
      clauses.push({
        OR: [
          { remark: { contains: pagination.keyword } },
          { consumable: { consumableName: { contains: pagination.keyword } } },
          { consumable: { consumableCode: { contains: pagination.keyword } } },
          { projectName: { contains: pagination.keyword } },
          { projectId: { contains: pagination.keyword } },
        ],
      });
    }

    const where = { AND: clauses } satisfies Prisma.InvInventoryTxnWhereInput;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.invInventoryTxn.findMany({
        where,
        include: {
          consumable: true,
          operator: true,
        },
        orderBy: [{ txnAt: 'desc' }, { createdAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.invInventoryTxn.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapTxn(item)),
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async createInboundTxn(
    currentUser: CurrentUserProfile,
    payload: CreateInventoryTxnDto,
    dataScopeContext: DataScopeContext,
  ) {
    return this.createManualTxn(currentUser, payload, InventoryTxnType.INBOUND, dataScopeContext);
  }

  async createOutboundTxn(
    currentUser: CurrentUserProfile,
    payload: CreateInventoryTxnDto,
    dataScopeContext: DataScopeContext,
  ) {
    return this.createManualTxn(currentUser, payload, InventoryTxnType.OUTBOUND, dataScopeContext);
  }

  async applyInventoryTxn(
    tx: Prisma.TransactionClient,
    payload: {
      consumableId: bigint;
      txnType: InventoryTxnType | string;
      quantity: number;
      projectId?: string | null;
      projectName?: string | null;
      requestId?: bigint | null;
      operatorUserId?: bigint | null;
      operatorRoleCode?: string | null;
      remark?: string | null;
    },
  ) {
    const consumable = await tx.invConsumable.findUnique({
      where: { id: payload.consumableId },
    });

    if (!consumable || consumable.isDeleted) {
      throw new NotFoundException('耗材不存在');
    }

    const currentStock = this.toNumber(consumable.currentStock) ?? 0;
    const delta = payload.txnType === InventoryTxnType.INBOUND ? payload.quantity : payload.quantity * -1;
    const nextStock = Number((currentStock + delta).toFixed(2));

    if (nextStock < 0) {
      throw new BadRequestException('库存不足，无法执行出库');
    }

    const inventoryState = this.resolveInventoryState(
      consumable.statusCode,
      nextStock,
      this.toNumber(consumable.warningThreshold) ?? 0,
    );
    const now = new Date();

    const txn = await tx.invInventoryTxn.create({
      data: {
        consumableId: consumable.id,
        requestId: payload.requestId ?? null,
        txnType: payload.txnType,
        quantity: this.toDecimal(payload.quantity)!,
        balanceAfter: this.toDecimal(nextStock)!,
        projectId: payload.projectId ?? null,
        projectName: payload.projectName ?? null,
        operatorUserId: payload.operatorUserId ?? null,
        operatorRoleCode: payload.operatorRoleCode ?? null,
        remark: payload.remark ?? null,
        txnAt: now,
      },
      include: {
        consumable: true,
        operator: true,
      },
    });

    await tx.invConsumable.update({
      where: { id: consumable.id },
      data: {
        currentStock: this.toDecimal(nextStock)!,
        inventoryStatus: inventoryState.inventoryStatus,
        warningFlag: inventoryState.warningFlag,
        replenishmentTriggeredAt:
          inventoryState.warningFlag && !consumable.warningFlag ? now : consumable.replenishmentTriggeredAt,
        lastTxnAt: now,
      },
    });

    return txn;
  }

  private async createManualTxn(
    currentUser: CurrentUserProfile,
    payload: CreateInventoryTxnDto,
    txnType: InventoryTxnType,
    dataScopeContext: DataScopeContext,
  ) {
    const consumable = await this.prisma.invConsumable.findUnique({
      where: { id: this.toBigInt(payload.consumableId) },
      include: { orgUnit: true },
    });

    if (!consumable || consumable.isDeleted) {
      throw new NotFoundException('耗材不存在');
    }
    this.ensureConsumableVisible(consumable, dataScopeContext);
    if (consumable.statusCode === ConsumableStatus.DISABLED) {
      throw new BadRequestException('停用耗材不允许变更库存');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.applyInventoryTxn(tx, {
        consumableId: consumable.id,
        txnType,
        quantity: payload.quantity,
        projectId: payload.projectId?.trim() || null,
        projectName: payload.projectName?.trim() || null,
        operatorUserId: this.toBigInt(currentUser.id),
        operatorRoleCode: currentUser.activeRole.roleCode,
        remark: payload.remark?.trim() || (txnType === InventoryTxnType.INBOUND ? '手工入库' : '手工出库'),
      });
    });

    return this.getConsumableDetail(payload.consumableId, dataScopeContext);
  }

  private mapConsumable(item: ConsumableRecord | ConsumableDetailRecord) {
    return {
      id: String(item.id),
      consumableCode: item.consumableCode,
      consumableName: item.consumableName,
      categoryName: item.categoryName,
      specification: item.specification,
      unitName: item.unitName,
      statusCode: item.statusCode,
      inventoryStatus: item.inventoryStatus,
      currentStock: this.toNumber(item.currentStock) ?? 0,
      warningThreshold: this.toNumber(item.warningThreshold) ?? 0,
      warningFlag: item.warningFlag,
      orgUnitId: item.orgUnitId ? String(item.orgUnitId) : null,
      orgUnitName: item.orgUnit?.unitName ?? null,
      defaultLocation: item.defaultLocation,
      lastTxnAt: item.lastTxnAt?.toISOString() ?? null,
      replenishmentTriggeredAt: item.replenishmentTriggeredAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private mapRequest(item: RequestRecord) {
    return {
      id: String(item.id),
      requestNo: item.requestNo,
      consumableId: String(item.consumableId),
      consumableName: item.consumable.consumableName,
      consumableCode: item.consumable.consumableCode,
      quantity: this.toNumber(item.quantity) ?? 0,
      statusCode: item.statusCode,
      purpose: item.purpose,
      projectId: item.projectId,
      projectName: item.projectName,
      applicantUserId: String(item.applicantUserId),
      applicantName: item.applicant.displayName,
      applicantRoleCode: item.applicantRoleCode,
      approvalInstanceId: item.approvalInstanceId ? String(item.approvalInstanceId) : null,
      latestResult: item.latestResult,
      outboundTxnId: item.outboundTxnId ? String(item.outboundTxnId) : null,
      requestedAt: item.requestedAt.toISOString(),
      completedAt: item.completedAt?.toISOString() ?? null,
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private mapTxn(item: TxnRecord) {
    return {
      id: String(item.id),
      consumableId: String(item.consumableId),
      consumableName: item.consumable.consumableName,
      consumableCode: item.consumable.consumableCode,
      txnType: item.txnType,
      quantity: this.toNumber(item.quantity) ?? 0,
      balanceAfter: this.toNumber(item.balanceAfter) ?? 0,
      projectId: item.projectId,
      projectName: item.projectName,
      requestId: item.requestId ? String(item.requestId) : null,
      operatorUserId: item.operatorUserId ? String(item.operatorUserId) : null,
      operatorName: item.operator?.displayName ?? null,
      operatorRoleCode: item.operatorRoleCode,
      remark: item.remark,
      txnAt: item.txnAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
    };
  }

  private resolveInventoryState(statusCode: string, currentStock: number, warningThreshold: number) {
    if (statusCode === ConsumableStatus.DISABLED) {
      return { inventoryStatus: ConsumableInventoryStatus.DISABLED, warningFlag: false };
    }
    if (currentStock <= 0) {
      return { inventoryStatus: ConsumableInventoryStatus.OUT_OF_STOCK, warningFlag: true };
    }
    if (currentStock <= warningThreshold) {
      return { inventoryStatus: ConsumableInventoryStatus.LOW_STOCK, warningFlag: true };
    }
    return { inventoryStatus: ConsumableInventoryStatus.NORMAL, warningFlag: false };
  }

  private buildConsumableStatusWhere(statusCode: string): Prisma.InvConsumableWhereInput {
    if (statusCode === ConsumableStatus.DISABLED) {
      return { statusCode: ConsumableStatus.DISABLED };
    }
    return { inventoryStatus: statusCode };
  }

  private buildConsumableScopeWhere(dataScopeContext: DataScopeContext): Prisma.InvConsumableWhereInput {
    switch (dataScopeContext.scope) {
      case DataScope.ALL:
        return {};
      case DataScope.DEPT_PROJECT:
        return {
          OR: [
            { orgUnitId: { in: dataScopeContext.departmentAndDescendantIds.map((id) => this.toBigInt(id)) } },
            { createdBy: this.toBigInt(dataScopeContext.userId) },
          ],
        };
      case DataScope.GROUP_PROJECT:
        return {
          OR: [
            ...(dataScopeContext.groupId ? [{ orgUnitId: this.toBigInt(dataScopeContext.groupId) }] : []),
            { createdBy: this.toBigInt(dataScopeContext.userId) },
          ],
        };
      case DataScope.SELF_PARTICIPATE:
      default:
        return {
          OR: [
            ...(dataScopeContext.groupId ? [{ orgUnitId: this.toBigInt(dataScopeContext.groupId) }] : []),
            { createdBy: this.toBigInt(dataScopeContext.userId) },
          ],
        };
    }
  }

  private buildRequestScopeWhere(dataScopeContext: DataScopeContext): Prisma.InvConsumableRequestWhereInput {
    switch (dataScopeContext.scope) {
      case DataScope.ALL:
        return {};
      case DataScope.DEPT_PROJECT:
        return {
          OR: [
            {
              consumable: {
                orgUnitId: {
                  in: dataScopeContext.departmentAndDescendantIds.map((id) => this.toBigInt(id)),
                },
              },
            },
            { applicantUserId: this.toBigInt(dataScopeContext.userId) },
          ],
        };
      case DataScope.GROUP_PROJECT:
        return {
          OR: [
            ...(dataScopeContext.groupId ? [{ consumable: { orgUnitId: this.toBigInt(dataScopeContext.groupId) } }] : []),
            { applicantUserId: this.toBigInt(dataScopeContext.userId) },
          ],
        };
      case DataScope.SELF_PARTICIPATE:
      default:
        return { applicantUserId: this.toBigInt(dataScopeContext.userId) };
    }
  }

  private buildTxnScopeWhere(dataScopeContext: DataScopeContext): Prisma.InvInventoryTxnWhereInput {
    switch (dataScopeContext.scope) {
      case DataScope.ALL:
        return {};
      case DataScope.DEPT_PROJECT:
        return {
          OR: [
            { consumable: { orgUnitId: { in: dataScopeContext.departmentAndDescendantIds.map((id) => this.toBigInt(id)) } } },
            { operatorUserId: this.toBigInt(dataScopeContext.userId) },
          ],
        };
      case DataScope.GROUP_PROJECT:
        return {
          OR: [
            ...(dataScopeContext.groupId ? [{ consumable: { orgUnitId: this.toBigInt(dataScopeContext.groupId) } }] : []),
            { operatorUserId: this.toBigInt(dataScopeContext.userId) },
          ],
        };
      case DataScope.SELF_PARTICIPATE:
      default:
        return {
          OR: [
            ...(dataScopeContext.groupId ? [{ consumable: { orgUnitId: this.toBigInt(dataScopeContext.groupId) } }] : []),
            { operatorUserId: this.toBigInt(dataScopeContext.userId) },
          ],
        };
    }
  }

  private ensureConsumableVisible(record: { orgUnitId: bigint | null; createdBy?: bigint | null }, dataScopeContext: DataScopeContext) {
    if (dataScopeContext.scope === DataScope.ALL) {
      return;
    }

    if (record.createdBy && record.createdBy === this.toBigInt(dataScopeContext.userId)) {
      return;
    }

    if (
      dataScopeContext.scope === DataScope.DEPT_PROJECT &&
      record.orgUnitId &&
      dataScopeContext.departmentAndDescendantIds.includes(String(record.orgUnitId))
    ) {
      return;
    }

    if (record.orgUnitId && dataScopeContext.groupId && String(record.orgUnitId) === dataScopeContext.groupId) {
      return;
    }

    throw new ForbiddenException('当前数据范围不可访问该耗材');
  }

  private ensureRequestVisible(record: RequestRecord, dataScopeContext: DataScopeContext) {
    if (String(record.applicantUserId) === dataScopeContext.userId) {
      return;
    }
    this.ensureConsumableVisible(record.consumable, dataScopeContext);
  }

  private resolveBusinessOrgUnitId(currentUser: CurrentUserProfile) {
    const orgUnitId = currentUser.orgProfile?.groupId ?? currentUser.orgProfile?.orgUnitId ?? null;
    return orgUnitId ? this.toBigInt(orgUnitId) : null;
  }

  private appendStatusLog(raw: Prisma.JsonValue | null, entry: Omit<InventoryStatusLog, 'createdAt'>): Prisma.InputJsonValue {
    const list = this.readStatusLogs(raw);
    list.push({ ...entry, createdAt: new Date().toISOString() });
    return list as Prisma.InputJsonValue;
  }

  private readStatusLogs(raw: Prisma.JsonValue | null) {
    if (!Array.isArray(raw)) {
      return [] as InventoryStatusLog[];
    }
    return raw.filter((item): item is InventoryStatusLog => typeof item === 'object' && item !== null);
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
