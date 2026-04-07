import { PermissionCodes } from '@smw/shared';
import { useAuthStore } from '@web/stores/auth';
import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';

import { resolveAuthNavigation } from './guard';

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    breadcrumb?: string[];
    requiresAuth?: boolean;
    permissions?: string[];
    allowFirstLoginBypass?: boolean;
    homeVariant?: string;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'auth.login',
    component: () => import('@web/views/LoginPage.vue'),
    meta: {
      title: '登录',
      requiresAuth: false,
      allowFirstLoginBypass: true,
    },
  },
  {
    path: '/change-password',
    name: 'auth.change-password',
    component: () => import('@web/views/ChangePasswordPage.vue'),
    meta: {
      title: '修改密码',
      requiresAuth: true,
      allowFirstLoginBypass: true,
      permissions: [PermissionCodes.authChangePassword],
    },
  },
  {
    path: '/',
    component: () => import('@web/layouts/AdminLayout.vue'),
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'system.dashboard',
        component: () => import('@web/views/DashboardPage.vue'),
        meta: {
          title: '驾驶舱',
          breadcrumb: ['驾驶舱'],
          permissions: [PermissionCodes.systemDashboardView],
        },
      },
      {
        path: 'workflow/approval-center',
        name: 'workflow.approval-center',
        component: () => import('@web/views/ApprovalCenterPage.vue'),
        meta: {
          title: '统一审批中心',
          breadcrumb: ['流程中心', '统一审批中心'],
          permissions: [PermissionCodes.approvalCenterView],
        },
      },
      {
        path: 'workflow/demo-request',
        name: 'workflow.demo-request',
        component: () => import('@web/views/DemoApprovalRequestPage.vue'),
        meta: {
          title: '测试审批单',
          breadcrumb: ['流程中心', '测试审批单'],
          permissions: [PermissionCodes.approvalCreate],
        },
      },
      {
        path: 'system/health',
        name: 'system.health',
        component: () => import('@web/views/HealthCheckPage.vue'),
        meta: {
          title: '系统健康',
          breadcrumb: ['系统基础', '系统健康'],
          permissions: [PermissionCodes.systemHealthView],
        },
      },
      {
        path: 'system/examples',
        name: 'system.examples',
        component: () => import('@web/views/ExampleListPage.vue'),
        meta: {
          title: '成员示例',
          breadcrumb: ['系统基础', '成员示例'],
          permissions: [PermissionCodes.memberListView],
        },
      },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (!authStore.initialized) {
    await authStore.initialize();
  }

  return resolveAuthNavigation(to, {
    isAuthenticated: authStore.isAuthenticated,
    initialized: authStore.initialized,
    forcePasswordChange: authStore.forcePasswordChange,
    permissions: authStore.permissions,
  });
});
