import { ApprovalService } from '@api/modules/approval/approval.service';
import { AttachmentsService } from '@api/modules/attachments/attachments.service';
import { PrismaService } from '@api/modules/prisma/prisma.service';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ApprovalBusinessType,
  ApprovalStatus,
  type CurrentUserProfile,
  DataScope,
  type DataScopeContext,
  FundApplicationStatus,
  FundPaymentStatus,
  normalizePagination,
  RoleCode,
} from '@smw/shared';

import type { CreateFundApplicationDto } from './dto/create-fund-application.dto';
import type { CreateLaborApplicationDto } from './dto/create-labor-application.dto';
import type { CreateLaborPaymentDto } from './dto/create-labor-payment.dto';
import type { FundApplicationQueryDto } from './dto/fund-application-query.dto';
import type { LaborApplicationQueryDto } from './dto/labor-application-query.dto';
import type { MarkFundPaymentDto } from './dto/mark-fund-payment.dto';
import type { MarkLaborPaidDto } from './dto/mark-labor-paid.dto';
import type { UpdateFundApplicationDto } from './dto/update-fund-application.dto';
import type { UpdateLaborApplicationDto } from './dto/update-labor-application.dto';

type AccountRecord = Prisma.FundAccountGetPayload<{
  include: {
    ownerOrgUnit: true;
    manager: true;
  };
}>;

type ApplicationRecord = Prisma.FundApplicationGetPayload<{
  include: {
    applicant: true;
    account: {
      include: {
        ownerOrgUnit: true;
        manager: true;
      };
    };
  };
}>;

type LaborApplicationRecord = Prisma.FundLaborApplicationGetPayload<{
  include: {
    applicant: true;
    targetUser: true;
  };
}>;

type FundStatusLog = {
  actionType: string;
  fromStatus: string | null;
  toStatus: string | null;
  operatorUserId: string | null;
  operatorName: string | null;
  comment: string | null;
  createdAt: string;
};

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  private static readonly REIMBURSEMENT_THRESHOLD_KEY = 'reimbursement_material_threshold';
  private static readonly DEFAULT_REIMBURSEMENT_THRESHOLD = 500;

  private static readonly ATTACHMENT_USAGE_FUND_VOUCHER = 'FUND_VOUCHER';
  private static readonly ATTACHMENT_USAGE_REIMBURSE_ORDER = 'REIMBURSE_ORDER';
  private static readonly ATTACHMENT_USAGE_REIMBURSE_INVOICE = 'REIMBURSE_INVOICE';
  private static readonly ATTACHMENT_USAGE_REIMBURSE_GOODS = 'REIMBURSE_GOODS';
  private static readonly ATTACHMENT_USAGE_LABOR_PROOF = 'LABOR_PROOF';

  private assertTeacher(currentUser: CurrentUserProfile) {
    if (![RoleCode.TEACHER, RoleCode.MINISTER].includes(currentUser.activeRole.roleCode)) {
      throw new ForbiddenException('仅部长及以上身份可管理项目台账');
    }
  }

  private parseNumberConfig(value: string | null | undefined) {
    const num = Number(String(value ?? '').trim());
    return Number.isFinite(num) ? num : null;
  }

  private async getReimbursementMaterialThreshold() {
    const record = await this.prisma.sysConfigItem.findUnique({
      where: { configKey: FinanceService.REIMBURSEMENT_THRESHOLD_KEY },
      select: { configValue: true, statusCode: true },
    });

    if (!record || String(record.statusCode) !== 'ACTIVE') {
      return FinanceService.DEFAULT_REIMBURSEMENT_THRESHOLD;
    }

    return this.parseNumberConfig(record.configValue) ?? FinanceService.DEFAULT_REIMBURSEMENT_THRESHOLD;
  }

  async getFundSettings() {
    const threshold = await this.getReimbursementMaterialThreshold();
    return {
      reimbursementMaterialThreshold: threshold,
    };
  }

  async listTeacherAccounts(
    currentUser: CurrentUserProfile,
    query: { page: number; pageSize: number; keyword?: string; statusCode?: string },
  ) {
    this.assertTeacher(currentUser);
    const pagination = normalizePagination(query);
    const clauses: Prisma.FundAccountWhereInput[] = [{ isDeleted: false }];

    if (query.statusCode) {
      clauses.push({ statusCode: query.statusCode });
    }

    if (pagination.keyword) {
      clauses.push({
        OR: [
          { accountCode: { contains: pagination.keyword } },
          { accountName: { contains: pagination.keyword } },
          { projectId: { contains: pagination.keyword } },
          { projectName: { contains: pagination.keyword } },
          { categoryName: { contains: pagination.keyword } },
        ],
      });
    }

    const where = { AND: clauses } satisfies Prisma.FundAccountWhereInput;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.fundAccount.findMany({
        where,
        include: {
          ownerOrgUnit: true,
          manager: true,
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.fundAccount.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: String(item.id),
        accountCode: item.accountCode,
        accountName: item.accountName,
        categoryName: item.categoryName,
        projectId: item.projectId,
        projectName: item.projectName,
        ownerOrgUnitId: item.ownerOrgUnitId ? String(item.ownerOrgUnitId) : null,
        ownerOrgUnitName: item.ownerOrgUnit?.unitName ?? null,
        managerUserId: item.managerUserId ? String(item.managerUserId) : null,
        managerUserName: item.manager?.displayName ?? null,
        statusCode: item.statusCode,
        totalBudget: this.toNumber(item.totalBudget) ?? 0,
        reservedAmount: this.toNumber(item.reservedAmount) ?? 0,
        usedAmount: this.toNumber(item.usedAmount) ?? 0,
        paidAmount: this.toNumber(item.paidAmount) ?? 0,
        remarks: item.remarks,
        updatedAt: item.updatedAt.toISOString(),
      })),
      meta: { page: pagination.page, pageSize: pagination.pageSize, total },
    };
  }

  async createTeacherAccount(
    currentUser: CurrentUserProfile,
    payload: {
      accountCode: string;
      accountName: string;
      categoryName: string;
      projectId?: string;
      projectName?: string;
      ownerOrgUnitId?: string;
      managerUserId?: string;
      totalBudget: number;
      remarks?: string;
      statusCode?: string;
    },
  ) {
    this.assertTeacher(currentUser);
    const created = await this.prisma.fundAccount.create({
      data: {
        accountCode: payload.accountCode.trim(),
        accountName: payload.accountName.trim(),
        categoryName: payload.categoryName.trim(),
        projectId: payload.projectId?.trim() || null,
        projectName: payload.projectName?.trim() || null,
        ownerOrgUnitId: payload.ownerOrgUnitId ? this.toBigInt(payload.ownerOrgUnitId) : null,
        managerUserId: payload.managerUserId ? this.toBigInt(payload.managerUserId) : null,
        totalBudget: this.toDecimal(payload.totalBudget) ?? new Prisma.Decimal(0),
        reservedAmount: new Prisma.Decimal(0),
        usedAmount: new Prisma.Decimal(0),
        paidAmount: new Prisma.Decimal(0),
        remarks: payload.remarks?.trim() || null,
        statusCode: payload.statusCode?.trim() || 'ACTIVE',
        createdBy: this.toBigInt(currentUser.id),
        isDeleted: false,
      },
      select: { id: true },
    });

    return { id: String(created.id) };
  }

  async updateTeacherAccount(
    currentUser: CurrentUserProfile,
    id: string,
    payload: {
      accountCode: string;
      accountName: string;
      categoryName: string;
      projectId?: string;
      projectName?: string;
      ownerOrgUnitId?: string;
      managerUserId?: string;
      totalBudget: number;
      remarks?: string;
      statusCode?: string;
    },
  ) {
    this.assertTeacher(currentUser);
    const existing = await this.prisma.fundAccount.findFirst({
      where: { id: this.toBigInt(id), isDeleted: false },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('项目台账不存在');

    await this.prisma.fundAccount.update({
      where: { id: this.toBigInt(id) },
      data: {
        accountCode: payload.accountCode.trim(),
        accountName: payload.accountName.trim(),
        categoryName: payload.categoryName.trim(),
        projectId: payload.projectId?.trim() || null,
        projectName: payload.projectName?.trim() || null,
        ownerOrgUnitId: payload.ownerOrgUnitId ? this.toBigInt(payload.ownerOrgUnitId) : null,
        managerUserId: payload.managerUserId ? this.toBigInt(payload.managerUserId) : null,
        totalBudget: this.toDecimal(payload.totalBudget) ?? undefined,
        remarks: payload.remarks?.trim() || null,
        statusCode: payload.statusCode?.trim() || undefined,
      },
    });

    return null;
  }

  async getOverview(currentUser: CurrentUserProfile, dataScopeContext: DataScopeContext) {
    const accountWhere = { AND: [{ isDeleted: false }, this.buildAccountScopeWhere(dataScopeContext)] } satisfies Prisma.FundAccountWhereInput;
    const applicationWhere = this.buildApplicationScopeWhere(dataScopeContext);

    const [accounts, pendingApprovalCount, latestApplications] = await this.prisma.$transaction([
      this.prisma.fundAccount.findMany({
        where: accountWhere,
        include: {
          ownerOrgUnit: true,
          manager: true,
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 6,
      }),
      this.prisma.wfApprovalInstance.count({
        where: {
          businessType: ApprovalBusinessType.FUND_REQUEST,
          status: ApprovalStatus.PENDING,
          OR: [
            { currentApproverUserId: this.toBigInt(currentUser.id) },
            {
              currentApproverUserId: null,
              currentApproverRoleCode: currentUser.activeRole.roleCode,
            },
          ],
        },
      }),
      this.prisma.fundApplication.findMany({
        where: applicationWhere,
        include: {
          applicant: true,
          account: {
            include: {
              ownerOrgUnit: true,
              manager: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 8,
      }),
    ]);

    const summary = accounts.reduce(
      (acc, item) => {
        acc.totalBudget += this.toNumber(item.totalBudget) ?? 0;
        acc.reservedAmount += this.toNumber(item.reservedAmount) ?? 0;
        acc.usedAmount += this.toNumber(item.usedAmount) ?? 0;
        acc.paidAmount += this.toNumber(item.paidAmount) ?? 0;
        return acc;
      },
      { totalBudget: 0, reservedAmount: 0, usedAmount: 0, paidAmount: 0 },
    );

    return {
      ...summary,
      availableAmount: Number((summary.totalBudget - summary.reservedAmount - summary.usedAmount).toFixed(2)),
      pendingApprovalCount,
      accountCards: accounts.map((item) => this.mapAccount(item)),
      latestApplications: latestApplications.map((item) => this.mapApplication(item)),
      recentExpensePlaceholder: [
        {
          label: '最近支出占位',
          value: latestApplications.length ? `最近 ${latestApplications.length} 条支出已就绪` : '暂无最近支出数据',
        },
        {
          label: '设备维修联动',
          value: '维修类费用可通过 relatedBusinessType = REPAIR_ORDER 建立关联',
        },
      ],
    };
  }

  async listAccounts(dataScopeContext: DataScopeContext) {
    const items = await this.prisma.fundAccount.findMany({
      where: {
        AND: [{ isDeleted: false }, this.buildAccountScopeWhere(dataScopeContext)],
      },
      include: {
        ownerOrgUnit: true,
        manager: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    return items.map((item) => this.mapAccount(item));
  }

  async listFinanceUserOptions(_currentUser: CurrentUserProfile, dataScopeContext: DataScopeContext) {
    const baseWhere = {
      isDeleted: false,
      statusCode: 'ACTIVE',
    } satisfies Prisma.SysUserWhereInput;

    let where: Prisma.SysUserWhereInput = baseWhere;

    switch (dataScopeContext.scope) {
      case DataScope.ALL:
        where = baseWhere;
        break;
      case DataScope.DEPT_PROJECT:
        where = {
          ...baseWhere,
          member: {
            orgUnitId: { in: dataScopeContext.departmentAndDescendantIds.map((id) => this.toBigInt(id)) },
          },
        };
        break;
      case DataScope.GROUP_PROJECT:
        where = {
          ...baseWhere,
          ...(dataScopeContext.groupId
            ? {
                member: {
                  orgUnitId: this.toBigInt(dataScopeContext.groupId),
                },
              }
            : {}),
        };
        break;
      case DataScope.SELF_PARTICIPATE:
      default:
        where = {
          ...baseWhere,
          id: { in: [...new Set(dataScopeContext.selfUserIds)].map((id) => this.toBigInt(id)) },
        };
        break;
    }

    const users = await this.prisma.sysUser.findMany({
      where,
      select: { id: true, displayName: true },
      orderBy: [{ displayName: 'asc' }],
      take: 200,
    });

    return users.map((user) => ({ id: String(user.id), label: user.displayName }));
  }

  async listApplications(query: FundApplicationQueryDto, dataScopeContext: DataScopeContext) {
    const pagination = normalizePagination(query);
    const clauses: Prisma.FundApplicationWhereInput[] = [this.buildApplicationScopeWhere(dataScopeContext)];

    if (query.statusCode) {
      clauses.push({ statusCode: query.statusCode });
    }
    if (query.paymentStatus) {
      clauses.push({ paymentStatus: query.paymentStatus });
    }
    if (query.expenseType) {
      clauses.push({ expenseType: query.expenseType });
    }
    if (query.accountId) {
      clauses.push({ accountId: this.toBigInt(query.accountId) });
    }
    if (pagination.keyword) {
      clauses.push({
        OR: [
          { applicationNo: { contains: pagination.keyword } },
          { title: { contains: pagination.keyword } },
          { purpose: { contains: pagination.keyword } },
          { projectName: { contains: pagination.keyword } },
          { account: { accountName: { contains: pagination.keyword } } },
          { applicant: { displayName: { contains: pagination.keyword } } },
        ],
      });
    }

    const where = { AND: clauses } satisfies Prisma.FundApplicationWhereInput;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.fundApplication.findMany({
        where,
        include: {
          applicant: true,
          account: {
            include: {
              ownerOrgUnit: true,
              manager: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.fundApplication.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapApplication(item)),
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    };
  }

  async getApplicationDetail(id: string, dataScopeContext: DataScopeContext) {
    const record = await this.prisma.fundApplication.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        applicant: true,
        account: {
          include: {
            ownerOrgUnit: true,
            manager: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('经费申请不存在');
    }

    this.ensureApplicationVisible(record, dataScopeContext);

    return {
      ...this.mapApplication(record),
      purpose: record.purpose,
      paymentRemark: record.paymentRemark,
      statusLogs: this.readStatusLogs(record.statusLogs),
      attachments: this.readAttachments(record.attachments),
      account: {
        id: String(record.account.id),
        accountCode: record.account.accountCode,
        accountName: record.account.accountName,
        statusCode: record.account.statusCode,
        projectId: record.account.projectId,
        projectName: record.account.projectName,
        categoryName: record.account.categoryName,
        totalBudget: this.toNumber(record.account.totalBudget) ?? 0,
        reservedAmount: this.toNumber(record.account.reservedAmount) ?? 0,
        usedAmount: this.toNumber(record.account.usedAmount) ?? 0,
        paidAmount: this.toNumber(record.account.paidAmount) ?? 0,
        availableAmount: this.resolveAvailableAmount(record.account),
      },
    };
  }

  async createApplication(
    currentUser: CurrentUserProfile,
    payload: CreateFundApplicationDto,
    dataScopeContext: DataScopeContext,
  ) {
    const account = await this.prisma.fundAccount.findUnique({
      where: { id: this.toBigInt(payload.accountId) },
      include: {
        ownerOrgUnit: true,
        manager: true,
      },
    });

    if (!account || account.isDeleted) {
      throw new NotFoundException('经费账户不存在');
    }

    this.ensureAccountVisible(account, dataScopeContext);

    if (account.statusCode !== 'ACTIVE') {
      throw new BadRequestException('当前经费账户不可提交费用申请');
    }

    if (
      (payload.relatedBusinessType && !payload.relatedBusinessId) ||
      (!payload.relatedBusinessType && payload.relatedBusinessId)
    ) {
      throw new BadRequestException('关联业务类型与关联业务单号必须同时传入');
    }

    if (payload.reimbursementAmount !== undefined && payload.reimbursementAmount > payload.amount) {
      throw new BadRequestException('报销金额不能大于申请金额');
    }

    if (payload.relatedBusinessType === ApprovalBusinessType.REPAIR_ORDER && payload.relatedBusinessId) {
      const repair = await this.prisma.assetDeviceRepair.findUnique({
        where: { id: this.toBigInt(payload.relatedBusinessId) },
      });

      if (!repair) {
        throw new BadRequestException('关联的维修工单不存在');
      }
    }

    const availableAmount = this.resolveAvailableAmount(account);
    if (payload.amount > availableAmount) {
      throw new BadRequestException(`预算不足，当前可用余额为 ${availableAmount.toFixed(2)}`);
    }

    const submitForApproval = payload.submitForApproval !== false;
    const threshold = await this.getReimbursementMaterialThreshold();
    const reimbursementBaseAmount = payload.reimbursementAmount ?? payload.amount;
    const requiresReimbursementMaterials =
      payload.applicationType === 'REIMBURSEMENT' && reimbursementBaseAmount > threshold;

    if (submitForApproval && requiresReimbursementMaterials) {
      const orderCount = payload.orderAttachmentFileIds?.length ?? 0;
      const invoiceCount = payload.invoiceAttachmentFileIds?.length ?? 0;
      const goodsCount = payload.goodsAttachmentFileIds?.length ?? 0;

      if (!orderCount || !invoiceCount || !goodsCount) {
        throw new BadRequestException('报销金额超过阈值，订单截图/发票截图/实物截图为必填');
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const application = await tx.fundApplication.create({
        data: {
          applicationNo: `FUND-${Date.now()}`,
          accountId: account.id,
          applicantUserId: this.toBigInt(currentUser.id),
          applicantRoleCode: currentUser.activeRole.roleCode,
          applicationType: payload.applicationType,
          expenseType: payload.expenseType,
          title: payload.title.trim(),
          purpose: payload.purpose.trim(),
          amount: this.toDecimal(payload.amount)!,
          reimbursementAmount: this.toDecimal(payload.reimbursementAmount),
          payeeName: payload.payeeName?.trim() || null,
          projectId: payload.projectId?.trim() || account.projectId || null,
          projectName: payload.projectName?.trim() || account.projectName || null,
          relatedBusinessType: payload.relatedBusinessType?.trim() || null,
          relatedBusinessId: payload.relatedBusinessId?.trim() || null,
          statusCode: FundApplicationStatus.DRAFT,
          paymentStatus: FundPaymentStatus.UNPAID,
          latestResult: submitForApproval ? '经费申请已创建' : '草稿已保存',
          ...(payload.attachments?.length ? { attachments: this.toAttachmentJson(payload.attachments) } : {}),
          statusLogs: this.appendStatusLog(null, {
            actionType: 'APPLICATION_CREATED',
            fromStatus: null,
            toStatus: FundApplicationStatus.DRAFT,
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: payload.purpose.trim(),
          }),
          createdBy: this.toBigInt(currentUser.id),
        },
      });

      if (Array.isArray(payload.attachmentFileIds) && payload.attachmentFileIds.length) {
        await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
          businessType: ApprovalBusinessType.FUND_REQUEST,
          businessId: String(application.id),
          usageType: FinanceService.ATTACHMENT_USAGE_FUND_VOUCHER,
          fileIds: payload.attachmentFileIds,
        });
      }

      if (Array.isArray(payload.orderAttachmentFileIds) && payload.orderAttachmentFileIds.length) {
        await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
          businessType: ApprovalBusinessType.FUND_REQUEST,
          businessId: String(application.id),
          usageType: FinanceService.ATTACHMENT_USAGE_REIMBURSE_ORDER,
          fileIds: payload.orderAttachmentFileIds,
        });
      }

      if (Array.isArray(payload.invoiceAttachmentFileIds) && payload.invoiceAttachmentFileIds.length) {
        await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
          businessType: ApprovalBusinessType.FUND_REQUEST,
          businessId: String(application.id),
          usageType: FinanceService.ATTACHMENT_USAGE_REIMBURSE_INVOICE,
          fileIds: payload.invoiceAttachmentFileIds,
        });
      }

      if (Array.isArray(payload.goodsAttachmentFileIds) && payload.goodsAttachmentFileIds.length) {
        await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
          businessType: ApprovalBusinessType.FUND_REQUEST,
          businessId: String(application.id),
          usageType: FinanceService.ATTACHMENT_USAGE_REIMBURSE_GOODS,
          fileIds: payload.goodsAttachmentFileIds,
        });
      }

      if (!submitForApproval) {
        return application;
      }

      await tx.fundAccount.update({
        where: { id: account.id },
        data: {
          reservedAmount: this.toDecimal((this.toNumber(account.reservedAmount) ?? 0) + payload.amount)!,
        },
      });

      const approval = await this.approvalService.startBusinessApproval(tx, {
        businessType: ApprovalBusinessType.FUND_REQUEST,
        businessId: String(application.id),
        title: `${payload.expenseType} - ${payload.title.trim()}`,
        applicantUserId: this.toBigInt(currentUser.id),
        applicantRoleCode: currentUser.activeRole.roleCode,
        formData: {
          applicationNo: application.applicationNo,
          accountCode: account.accountCode,
          accountName: account.accountName,
          applicationType: payload.applicationType,
          expenseType: payload.expenseType,
          title: payload.title.trim(),
          amount: payload.amount,
          projectId: payload.projectId?.trim() || account.projectId || null,
          projectName: payload.projectName?.trim() || account.projectName || null,
          relatedBusinessType: payload.relatedBusinessType?.trim() || null,
          relatedBusinessId: payload.relatedBusinessId?.trim() || null,
          payeeName: payload.payeeName?.trim() || null,
        },
      });

      await tx.fundApplication.update({
        where: { id: application.id },
        data: {
          approvalInstanceId: approval.id,
          statusCode: FundApplicationStatus.IN_APPROVAL,
          latestResult: '费用申请已提交审批',
          submittedAt: new Date(),
          statusLogs: this.appendStatusLog(application.statusLogs, {
            actionType: 'APPROVAL_SUBMITTED',
            fromStatus: FundApplicationStatus.DRAFT,
            toStatus: FundApplicationStatus.IN_APPROVAL,
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: '已进入审批中心',
          }),
        },
      });

      return application;
    });

    return this.getApplicationDetail(String(created.id), dataScopeContext);
  }

  private normalizeFileIds(fileIds: string[] | undefined) {
    return [...new Set((fileIds ?? []).map((id) => id.trim()).filter(Boolean))];
  }

  private async countBoundAttachments(params: { businessType: string; businessId: string; usageType: string }) {
    return this.prisma.sysFileLink.count({
      where: {
        businessType: params.businessType,
        businessId: params.businessId,
        usageType: params.usageType,
      },
    });
  }

  private async ensureReimbursementMaterialsIfNeeded(params: {
    businessId: string;
    baseAmount: number;
    threshold: number;
  }) {
    if (params.baseAmount <= params.threshold) {
      return;
    }

    const [orderCount, invoiceCount, goodsCount] = await Promise.all([
      this.countBoundAttachments({
        businessType: ApprovalBusinessType.FUND_REQUEST,
        businessId: params.businessId,
        usageType: FinanceService.ATTACHMENT_USAGE_REIMBURSE_ORDER,
      }),
      this.countBoundAttachments({
        businessType: ApprovalBusinessType.FUND_REQUEST,
        businessId: params.businessId,
        usageType: FinanceService.ATTACHMENT_USAGE_REIMBURSE_INVOICE,
      }),
      this.countBoundAttachments({
        businessType: ApprovalBusinessType.FUND_REQUEST,
        businessId: params.businessId,
        usageType: FinanceService.ATTACHMENT_USAGE_REIMBURSE_GOODS,
      }),
    ]);

    if (!orderCount || !invoiceCount || !goodsCount) {
      throw new BadRequestException('报销金额超过阈值，订单截图/发票截图/实物截图为必填');
    }
  }

  async updateApplication(
    currentUser: CurrentUserProfile,
    id: string,
    payload: UpdateFundApplicationDto,
    dataScopeContext: DataScopeContext,
  ) {
    const record = await this.prisma.fundApplication.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        applicant: true,
        account: {
          include: {
            ownerOrgUnit: true,
            manager: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('经费申请不存在');
    }

    this.ensureApplicationVisible(record, dataScopeContext);

    if (String(record.applicantUserId) !== currentUser.id) {
      throw new ForbiddenException('仅申请人可编辑该申请');
    }

    const editableStatuses = new Set([FundApplicationStatus.DRAFT, FundApplicationStatus.RETURNED]);
    if (!editableStatuses.has(record.statusCode as FundApplicationStatus)) {
      throw new BadRequestException('当前状态不可编辑');
    }

    const disallowAmountUpdate = String(record.statusCode) === FundApplicationStatus.RETURNED;
    if (disallowAmountUpdate && (payload.amount != null || payload.reimbursementAmount != null)) {
      throw new BadRequestException('退回补充材料状态不允许修改金额，请仅补充材料后重新提交');
    }

    const updateData: Prisma.FundApplicationUpdateInput = {};
    if (payload.title != null) updateData.title = payload.title.trim();
    if (payload.purpose != null) updateData.purpose = payload.purpose.trim();
    if (payload.expenseType != null && !disallowAmountUpdate) updateData.expenseType = payload.expenseType;
    if (payload.payeeName != null) updateData.payeeName = payload.payeeName.trim() || null;

    if (payload.amount != null) {
      const availableAmount = this.resolveAvailableAmount(record.account);
      if (payload.amount > availableAmount) {
        throw new BadRequestException(`预算不足，当前可用余额为 ${availableAmount.toFixed(2)}`);
      }
      updateData.amount = this.toDecimal(payload.amount)!;
    }

    if (payload.reimbursementAmount != null) {
      updateData.reimbursementAmount = this.toDecimal(payload.reimbursementAmount);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.fundApplication.update({
        where: { id: record.id },
        data: {
          ...updateData,
          latestResult: record.statusCode === FundApplicationStatus.RETURNED ? '已补充材料' : '草稿已更新',
          statusLogs: this.appendStatusLog(record.statusLogs, {
            actionType: 'APPLICATION_UPDATED',
            fromStatus: record.statusCode,
            toStatus: record.statusCode,
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: '更新申请内容/材料',
          }),
        },
      });

      const generic = this.normalizeFileIds(payload.attachmentFileIds);
      if (generic.length) {
        await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
          businessType: ApprovalBusinessType.FUND_REQUEST,
          businessId: String(record.id),
          usageType: FinanceService.ATTACHMENT_USAGE_FUND_VOUCHER,
          fileIds: generic,
        });
      }

      const order = this.normalizeFileIds(payload.orderAttachmentFileIds);
      if (order.length) {
        await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
          businessType: ApprovalBusinessType.FUND_REQUEST,
          businessId: String(record.id),
          usageType: FinanceService.ATTACHMENT_USAGE_REIMBURSE_ORDER,
          fileIds: order,
        });
      }

      const invoice = this.normalizeFileIds(payload.invoiceAttachmentFileIds);
      if (invoice.length) {
        await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
          businessType: ApprovalBusinessType.FUND_REQUEST,
          businessId: String(record.id),
          usageType: FinanceService.ATTACHMENT_USAGE_REIMBURSE_INVOICE,
          fileIds: invoice,
        });
      }

      const goods = this.normalizeFileIds(payload.goodsAttachmentFileIds);
      if (goods.length) {
        await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
          businessType: ApprovalBusinessType.FUND_REQUEST,
          businessId: String(record.id),
          usageType: FinanceService.ATTACHMENT_USAGE_REIMBURSE_GOODS,
          fileIds: goods,
        });
      }
    });

    return this.getApplicationDetail(id, dataScopeContext);
  }

  async submitApplication(
    currentUser: CurrentUserProfile,
    id: string,
    payload: UpdateFundApplicationDto,
    dataScopeContext: DataScopeContext,
  ) {
    const record = await this.prisma.fundApplication.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        applicant: true,
        account: {
          include: {
            ownerOrgUnit: true,
            manager: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('经费申请不存在');
    }

    this.ensureApplicationVisible(record, dataScopeContext);

    if (String(record.applicantUserId) !== currentUser.id) {
      throw new ForbiddenException('仅申请人可提交该申请');
    }

    if (![FundApplicationStatus.DRAFT, FundApplicationStatus.RETURNED].includes(record.statusCode as FundApplicationStatus)) {
      throw new BadRequestException('当前状态不可提交审批');
    }

    const threshold = await this.getReimbursementMaterialThreshold();

    // Bind any newly uploaded files first, then validate bound state.
    await this.updateApplication(currentUser, id, payload, dataScopeContext);

    const refreshed = await this.prisma.fundApplication.findUnique({
      where: { id: this.toBigInt(id) },
      select: { amount: true, reimbursementAmount: true },
    });

    const baseAmount =
      (refreshed?.reimbursementAmount ? Number(refreshed.reimbursementAmount.toString()) : null) ??
      (refreshed ? Number(refreshed.amount.toString()) : Number(record.amount.toString()));

    await this.ensureReimbursementMaterialsIfNeeded({ businessId: id, baseAmount, threshold });

    if (record.approvalInstanceId) {
      // Returned -> resubmit approval instance.
      await this.approvalService.resubmit(currentUser, String(record.approvalInstanceId), {
        comment: '已补充材料，重新提交审批',
      });
      return this.getApplicationDetail(id, dataScopeContext);
    }

    const availableAmount = this.resolveAvailableAmount(record.account);
    if (Number(record.amount.toString()) > availableAmount) {
      throw new BadRequestException(`预算不足，当前可用余额为 ${availableAmount.toFixed(2)}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.fundAccount.update({
        where: { id: record.accountId },
        data: {
          reservedAmount: this.toDecimal((this.toNumber(record.account.reservedAmount) ?? 0) + Number(record.amount.toString()))!,
        },
      });

      const approval = await this.approvalService.startBusinessApproval(tx, {
        businessType: ApprovalBusinessType.FUND_REQUEST,
        businessId: id,
        title: `${record.expenseType} - ${record.title}`,
        applicantUserId: this.toBigInt(currentUser.id),
        applicantRoleCode: currentUser.activeRole.roleCode,
        formData: {
          applicationNo: record.applicationNo,
          accountCode: record.account.accountCode,
          accountName: record.account.accountName,
          applicationType: record.applicationType,
          expenseType: record.expenseType,
          title: record.title,
          amount: Number(record.amount.toString()),
          projectId: record.projectId,
          projectName: record.projectName,
          relatedBusinessType: record.relatedBusinessType,
          relatedBusinessId: record.relatedBusinessId,
          payeeName: record.payeeName,
        },
      });

      await tx.fundApplication.update({
        where: { id: record.id },
        data: {
          approvalInstanceId: approval.id,
          statusCode: FundApplicationStatus.IN_APPROVAL,
          latestResult: '费用申请已提交审批',
          submittedAt: new Date(),
          statusLogs: this.appendStatusLog(record.statusLogs, {
            actionType: 'APPROVAL_SUBMITTED',
            fromStatus: record.statusCode,
            toStatus: FundApplicationStatus.IN_APPROVAL,
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: '已进入审批中心',
          }),
        },
      });
    });

    return this.getApplicationDetail(id, dataScopeContext);
  }

  async listLaborApplications(
    currentUser: CurrentUserProfile,
    query: LaborApplicationQueryDto,
    dataScopeContext: DataScopeContext,
  ) {
    const pagination = normalizePagination(query);
    const clauses: Prisma.FundLaborApplicationWhereInput[] = [{ isDeleted: false }, this.buildLaborScopeWhere(dataScopeContext)];

    if (query.statusCode) {
      clauses.push({ statusCode: query.statusCode });
    }

    if (pagination.keyword) {
      clauses.push({
        OR: [
          { laborNo: { contains: pagination.keyword } },
          { title: { contains: pagination.keyword } },
          { reason: { contains: pagination.keyword } },
          { applicant: { displayName: { contains: pagination.keyword } } },
          { targetUser: { displayName: { contains: pagination.keyword } } },
        ],
      });
    }

    const where = { AND: clauses } satisfies Prisma.FundLaborApplicationWhereInput;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.fundLaborApplication.findMany({
        where,
        include: {
          applicant: true,
          targetUser: true,
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.fundLaborApplication.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapLaborApplication(item)),
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    };
  }

  async getLaborApplicationDetail(currentUser: CurrentUserProfile, id: string, dataScopeContext: DataScopeContext) {
    const record = await this.prisma.fundLaborApplication.findFirst({
      where: {
        AND: [{ id: this.toBigInt(id) }, { isDeleted: false }, this.buildLaborScopeWhere(dataScopeContext)],
      },
      include: {
        applicant: true,
        targetUser: true,
      },
    });

    if (!record) {
      throw new NotFoundException('劳务记录不存在');
    }

    // For SELF_PARTICIPATE, the where clause already restricts to (applicant/target).
    // For management scopes, ensure data range doesn't expand to unrelated users.
    if (
      dataScopeContext.scope !== DataScope.ALL &&
      dataScopeContext.scope !== DataScope.SELF_PARTICIPATE &&
      ![currentUser.id].includes(String(record.applicantUserId)) &&
      ![currentUser.id].includes(String(record.targetUserId))
    ) {
      // ok: record fetched within buildLaborScopeWhere based on applicant org unit.
    }

    return this.mapLaborApplication(record);
  }

  async createLaborApplication(
    currentUser: CurrentUserProfile,
    payload: CreateLaborApplicationDto,
    dataScopeContext: DataScopeContext,
  ) {
    const submitForApproval = payload.submitForApproval !== false;

    // Basic access: applicant is always self; visibility is enforced by buildLaborScopeWhere later.
    const targetUser = await this.prisma.sysUser.findUnique({
      where: { id: this.toBigInt(payload.targetUserId) },
      select: { id: true, isDeleted: true, statusCode: true },
    });

    if (!targetUser || targetUser.isDeleted || String(targetUser.statusCode) !== 'ACTIVE') {
      throw new BadRequestException('劳务发放对象不存在或不可用');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const record = await tx.fundLaborApplication.create({
        data: {
          laborNo: `LABOR-${Date.now()}`,
          laborType: payload.laborType.trim(),
          applicantUserId: this.toBigInt(currentUser.id),
          targetUserId: this.toBigInt(payload.targetUserId),
          title: payload.title.trim(),
          reason: payload.reason.trim(),
          amount: this.toDecimal(payload.amount)!,
          statusCode: 'DRAFT',
          latestResult: submitForApproval ? '劳务申请已创建' : '草稿已保存',
          statusLogs: this.appendStatusLog(null, {
            actionType: 'LABOR_CREATED',
            fromStatus: null,
            toStatus: 'DRAFT',
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: payload.reason.trim(),
          }),
          createdBy: this.toBigInt(currentUser.id),
        },
        include: {
          applicant: true,
          targetUser: true,
        },
      });

      const generic = this.normalizeFileIds(payload.attachmentFileIds);
      if (generic.length) {
        await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
          businessType: ApprovalBusinessType.LABOR_APPLICATION,
          businessId: String(record.id),
          usageType: FinanceService.ATTACHMENT_USAGE_LABOR_PROOF,
          fileIds: generic,
        });
      }

      if (!submitForApproval) {
        return record;
      }

      const approval = await this.approvalService.startBusinessApproval(tx, {
        businessType: ApprovalBusinessType.LABOR_APPLICATION,
        businessId: String(record.id),
        title: `劳务 - ${record.title}`,
        applicantUserId: this.toBigInt(currentUser.id),
        applicantRoleCode: currentUser.activeRole.roleCode,
        formData: {
          laborNo: record.laborNo,
          laborType: record.laborType,
          title: record.title,
          amount: payload.amount,
          targetUserId: String(record.targetUserId),
        },
      });

      const updated = await tx.fundLaborApplication.update({
        where: { id: record.id },
        data: {
          approvalInstanceId: approval.id,
          statusCode: 'PENDING_APPROVAL',
          submittedAt: new Date(),
          latestResult: '劳务申请已提交审批',
          statusLogs: this.appendStatusLog(record.statusLogs, {
            actionType: 'LABOR_SUBMITTED',
            fromStatus: 'DRAFT',
            toStatus: 'PENDING_APPROVAL',
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: '已进入审批中心',
          }),
        },
        include: {
          applicant: true,
          targetUser: true,
        },
      });

      return updated;
    });

    // Visible check using data scope where for consistency.
    return this.getLaborApplicationDetail(currentUser, String(created.id), dataScopeContext);
  }

  async updateLaborApplication(
    currentUser: CurrentUserProfile,
    id: string,
    payload: UpdateLaborApplicationDto,
    dataScopeContext: DataScopeContext,
  ) {
    const record = await this.prisma.fundLaborApplication.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        applicant: true,
        targetUser: true,
      },
    });

    if (!record || record.isDeleted) {
      throw new NotFoundException('劳务记录不存在');
    }

    // Visibility: applicant/target always allowed; otherwise scope-based access is not granted for edit.
    const isApplicant = String(record.applicantUserId) === currentUser.id;
    if (!isApplicant) {
      throw new ForbiddenException('仅申请人可编辑劳务记录');
    }

    const editableStatuses = new Set(['DRAFT', 'RETURNED']);
    if (!editableStatuses.has(String(record.statusCode))) {
      throw new BadRequestException('当前状态不可编辑');
    }

    const disallowAmountUpdate = String(record.statusCode) === 'RETURNED';
    if (disallowAmountUpdate && payload.amount != null) {
      throw new BadRequestException('退回补充材料状态不允许修改金额，请仅补充材料后重新提交');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.fundLaborApplication.update({
        where: { id: record.id },
        data: {
          laborType: payload.laborType?.trim() || undefined,
          targetUserId: payload.targetUserId ? this.toBigInt(payload.targetUserId) : undefined,
          title: payload.title?.trim() || undefined,
          reason: payload.reason?.trim() || undefined,
          ...(payload.amount != null ? { amount: this.toDecimal(payload.amount)! } : {}),
          latestResult: String(record.statusCode) === 'RETURNED' ? '已补充材料' : '草稿已更新',
          statusLogs: this.appendStatusLog(record.statusLogs, {
            actionType: 'LABOR_UPDATED',
            fromStatus: String(record.statusCode),
            toStatus: String(record.statusCode),
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: '更新劳务记录/材料',
          }),
        },
      });

      const generic = this.normalizeFileIds(payload.attachmentFileIds);
      if (generic.length) {
        await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
          businessType: ApprovalBusinessType.LABOR_APPLICATION,
          businessId: id,
          usageType: FinanceService.ATTACHMENT_USAGE_LABOR_PROOF,
          fileIds: generic,
        });
      }
    });

    return this.getLaborApplicationDetail(currentUser, id, dataScopeContext);
  }

  async submitLaborApplication(
    currentUser: CurrentUserProfile,
    id: string,
    payload: UpdateLaborApplicationDto,
    dataScopeContext: DataScopeContext,
  ) {
    const record = await this.prisma.fundLaborApplication.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        applicant: true,
        targetUser: true,
      },
    });

    if (!record || record.isDeleted) {
      throw new NotFoundException('劳务记录不存在');
    }

    if (String(record.applicantUserId) !== currentUser.id) {
      throw new ForbiddenException('仅申请人可提交劳务记录');
    }

    if (!['DRAFT', 'RETURNED'].includes(String(record.statusCode))) {
      throw new BadRequestException('当前状态不可提交审批');
    }

    // Bind any newly uploaded proof files before submit/resubmit.
    await this.updateLaborApplication(currentUser, id, payload, dataScopeContext);

    if (record.approvalInstanceId) {
      await this.approvalService.resubmit(currentUser, String(record.approvalInstanceId), {
        comment: '已补充材料，重新提交审批',
      });
      return this.getLaborApplicationDetail(currentUser, id, dataScopeContext);
    }

    await this.prisma.$transaction(async (tx) => {
      const approval = await this.approvalService.startBusinessApproval(tx, {
        businessType: ApprovalBusinessType.LABOR_APPLICATION,
        businessId: id,
        title: `劳务 - ${record.title}`,
        applicantUserId: this.toBigInt(currentUser.id),
        applicantRoleCode: currentUser.activeRole.roleCode,
        formData: {
          laborNo: record.laborNo,
          laborType: record.laborType,
          title: record.title,
          amount: Number(record.amount.toString()),
          targetUserId: String(record.targetUserId),
        },
      });

      await tx.fundLaborApplication.update({
        where: { id: record.id },
        data: {
          approvalInstanceId: approval.id,
          statusCode: 'PENDING_APPROVAL',
          latestResult: '劳务申请已提交审批',
          submittedAt: new Date(),
          statusLogs: this.appendStatusLog(record.statusLogs, {
            actionType: 'LABOR_SUBMITTED',
            fromStatus: String(record.statusCode),
            toStatus: 'PENDING_APPROVAL',
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: '已进入审批中心',
          }),
        },
      });
    });

    return this.getLaborApplicationDetail(currentUser, id, dataScopeContext);
  }

  async createLaborPayment(
    currentUser: CurrentUserProfile,
    payload: CreateLaborPaymentDto,
    dataScopeContext: DataScopeContext,
  ) {
    this.assertTeacher(currentUser);

    const targetUser = await this.prisma.sysUser.findUnique({
      where: { id: this.toBigInt(payload.targetUserId) },
      select: { id: true, isDeleted: true, statusCode: true },
    });

    if (!targetUser || targetUser.isDeleted || String(targetUser.statusCode) !== 'ACTIVE') {
      throw new BadRequestException('劳务发放对象不存在或不可用');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const record = await tx.fundLaborApplication.create({
        data: {
          laborNo: `LABOR-${Date.now()}`,
          laborType: payload.laborType.trim(),
          applicantUserId: this.toBigInt(currentUser.id),
          targetUserId: this.toBigInt(payload.targetUserId),
          title: payload.title.trim(),
          reason: payload.reason.trim(),
          amount: this.toDecimal(payload.amount)!,
          statusCode: 'PAID',
          latestResult: '已发放',
          paidAt: new Date(),
          statusLogs: this.appendStatusLog(null, {
            actionType: 'LABOR_PAID',
            fromStatus: null,
            toStatus: 'PAID',
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: '直接发放劳务',
          }),
          createdBy: this.toBigInt(currentUser.id),
        },
        include: {
          applicant: true,
          targetUser: true,
        },
      });

      const generic = this.normalizeFileIds(payload.attachmentFileIds);
      if (generic.length) {
        await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
          businessType: ApprovalBusinessType.LABOR_APPLICATION,
          businessId: String(record.id),
          usageType: FinanceService.ATTACHMENT_USAGE_LABOR_PROOF,
          fileIds: generic,
        });
      }

      return record;
    });

    return this.getLaborApplicationDetail(currentUser, String(created.id), dataScopeContext);
  }

  async markLaborPaid(
    currentUser: CurrentUserProfile,
    id: string,
    payload: MarkLaborPaidDto,
    dataScopeContext: DataScopeContext,
  ) {
    this.assertTeacher(currentUser);

    const record = await this.prisma.fundLaborApplication.findFirst({
      where: {
        AND: [{ id: this.toBigInt(id) }, { isDeleted: false }, this.buildLaborScopeWhere(dataScopeContext)],
      },
      include: {
        applicant: true,
        targetUser: true,
      },
    });

    if (!record) {
      throw new NotFoundException('劳务记录不存在');
    }

    if (String(record.statusCode) !== 'APPROVED') {
      throw new BadRequestException('当前劳务记录不可发放');
    }

    await this.prisma.fundLaborApplication.update({
      where: { id: record.id },
      data: {
        statusCode: 'PAID',
        paidAt: new Date(),
        latestResult: payload.remark?.trim() || '已发放',
        statusLogs: this.appendStatusLog(record.statusLogs, {
          actionType: 'LABOR_PAID',
          fromStatus: String(record.statusCode),
          toStatus: 'PAID',
          operatorUserId: currentUser.id,
          operatorName: currentUser.displayName,
          comment: payload.remark?.trim() || '发放完成',
        }),
      },
    });

    return this.getLaborApplicationDetail(currentUser, id, dataScopeContext);
  }

  async markPayment(
    currentUser: CurrentUserProfile,
    id: string,
    payload: MarkFundPaymentDto,
    dataScopeContext: DataScopeContext,
  ) {
    const record = await this.prisma.fundApplication.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        applicant: true,
        account: {
          include: {
            ownerOrgUnit: true,
            manager: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('经费申请不存在');
    }

    this.ensureApplicationVisible(record, dataScopeContext);

    if (record.statusCode !== FundApplicationStatus.APPROVED || record.paymentStatus === FundPaymentStatus.PAID) {
      throw new BadRequestException('当前申请不可执行支付');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.fundApplication.update({
        where: { id: record.id },
        data: {
          statusCode: FundApplicationStatus.PAID,
          paymentStatus: FundPaymentStatus.PAID,
          paymentRemark: payload.paymentRemark?.trim() || null,
          paidAt: new Date(),
          latestResult: '款项已支付',
          statusLogs: this.appendStatusLog(record.statusLogs, {
            actionType: 'PAYMENT_CONFIRMED',
            fromStatus: record.statusCode,
            toStatus: FundApplicationStatus.PAID,
            operatorUserId: currentUser.id,
            operatorName: currentUser.displayName,
            comment: payload.paymentRemark?.trim() || '支付完成',
          }),
        },
      });

      await tx.fundAccount.update({
        where: { id: record.accountId },
        data: {
          paidAmount: this.toDecimal((this.toNumber(record.account.paidAmount) ?? 0) + (this.toNumber(record.amount) ?? 0))!,
          lastExpenseAt: new Date(),
        },
      });
    });

    return this.getApplicationDetail(id, dataScopeContext);
  }

  async getProjectDetail(projectId: string, dataScopeContext: DataScopeContext) {
    const [accounts, applications] = await this.prisma.$transaction([
      this.prisma.fundAccount.findMany({
        where: {
          AND: [{ isDeleted: false }, this.buildAccountScopeWhere(dataScopeContext), { projectId }],
        },
        include: {
          ownerOrgUnit: true,
          manager: true,
        },
        orderBy: [{ updatedAt: 'desc' }],
      }),
      this.prisma.fundApplication.findMany({
        where: {
          AND: [this.buildApplicationScopeWhere(dataScopeContext), { projectId }],
        },
        include: {
          applicant: true,
          account: {
            include: {
              ownerOrgUnit: true,
              manager: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 20,
      }),
    ]);

    const projectName = accounts[0]?.projectName ?? applications[0]?.projectName ?? null;
    const summary = accounts.reduce(
      (acc, item) => {
        acc.totalBudget += this.toNumber(item.totalBudget) ?? 0;
        acc.reservedAmount += this.toNumber(item.reservedAmount) ?? 0;
        acc.usedAmount += this.toNumber(item.usedAmount) ?? 0;
        acc.paidAmount += this.toNumber(item.paidAmount) ?? 0;
        return acc;
      },
      { totalBudget: 0, reservedAmount: 0, usedAmount: 0, paidAmount: 0 },
    );

    const linkedRepairIds = applications
      .filter((item) => item.relatedBusinessType === ApprovalBusinessType.REPAIR_ORDER && item.relatedBusinessId)
      .map((item) => this.toBigInt(item.relatedBusinessId!));

    const linkedRepairs =
      linkedRepairIds.length > 0
        ? await this.prisma.assetDeviceRepair.findMany({
            where: {
              id: { in: linkedRepairIds },
            },
            include: {
              device: true,
            },
          })
        : [];

    return {
      projectId,
      projectName,
      ...summary,
      availableAmount: Number((summary.totalBudget - summary.reservedAmount - summary.usedAmount).toFixed(2)),
      accountCards: accounts.map((item) => this.mapAccount(item)),
      applications: applications.map((item) => this.mapApplication(item)),
      linkedRepairs: linkedRepairs.map((item) => ({
        id: String(item.id),
        repairNo: item.repairNo,
        deviceName: item.device.deviceName,
        amount: item.requestedAmount ? Number(item.requestedAmount.toString()) : null,
        fundLinkCode: item.fundLinkCode,
        statusCode: item.statusCode,
      })),
    };
  }

  private mapAccount(item: AccountRecord) {
    return {
      id: String(item.id),
      accountCode: item.accountCode,
      accountName: item.accountName,
      statusCode: item.statusCode,
      projectId: item.projectId,
      projectName: item.projectName,
      categoryName: item.categoryName,
      ownerOrgUnitId: item.ownerOrgUnitId ? String(item.ownerOrgUnitId) : null,
      ownerOrgUnitName: item.ownerOrgUnit?.unitName ?? null,
      managerUserId: item.managerUserId ? String(item.managerUserId) : null,
      managerUserName: item.manager?.displayName ?? null,
      totalBudget: this.toNumber(item.totalBudget) ?? 0,
      reservedAmount: this.toNumber(item.reservedAmount) ?? 0,
      usedAmount: this.toNumber(item.usedAmount) ?? 0,
      paidAmount: this.toNumber(item.paidAmount) ?? 0,
      availableAmount: this.resolveAvailableAmount(item),
      lastExpenseAt: item.lastExpenseAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private mapApplication(item: ApplicationRecord) {
    return {
      id: String(item.id),
      applicationNo: item.applicationNo,
      accountId: String(item.accountId),
      accountName: item.account.accountName,
      projectId: item.projectId,
      projectName: item.projectName,
      applicationType: item.applicationType,
      expenseType: item.expenseType,
      title: item.title,
      amount: this.toNumber(item.amount) ?? 0,
      reimbursementAmount: this.toNumber(item.reimbursementAmount),
      statusCode: item.statusCode,
      paymentStatus: item.paymentStatus,
      applicantUserId: String(item.applicantUserId),
      applicantName: item.applicant.displayName,
      applicantRoleCode: item.applicantRoleCode,
      payeeName: item.payeeName,
      relatedBusinessType: item.relatedBusinessType,
      relatedBusinessId: item.relatedBusinessId,
      approvalInstanceId: item.approvalInstanceId ? String(item.approvalInstanceId) : null,
      latestResult: item.latestResult,
      submittedAt: item.submittedAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
      paidAt: item.paidAt?.toISOString() ?? null,
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private mapLaborApplication(item: LaborApplicationRecord) {
    return {
      id: String(item.id),
      laborNo: item.laborNo,
      laborType: item.laborType,
      title: item.title,
      reason: item.reason,
      amount: this.toNumber(item.amount) ?? 0,
      statusCode: item.statusCode,
      latestResult: item.latestResult,
      applicantUserId: String(item.applicantUserId),
      applicantName: item.applicant.displayName,
      targetUserId: String(item.targetUserId),
      targetUserName: item.targetUser.displayName,
      approvalInstanceId: item.approvalInstanceId ? String(item.approvalInstanceId) : null,
      submittedAt: item.submittedAt?.toISOString() ?? null,
      paidAt: item.paidAt?.toISOString() ?? null,
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private buildAccountScopeWhere(dataScopeContext: DataScopeContext): Prisma.FundAccountWhereInput {
    switch (dataScopeContext.scope) {
      case DataScope.ALL:
        return {};
      case DataScope.DEPT_PROJECT:
        return {
          OR: [
            { ownerOrgUnitId: { in: dataScopeContext.departmentAndDescendantIds.map((id) => this.toBigInt(id)) } },
            { managerUserId: this.toBigInt(dataScopeContext.userId) },
            { createdBy: this.toBigInt(dataScopeContext.userId) },
          ],
        };
      case DataScope.GROUP_PROJECT:
      case DataScope.SELF_PARTICIPATE:
      default:
        return {
          OR: [
            ...(dataScopeContext.groupId ? [{ ownerOrgUnitId: this.toBigInt(dataScopeContext.groupId) }] : []),
            { managerUserId: this.toBigInt(dataScopeContext.userId) },
            { createdBy: this.toBigInt(dataScopeContext.userId) },
          ],
        };
    }
  }

  private buildApplicationScopeWhere(dataScopeContext: DataScopeContext): Prisma.FundApplicationWhereInput {
    switch (dataScopeContext.scope) {
      case DataScope.ALL:
        return {};
      case DataScope.DEPT_PROJECT:
        return {
          OR: [
            { account: { ownerOrgUnitId: { in: dataScopeContext.departmentAndDescendantIds.map((id) => this.toBigInt(id)) } } },
            { applicantUserId: this.toBigInt(dataScopeContext.userId) },
          ],
        };
      case DataScope.GROUP_PROJECT:
        return {
          OR: [
            ...(dataScopeContext.groupId ? [{ account: { ownerOrgUnitId: this.toBigInt(dataScopeContext.groupId) } }] : []),
            { applicantUserId: this.toBigInt(dataScopeContext.userId) },
          ],
        };
      case DataScope.SELF_PARTICIPATE:
      default:
        return { applicantUserId: this.toBigInt(dataScopeContext.userId) };
    }
  }

  private buildLaborScopeWhere(dataScopeContext: DataScopeContext): Prisma.FundLaborApplicationWhereInput {
    const currentUserId = this.toBigInt(dataScopeContext.userId);

    switch (dataScopeContext.scope) {
      case DataScope.ALL:
        return {};
      case DataScope.DEPT_PROJECT:
        return {
          OR: [
            {
              applicant: {
                member: {
                  orgUnitId: { in: dataScopeContext.departmentAndDescendantIds.map((id) => this.toBigInt(id)) },
                },
              },
            },
            { applicantUserId: currentUserId },
            { targetUserId: currentUserId },
          ],
        };
      case DataScope.GROUP_PROJECT:
        return {
          OR: [
            ...(dataScopeContext.groupId
              ? [
                  {
                    applicant: {
                      member: {
                        orgUnitId: this.toBigInt(dataScopeContext.groupId),
                      },
                    },
                  },
                ]
              : []),
            { applicantUserId: currentUserId },
            { targetUserId: currentUserId },
          ],
        };
      case DataScope.SELF_PARTICIPATE:
      default:
        return {
          OR: [{ applicantUserId: currentUserId }, { targetUserId: currentUserId }],
        };
    }
  }

  private ensureAccountVisible(record: { ownerOrgUnitId: bigint | null; managerUserId?: bigint | null; createdBy?: bigint | null }, dataScopeContext: DataScopeContext) {
    if (dataScopeContext.scope === DataScope.ALL) {
      return;
    }
    if (record.managerUserId && String(record.managerUserId) === dataScopeContext.userId) {
      return;
    }
    if (record.createdBy && String(record.createdBy) === dataScopeContext.userId) {
      return;
    }
    if (
      dataScopeContext.scope === DataScope.DEPT_PROJECT &&
      record.ownerOrgUnitId &&
      dataScopeContext.departmentAndDescendantIds.includes(String(record.ownerOrgUnitId))
    ) {
      return;
    }
    if (record.ownerOrgUnitId && dataScopeContext.groupId && String(record.ownerOrgUnitId) === dataScopeContext.groupId) {
      return;
    }
    throw new ForbiddenException('当前数据范围不可访问该经费账户');
  }

  private ensureApplicationVisible(record: ApplicationRecord, dataScopeContext: DataScopeContext) {
    if (String(record.applicantUserId) === dataScopeContext.userId) {
      return;
    }
    this.ensureAccountVisible(record.account, dataScopeContext);
  }

  private resolveAvailableAmount(item: { totalBudget: Prisma.Decimal; reservedAmount: Prisma.Decimal; usedAmount: Prisma.Decimal }) {
    return Number(
      (
        (this.toNumber(item.totalBudget) ?? 0) -
        (this.toNumber(item.reservedAmount) ?? 0) -
        (this.toNumber(item.usedAmount) ?? 0)
      ).toFixed(2),
    );
  }

  private appendStatusLog(raw: Prisma.JsonValue | null, entry: Omit<FundStatusLog, 'createdAt'>): Prisma.InputJsonValue {
    const list = this.readStatusLogs(raw);
    list.push({
      ...entry,
      createdAt: new Date().toISOString(),
    });
    return list as Prisma.InputJsonValue;
  }

  private readStatusLogs(raw: Prisma.JsonValue | null) {
    if (!Array.isArray(raw)) {
      return [] as FundStatusLog[];
    }
    return raw.filter((item): item is FundStatusLog => typeof item === 'object' && item !== null);
  }

  private readAttachments(raw: Prisma.JsonValue | null) {
    if (!Array.isArray(raw)) {
      return [] as Array<{
        storageKey: string;
        fileName: string;
        downloadUrl: string;
        mimeType: string | null;
        size: number | null;
      }>;
    }

    return (raw as Array<Record<string, unknown>>)
      .filter((item) => typeof item === 'object' && item !== null)
      .map((item) => ({
        storageKey: this.readStringValue(item.storageKey),
        fileName: this.readStringValue(item.fileName),
        downloadUrl: this.readStringValue(item.downloadUrl),
        mimeType: this.readNullableStringValue(item.mimeType),
        size: typeof item.size === 'number' ? item.size : null,
      }))
      .filter((item) => item.storageKey && item.fileName && item.downloadUrl);
  }

  private toAttachmentJson(
    attachments: Array<{
      storageKey: string;
      fileName: string;
      downloadUrl: string;
      mimeType?: string;
      size?: number;
    }>,
  ) {
    return attachments.map((item) => ({
      storageKey: item.storageKey.trim(),
      fileName: item.fileName.trim(),
      downloadUrl: item.downloadUrl.trim(),
      mimeType: item.mimeType?.trim() || null,
      size: item.size ?? null,
    })) as Prisma.InputJsonValue;
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

  private readStringValue(value: unknown) {
    return typeof value === 'string' ? value : '';
  }

  private readNullableStringValue(value: unknown) {
    return typeof value === 'string' ? value : null;
  }
}
