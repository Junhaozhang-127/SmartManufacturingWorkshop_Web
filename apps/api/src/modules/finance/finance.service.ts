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
import type { FundApplicationQueryDto } from './dto/fund-application-query.dto';
import type { MarkFundPaymentDto } from './dto/mark-fund-payment.dto';

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

  private assertTeacher(currentUser: CurrentUserProfile) {
    if (![RoleCode.TEACHER, RoleCode.MINISTER].includes(currentUser.activeRole.roleCode)) {
      throw new ForbiddenException('仅部长及以上身份可管理项目台账');
    }
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
          latestResult: '经费申请已创建',
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
          usageType: 'FUND_VOUCHER',
          fileIds: payload.attachmentFileIds,
        });
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
