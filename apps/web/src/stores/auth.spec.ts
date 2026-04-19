import { randomUUID } from 'node:crypto';

import { DataScope, RoleCode } from '@smw/shared';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from './auth';

vi.mock('@web/api/auth', () => ({
  login: vi.fn(() => ({
    data: {
      token: 'token-1',
      user: {
        id: '1',
        username: 'user',
        displayName: '用户',
        statusCode: 'ACTIVE',
        activeRole: { roleCode: RoleCode.TEACHER, roleName: '老师', dataScope: DataScope.ALL },
        roleOptions: [{ roleCode: RoleCode.TEACHER, roleName: '老师', dataScope: DataScope.ALL }],
        permissions: ['SYSTEM:VIEW'],
        forcePasswordChange: false,
        orgProfile: {
          orgUnitId: null,
          orgUnitName: null,
          departmentId: null,
          departmentName: null,
          groupId: null,
          groupName: null,
          positionCode: null,
        },
        dataScopeContext: {
          scope: DataScope.ALL,
          userId: '1',
          orgUnitId: null,
          departmentId: null,
          departmentAndDescendantIds: [],
          groupId: null,
          selfUserIds: ['1'],
          participatingUserIds: ['1'],
        },
        dashboard: {
          todoCount: 1,
          shortcutEntries: [],
        },
      },
    },
  })),
  fetchCurrentUser: vi.fn(() => ({
    data: {
      id: '1',
      username: 'user',
      displayName: '用户',
      statusCode: 'ACTIVE',
      activeRole: { roleCode: RoleCode.TEACHER, roleName: '老师', dataScope: DataScope.ALL },
      roleOptions: [{ roleCode: RoleCode.TEACHER, roleName: '老师', dataScope: DataScope.ALL }],
      permissions: ['SYSTEM:VIEW'],
      forcePasswordChange: false,
      orgProfile: {
        orgUnitId: null,
        orgUnitName: null,
        departmentId: null,
        departmentName: null,
        groupId: null,
        groupName: null,
        positionCode: null,
      },
      dataScopeContext: {
        scope: DataScope.ALL,
        userId: '1',
        orgUnitId: null,
        departmentId: null,
        departmentAndDescendantIds: [],
        groupId: null,
        selfUserIds: ['1'],
        participatingUserIds: ['1'],
      },
      dashboard: {
        todoCount: 1,
        shortcutEntries: [],
      },
    },
  })),
  switchRole: vi.fn(() => ({
    data: {
      token: 'token-2',
      user: {
        id: '1',
        username: 'user',
        displayName: '用户',
        statusCode: 'ACTIVE',
        activeRole: {
          roleCode: RoleCode.GROUP_LEADER,
          roleName: '组长',
          dataScope: DataScope.GROUP_PROJECT,
        },
        roleOptions: [
          { roleCode: RoleCode.TEACHER, roleName: '老师', dataScope: DataScope.ALL },
          { roleCode: RoleCode.GROUP_LEADER, roleName: '组长', dataScope: DataScope.GROUP_PROJECT },
        ],
        permissions: ['SYSTEM:VIEW', 'MEMBER:VIEW'],
        forcePasswordChange: false,
        orgProfile: {
          orgUnitId: null,
          orgUnitName: null,
          departmentId: null,
          departmentName: null,
          groupId: null,
          groupName: null,
          positionCode: null,
        },
        dataScopeContext: {
          scope: DataScope.GROUP_PROJECT,
          userId: '1',
          orgUnitId: null,
          departmentId: null,
          departmentAndDescendantIds: [],
          groupId: null,
          selfUserIds: ['1'],
          participatingUserIds: ['1'],
        },
        dashboard: {
          todoCount: 2,
          shortcutEntries: [],
        },
      },
    },
  })),
  changePassword: vi.fn(() => ({ data: { success: true } })),
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('stores session after login', async () => {
    const authStore = useAuthStore();

    await authStore.login({
      username: `user_${randomUUID().slice(0, 8)}`,
      password: randomUUID(),
    });

    expect(authStore.token).toBe('token-1');
    expect(authStore.displayName).toBe('用户');
  });

  it('updates active role after switching role', async () => {
    const authStore = useAuthStore();
    await authStore.login({
      username: `user_${randomUUID().slice(0, 8)}`,
      password: randomUUID(),
    });

    await authStore.switchRole(RoleCode.GROUP_LEADER);

    expect(authStore.token).toBe('token-2');
    expect(authStore.activeRoleCode).toBe(RoleCode.GROUP_LEADER);
  });
});

