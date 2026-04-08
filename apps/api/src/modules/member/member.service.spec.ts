import { BadRequestException } from '@nestjs/common';
import { type CurrentUserProfile, DataScope, type DataScopeContext } from '@smw/shared';

import type { ApprovalService } from '../approval/approval.service';
import type { EvaluationPromotionService } from '../evaluation-promotion/evaluation-promotion.service';
import type { PrismaService } from '../prisma/prisma.service';
import { MemberService } from './member.service';

describe('MemberService', () => {
  const currentUser: CurrentUserProfile = {
    id: '5',
    username: 'member01',
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
        username: 'member01',
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
      startBusinessApproval: jest.fn(),
    };

    const evaluationPromotionService = {
      buildMemberPromotionSnapshot: jest.fn(),
      buildMemberProjectAndRewardSnapshot: jest.fn(),
    };

    return new MemberService(
      prisma as unknown as PrismaService,
      approvalService as unknown as ApprovalService,
      evaluationPromotionService as unknown as EvaluationPromotionService,
    );
  }

  it('blocks regularization when planned date is earlier than internship start date', async () => {
    const service = createService();

    await expect(
      service.createRegularization(currentUser, dataScopeContext, {
        memberProfileId: '101',
        internshipStartDate: '2026-04-10',
        plannedRegularDate: '2026-04-01',
        applicationReason: '日期校验',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('builds department-scoped org tree from the current department root', async () => {
    const service = createService();
    const prisma = (service as unknown as { prisma: {
      orgUnit: { findMany: jest.Mock };
      memberProfile: { findMany: jest.Mock };
    } }).prisma;

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
