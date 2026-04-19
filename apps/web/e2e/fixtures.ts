import type { Page } from '@playwright/test';

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

export async function mockDashboardApis(page: Page, username: string) {
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
}

