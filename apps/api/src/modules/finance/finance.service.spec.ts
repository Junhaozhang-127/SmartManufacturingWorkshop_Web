import { BadRequestException } from '@nestjs/common';
import {
  type CurrentUserProfile,
  DataScope,
  type DataScopeContext,
  FundApplicationStatus,
  FundPaymentStatus,
} from '@smw/shared';

import type { ApprovalService } from '../approval/approval.service';
import type { AttachmentsService } from '../attachments/attachments.service';
import type { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  const currentUser: CurrentUserProfile = {
    id: '5',
    username: 'user',
    displayName: '成员A',
    statusCode: 'ACTIVE',
    activeRole: {
      roleCode: 'MEMBER' as never,
      roleName: '成员',
      dataScope: DataScope.SELF_PARTICIPATE,
    },
    roleOptions: [],
    permissions: [],
    forcePasswordChange: false,
    orgProfile: {
      orgUnitId: '30',
      orgUnitName: '前端组',
      departmentId: '20',
      departmentName: '研发部',
      groupId: '30',
      groupName: '前端组',
      positionCode: 'MEMBER',
    },
    dataScopeContext: {
      scope: DataScope.SELF_PARTICIPATE,
      userId: '5',
      orgUnitId: '30',
      departmentId: '20',
      departmentAndDescendantIds: ['20', '30'],
      groupId: '30',
      selfUserIds: ['5'],
      participatingUserIds: ['5'],
    },
    dashboard: {
      todoCount: 0,
      shortcutEntries: [],
    },
  };

  const dataScopeContext: DataScopeContext = {
    scope: DataScope.SELF_PARTICIPATE,
    userId: '5',
    orgUnitId: '30',
    departmentId: '20',
    departmentAndDescendantIds: ['20', '30'],
    groupId: '30',
    selfUserIds: ['5'],
    participatingUserIds: ['5'],
  };

  function createService() {
    const account = {
      id: 11n,
      accountCode: 'FUND-001',
      accountName: '测试经费账户',
      statusCode: 'ACTIVE',
      categoryName: '项目预算',
      projectId: 'PRJ-001',
      projectName: '项目一',
      ownerOrgUnitId: 30n,
      managerUserId: 4n,
      totalBudget: { toString: () => '1000' },
      reservedAmount: { toString: () => '100' },
      usedAmount: { toString: () => '200' },
      paidAmount: { toString: () => '50' },
      remarks: null,
      lastExpenseAt: null,
      createdAt: new Date('2026-04-07T08:00:00Z'),
      updatedAt: new Date('2026-04-07T08:00:00Z'),
      createdBy: 4n,
      isDeleted: false,
      ownerOrgUnit: { id: 30n, unitName: '前端组' },
      manager: { id: 4n, displayName: '组长' },
    };

    const application = {
      id: 21n,
      applicationNo: 'FUND-20260407-001',
      accountId: 11n,
      applicantUserId: 5n,
      applicantRoleCode: 'MEMBER',
      applicationType: 'EXPENSE',
      expenseType: 'PROCUREMENT',
      title: '示波器采购',
      purpose: '测试用途',
      amount: { toString: () => '300' },
      reimbursementAmount: null,
      payeeName: '供应商A',
      projectId: 'PRJ-001',
      projectName: '项目一',
      relatedBusinessType: null,
      relatedBusinessId: null,
      statusCode: FundApplicationStatus.APPROVED,
      paymentStatus: FundPaymentStatus.PENDING,
      paymentRemark: null,
      latestResult: '审批通过，待支付',
      approvalInstanceId: 88n,
      attachments: null,
      statusLogs: null,
      submittedAt: new Date('2026-04-07T08:00:00Z'),
      completedAt: new Date('2026-04-07T09:00:00Z'),
      paidAt: null,
      createdAt: new Date('2026-04-07T08:00:00Z'),
      updatedAt: new Date('2026-04-07T09:00:00Z'),
      createdBy: 5n,
      applicant: {
        id: 5n,
        displayName: '成员A',
      },
      account,
    };

    const prisma = {
      fundAccount: {
        findUnique: jest.fn().mockResolvedValue(account),
        findMany: jest.fn().mockResolvedValue([account]),
        update: jest.fn().mockResolvedValue(account),
      },
      fundApplication: {
        findUnique: jest.fn().mockResolvedValue(application),
        findMany: jest.fn().mockResolvedValue([application]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(application),
        update: jest.fn().mockResolvedValue(application),
      },
      assetDeviceRepair: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      wfApprovalInstance: {
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn().mockImplementation(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (client: typeof prisma) => unknown)(prisma);
        }

        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    const approvalService = {
      startBusinessApproval: jest.fn().mockResolvedValue({ id: 88n }),
    };

    const attachmentsService = {
      bindAttachmentsAsSystem: jest.fn(),
    };

    return {
      service: new FinanceService(
        prisma as unknown as PrismaService,
        approvalService as unknown as ApprovalService,
        attachmentsService as unknown as AttachmentsService,
      ),
      prisma,
      approvalService,
    };
  }

  it('blocks application creation when available budget is insufficient', async () => {
    const { service } = createService();

    await expect(
      service.createApplication(
        currentUser,
        {
          accountId: '11',
          applicationType: 'EXPENSE',
          expenseType: 'PROCUREMENT',
          title: '超预算采购',
          purpose: '预算校验',
          amount: 900,
        },
        dataScopeContext,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks application creation when related business fields are incomplete', async () => {
    const { service } = createService();

    await expect(
      service.createApplication(
        currentUser,
        {
          accountId: '11',
          applicationType: 'EXPENSE',
          expenseType: 'PROCUREMENT',
          title: '关联业务校验',
          purpose: '只传业务类型',
          amount: 100,
          relatedBusinessType: 'REPAIR_ORDER',
        },
        dataScopeContext,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks application creation when reimbursement amount exceeds requested amount', async () => {
    const { service } = createService();

    await expect(
      service.createApplication(
        currentUser,
        {
          accountId: '11',
          applicationType: 'REIMBURSEMENT',
          expenseType: 'TRAVEL',
          title: '报销金额校验',
          purpose: '报销金额不能超过申请金额',
          amount: 100,
          reimbursementAmount: 120,
        },
        dataScopeContext,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks approved application as paid and accumulates paid amount', async () => {
    const { service, prisma } = createService();

    await service.markPayment(currentUser, '21', { paymentRemark: '财务已打款' }, dataScopeContext);

    expect(prisma.fundApplication.update).toHaveBeenCalled();
    expect(prisma.fundAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paidAmount: expect.objectContaining({
            toString: expect.any(Function),
          }),
        }),
      }),
    );
  });
});
