import type { Page } from '@playwright/test';
import { ApprovalCenterTab, ApprovalStatus } from '@smw/shared';

function buildAuthUser(username: string) {
  return {
    id: '2',
    username,
    displayName: 'User',
    statusCode: 'ACTIVE',
    activeRole: {
      roleCode: 'TEACHER',
      roleName: '指导教师',
      dataScope: 'ALL',
    },
    roleOptions: [],
    permissions: ['SYSTEM:VIEW', 'NOTIFICATION:VIEW', 'PROFILE:VIEW', 'APPROVAL:VIEW'],
    forcePasswordChange: false,
    orgProfile: null,
    dataScopeContext: {
      scope: 'ALL',
      userId: '2',
      orgUnitId: null,
      departmentId: null,
      departmentAndDescendantIds: [],
      groupId: null,
      selfUserIds: ['2'],
      participatingUserIds: ['2'],
    },
    dashboard: {
      todoCount: 2,
      shortcutEntries: [],
    },
  };
}

export function persistedAuthState(username = 'e2e_teacher') {
  return JSON.stringify({
    token: 'mock-token',
    user: buildAuthUser(username),
  });
}

export async function mockLoginApis(page: Page, username: string) {
  const authUser = buildAuthUser(username);

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: {
          token: 'mock-token',
          user: authUser,
        },
      },
    });
  });

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: authUser,
      },
    });
  });
}

export async function mockDashboardApis(page: Page, username = 'e2e_teacher') {
  await mockLoginApis(page, username);

  await page.route('**/api/dashboard/home', async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: {
          roleName: '指导教师驾驶舱',
          metricCards: [
            {
              code: 'pendingApproval',
              title: 'Pending',
              value: 2,
              unit: '',
              description: 'Need review',
              path: '/workflow/approval-center',
            },
          ],
          todoSummary: {
            pendingApprovalCount: 2,
            unreadNotificationCount: 1,
            myApplicationCount: 3,
            qualificationReminderCount: 0,
          },
          shortcutGroups: [
            {
              code: 'main',
              title: 'Main',
              entries: [{ code: 'approval', label: 'Approval Center', path: '/workflow/approval-center' }],
            },
          ],
          pendingApprovals: [{ id: '1001', title: 'Fund Request #1', currentNodeName: '部长审批' }],
          myApplications: [{ id: '1002', title: 'Repair #1', status: 'IN_APPROVAL' }],
          notifications: [
            {
              id: 'n-1',
              title: 'Approval Assigned',
              read: false,
              categoryCode: 'APPROVAL',
              routePath: '/workflow/approval-center',
              routeQuery: { focus: '1001' },
            },
          ],
        },
      },
    });
  });

  await page.route('**/api/notifications/n-1/read', async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: { success: true },
      },
    });
  });

  await page.route('**/api/notifications**', async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: {
          unreadCount: 1,
          total: 1,
          list: [
            {
              id: 'n-1',
              title: 'Approval Assigned',
              content: 'Please review',
              categoryCode: 'APPROVAL',
              levelCode: 'INFO',
              read: false,
              routePath: '/workflow/approval-center',
              routeQuery: { focus: '1001' },
              createdAt: new Date().toISOString(),
            },
          ],
        },
      },
    });
  });

  await mockApprovalCenterApis(page);
}

type ApprovalAction = 'approve' | 'reject';

type MockApprovalItem = {
  id: string;
  businessType: string;
  businessId: string;
  title: string;
  status: ApprovalStatus;
  applicantUserId: string;
  applicantName: string;
  applicantRoleCode: string | null;
  currentNodeName: string | null;
  currentApproverRoleCode: string | null;
  currentApproverUserId: string | null;
  latestComment: string | null;
  createdAt: string;
  updatedAt: string;
};

type MockApprovalLog = {
  id: string;
  actionType: string;
  nodeKey: string | null;
  nodeName: string | null;
  actorUserId: string;
  actorName: string;
  actorRoleCode: string | null;
  targetUserId: string | null;
  targetUserName: string | null;
  comment: string | null;
  createdAt: string;
};

function buildDetail(item: MockApprovalItem, logs: MockApprovalLog[]) {
  const availableActions =
    item.status === ApprovalStatus.PENDING
      ? (['approve', 'reject', 'return', 'comment'] as const)
      : (['comment'] as const);

  return {
    ...item,
    formData: { amount: 1200, reason: 'e2e approval flow' },
    businessSnapshot: { project: 'P0-workflow', requester: item.applicantName },
    logs,
    availableActions,
  };
}

export async function mockApprovalCenterApis(page: Page) {
  const now = new Date();
  const record: MockApprovalItem = {
    id: '1001',
    businessType: 'FUND_REQUEST',
    businessId: 'FR-001',
    title: 'Fund Request #1',
    status: ApprovalStatus.PENDING,
    applicantUserId: '4',
    applicantName: 'Member A',
    applicantRoleCode: 'MEMBER',
    currentNodeName: '部长审批',
    currentApproverRoleCode: 'MINISTER',
    currentApproverUserId: '2',
    latestComment: null,
    createdAt: new Date(now.getTime() - 3600_000).toISOString(),
    updatedAt: now.toISOString(),
  };

  const logs: MockApprovalLog[] = [
    {
      id: 'log-submit',
      actionType: 'SUBMIT',
      nodeKey: 'submit',
      nodeName: '提交申请',
      actorUserId: '4',
      actorName: 'Member A',
      actorRoleCode: 'MEMBER',
      targetUserId: null,
      targetUserName: null,
      comment: 'please approve',
      createdAt: new Date(now.getTime() - 3500_000).toISOString(),
    },
  ];

  function mutate(action: ApprovalAction, comment: string) {
    record.status = action === 'approve' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    record.latestComment = comment || null;
    record.currentNodeName = null;
    record.currentApproverRoleCode = null;
    record.currentApproverUserId = null;
    record.updatedAt = new Date().toISOString();
    logs.unshift({
      id: `log-${action}-${Date.now()}`,
      actionType: action.toUpperCase(),
      nodeKey: 'review',
      nodeName: '审批处理',
      actorUserId: '2',
      actorName: 'Teacher Approver',
      actorRoleCode: 'TEACHER',
      targetUserId: null,
      targetUserName: null,
      comment: comment || null,
      createdAt: new Date().toISOString(),
    });
  }

  await page.route('**/api/approval-center?*', async (route) => {
    const url = new URL(route.request().url());
    const tab = (url.searchParams.get('tab') ?? ApprovalCenterTab.PENDING) as ApprovalCenterTab;
    const pageNumber = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10);
    const matchesTab =
      (tab === ApprovalCenterTab.PENDING && record.status === ApprovalStatus.PENDING) ||
      (tab === ApprovalCenterTab.PROCESSED &&
        (record.status === ApprovalStatus.APPROVED || record.status === ApprovalStatus.REJECTED)) ||
      (tab === ApprovalCenterTab.RETURNED && record.status === ApprovalStatus.RETURNED);
    const items = matchesTab ? [record] : [];

    await route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: {
          items,
          meta: {
            page: pageNumber,
            pageSize,
            total: items.length,
          },
        },
      },
    });
  });

  await page.route('**/api/approval-center/*/approve', async (route) => {
    const body = route.request().postDataJSON() as { comment?: string };
    mutate('approve', body?.comment ?? '');
    await route.fulfill({
      json: { code: 0, message: 'ok', data: { success: true } },
    });
  });

  await page.route('**/api/approval-center/*/reject', async (route) => {
    const body = route.request().postDataJSON() as { comment?: string };
    mutate('reject', body?.comment ?? '');
    await route.fulfill({
      json: { code: 0, message: 'ok', data: { success: true } },
    });
  });

  await page.route('**/api/approval-center/*/comment', async (route) => {
    const body = route.request().postDataJSON() as { comment?: string };
    logs.unshift({
      id: `log-comment-${Date.now()}`,
      actionType: 'COMMENT',
      nodeKey: 'comment',
      nodeName: '补充说明',
      actorUserId: '2',
      actorName: 'Teacher Approver',
      actorRoleCode: 'TEACHER',
      targetUserId: null,
      targetUserName: null,
      comment: body?.comment ?? '',
      createdAt: new Date().toISOString(),
    });
    await route.fulfill({
      json: { code: 0, message: 'ok', data: { success: true } },
    });
  });

  await page.route('**/api/approval-center/*', async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        message: 'ok',
        data: buildDetail(record, logs),
      },
    });
  });
}

