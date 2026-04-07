import { type CurrentUserProfile,DataScope, RoleCode } from '@smw/shared';

import type { PrismaService } from '../prisma/prisma.service';
import { SystemService } from './system.service';

describe('SystemService', () => {
  const currentUser: CurrentUserProfile = {
    id: '5',
    username: 'member01',
    displayName: '成员A',
    statusCode: 'ACTIVE',
    activeRole: {
      roleCode: RoleCode.MEMBER,
      roleName: '正式成员',
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
      todoCount: 2,
      shortcutEntries: [{ code: 'PROFILE' as never, label: '个人中心', path: '/profile' }],
    },
  };

  function createService() {
    const notification = {
      id: 1n,
      userId: 5n,
      title: '测试通知',
      content: '需要查看的业务通知',
      categoryCode: 'APPROVAL',
      levelCode: 'INFO',
      businessType: 'DEMO_REQUEST',
      businessId: '11',
      routePath: '/workflow/approval-center',
      routeQuery: { focus: '11' },
      readAt: null,
      createdAt: new Date('2026-04-07T09:00:00Z'),
      updatedAt: new Date('2026-04-07T09:00:00Z'),
      createdBy: 4n,
      isDeleted: false,
    };

    const prisma = {
      wfApprovalInstance: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 11n,
            businessType: 'DEMO_REQUEST',
            businessId: '11',
            title: '测试审批',
            status: 'PENDING',
            applicantUserId: 5n,
            applicantRoleCode: 'MEMBER',
            currentNodeName: '组长审批',
            currentApproverRoleCode: 'GROUP_LEADER',
            currentApproverUserId: null,
            latestComment: null,
            createdAt: new Date('2026-04-07T08:00:00Z'),
            updatedAt: new Date('2026-04-07T09:00:00Z'),
            applicant: { displayName: '成员A' },
            currentApprover: null,
          },
        ]),
        count: jest.fn().mockResolvedValue(2),
      },
      sysNotification: {
        findMany: jest.fn().mockResolvedValue([notification]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(notification),
        update: jest.fn().mockResolvedValue({ ...notification, readAt: new Date('2026-04-07T10:00:00Z') }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      fundAccount: {
        findMany: jest.fn().mockResolvedValue([{ projectId: 'PRJ-001' }]),
      },
      fundApplication: {
        findMany: jest.fn().mockResolvedValue([{ projectId: 'PRJ-002' }]),
      },
      achvAchievement: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ projectId: 'PRJ-003' }]),
      },
      compTeam: {
        findMany: jest.fn().mockResolvedValue([{ projectId: 'PRJ-004' }]),
      },
      invConsumableRequest: {
        findMany: jest.fn().mockResolvedValue([{ projectId: 'PRJ-005' }]),
      },
      invConsumable: {
        count: jest.fn().mockResolvedValue(1),
      },
      evalScheme: {
        findFirst: jest.fn().mockResolvedValue({
          id: 99n,
          ruleConfig: {
            qualification: {
              MEMBER_TO_GROUP_LEADER: {
                minimumTotalScore: 85,
                minimumAchievementCount: 1,
                minimumProjectCount: 1,
              },
            },
          },
        }),
      },
      evalScoreRecord: {
        count: jest.fn().mockResolvedValue(1),
      },
      memberProfile: {
        findMany: jest.fn().mockResolvedValue([{ userId: 5n }]),
      },
      sysUser: {
        findUnique: jest.fn().mockResolvedValue({
          id: 5n,
          username: 'member01',
          displayName: '成员A',
          mobile: '13800000005',
          email: 'member01@lab.local',
          statusCode: 'ACTIVE',
          lastLoginAt: new Date('2026-04-07T08:00:00Z'),
          passwordChangedAt: new Date('2026-04-07T08:30:00Z'),
          isDeleted: false,
          userRoles: [],
          member: null,
        }),
      },
      $transaction: jest.fn().mockImplementation((items: Promise<unknown>[]) => Promise.all(items)),
    };

    return {
      prisma,
      service: new SystemService(prisma as unknown as PrismaService),
    };
  }

  it('builds member dashboard cards and aggregates notifications', async () => {
    const { service } = createService();

    const result = await service.getHomeDashboard(currentUser);

    expect(result.metricCards).toHaveLength(5);
    expect(result.metricCards[0]?.title).toBe('我的项目');
    expect(result.todoSummary.unreadNotificationCount).toBe(1);
    expect(result.notifications[0]?.title).toBe('测试通知');
  });

  it('marks notification as read for current user', async () => {
    const { service, prisma } = createService();

    const result = await service.markNotificationAsRead(currentUser, '1');

    expect(prisma.sysNotification.update).toHaveBeenCalled();
    expect(result.read).toBe(true);
  });
});
