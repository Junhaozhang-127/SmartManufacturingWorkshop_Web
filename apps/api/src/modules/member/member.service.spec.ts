import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { type CurrentUserProfile, DataScope, type DataScopeContext } from '@smw/shared';

import type { ApprovalService } from '../approval/approval.service';
import type { AttachmentsService } from '../attachments/attachments.service';
import type { EvaluationPromotionService } from '../evaluation-promotion/evaluation-promotion.service';
import type { PrismaService } from '../prisma/prisma.service';
import { MemberService } from './member.service';

describe('MemberService', () => {
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
    const profile = {
      id: 101n,
      userId: 5n,
      orgUnitId: 30n,
      positionCode: 'INTERN',
      memberStatus: 'INTERN',
      mentorUserId: 8n,
      user: {
        id: 5n,
        displayName: '成员A',
        username: 'user',
        userRoles: [],
      },
      orgUnit: {
        id: 30n,
        unitName: '前端组',
        parent: null,
      },
      mentor: {
        id: 8n,
        displayName: '导师B',
      },
      growthRecords: [],
      stageEvaluations: [],
      operationLogs: [],
      isDeleted: false,
    };

    const prisma = {
      orgUnit: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      memberProfile: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(profile),
      },
      memberRegularization: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(),
    };

    const approvalService = {
      startBusinessApproval: jest.fn().mockResolvedValue({ id: '9001' }),
    };

    const attachmentsService = {
      bindAttachmentsAsSystem: jest.fn().mockResolvedValue(undefined),
      listBusinessAttachments: jest.fn().mockResolvedValue([]),
    };

    const evaluationPromotionService = {
      buildMemberPromotionSnapshot: jest.fn(),
      buildMemberProjectAndRewardSnapshot: jest.fn(),
    };

    return {
      service: new MemberService(
        prisma as unknown as PrismaService,
        approvalService as unknown as ApprovalService,
        evaluationPromotionService as unknown as EvaluationPromotionService,
        attachmentsService as unknown as AttachmentsService,
      ),
      prisma,
      approvalService,
      attachmentsService,
    };
  }

  it('blocks regularization when planned date is earlier than internship start date', async () => {
    const { service } = createService();

    await expect(
      service.createRegularization(currentUser, dataScopeContext, {
        memberProfileId: '101',
        internshipStartDate: '2026-04-10',
        plannedRegularDate: '2026-04-01',
        applicationReason: '日期校验',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('binds attachmentFileIds when creating regularization', async () => {
    const { service, prisma, attachmentsService } = createService();
    const tx = {
      memberRegularization: {
        create: jest.fn().mockResolvedValue({ id: 501n }),
        update: jest.fn().mockResolvedValue({}),
      },
      memberProfile: {
        update: jest.fn().mockResolvedValue({}),
      },
      memberGrowthRecord: {
        create: jest.fn().mockResolvedValue({}),
      },
      memberOperationLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    prisma.$transaction.mockImplementation(async (fn: (ctx: typeof tx) => Promise<unknown>) => fn(tx));
    jest.spyOn(service, 'getRegularizationDetail').mockResolvedValue({ id: '501' } as never);

    await service.createRegularization(currentUser, dataScopeContext, {
      memberProfileId: '101',
      internshipStartDate: '2026-04-01',
      plannedRegularDate: '2026-05-01',
      applicationReason: '申请转正',
      attachmentFileIds: ['11', '12'],
    });

    expect(attachmentsService.bindAttachmentsAsSystem).toHaveBeenCalledWith(
      tx,
      currentUser,
      expect.objectContaining({
        businessType: 'MEMBER_REGULARIZATION',
        businessId: '501',
        usageType: 'REGULARIZATION_PROOF',
        fileIds: ['11', '12'],
      }),
    );
  });

  it('returns attachments in regularization detail', async () => {
    const { service, attachmentsService } = createService();
    jest.spyOn(service as any, 'loadScopedRegularization').mockResolvedValue({
      id: 501n,
      applicationReason: '申请转正',
      selfAssessment: '自评',
      memberProfile: { stageEvaluations: [] },
    });
    jest.spyOn(service as any, 'mapRegularization').mockReturnValue({ id: '501' });

    attachmentsService.listBusinessAttachments.mockResolvedValue([
      { fileId: '11', originalName: '证明材料.pdf' },
    ]);

    const result = await service.getRegularizationDetail(currentUser, '501', dataScopeContext);

    expect(result.attachments).toEqual([{ fileId: '11', originalName: '证明材料.pdf' }]);
  });

  it('rejects regularization detail when attachment permission is denied', async () => {
    const { service, attachmentsService } = createService();
    jest.spyOn(service as any, 'loadScopedRegularization').mockResolvedValue({
      id: 501n,
      applicationReason: '申请转正',
      selfAssessment: null,
      memberProfile: { stageEvaluations: [] },
    });
    jest.spyOn(service as any, 'mapRegularization').mockReturnValue({ id: '501' });

    attachmentsService.listBusinessAttachments.mockRejectedValue(new ForbiddenException('denied'));

    await expect(service.getRegularizationDetail(currentUser, '501', dataScopeContext)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('builds department-scoped org tree from the current department root', async () => {
    const { service } = createService();
    const prisma = (service as unknown as {
      prisma: {
        orgUnit: { findMany: jest.Mock };
        memberProfile: { findMany: jest.Mock };
      };
    }).prisma;

    prisma.orgUnit.findMany.mockResolvedValue([
      {
        id: 10n,
        parentId: null,
        unitCode: 'LAB',
        unitName: '实验室',
        unitType: 'LAB',
        leader: { displayName: '老师' },
      },
      {
        id: 20n,
        parentId: 10n,
        unitCode: 'RD',
        unitName: '研发部',
        unitType: 'DEPARTMENT',
        leader: { displayName: '部长' },
      },
      {
        id: 30n,
        parentId: 20n,
        unitCode: 'FE',
        unitName: '前端组',
        unitType: 'GROUP',
        leader: { displayName: '组长' },
      },
    ]);
    prisma.memberProfile.findMany.mockResolvedValue([
      { orgUnitId: 20n, memberStatus: 'ACTIVE' },
      { orgUnitId: 30n, memberStatus: 'REGULARIZATION_PENDING' },
    ]);

    const result = await service.getOrgOverview({
      scope: DataScope.DEPT_PROJECT,
      userId: '4',
      orgUnitId: '20',
      departmentId: '20',
      departmentAndDescendantIds: ['20', '30'],
      groupId: null,
      selfUserIds: ['4'],
      participatingUserIds: ['4'],
    });

    expect(result.tree).toHaveLength(1);
    expect(result.tree[0].unitName).toBe('研发部');
    expect(result.tree[0].children).toHaveLength(1);
    expect(result.tree[0].children[0].unitName).toBe('前端组');
    expect(result.summary.orgUnitCount).toBe(2);
  });
});
