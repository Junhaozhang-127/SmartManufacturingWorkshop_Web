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
        path: 'org/overview',
        name: 'org.overview',
        component: () => import('@web/views/OrgOverviewPage.vue'),
        meta: {
          title: '组织架构总览',
          breadcrumb: ['组织成员', '组织架构总览'],
          permissions: [PermissionCodes.orgTreeView],
        },
      },
      {
        path: 'members/archive',
        name: 'members.archive',
        component: () => import('@web/views/MemberArchiveListPage.vue'),
        meta: {
          title: '成员档案',
          breadcrumb: ['组织成员', '成员档案'],
          permissions: [PermissionCodes.memberListView],
        },
      },
      {
        path: 'members/archive/:id',
        name: 'members.detail',
        component: () => import('@web/views/MemberArchiveDetailPage.vue'),
        meta: {
          title: '成员档案详情',
          breadcrumb: ['组织成员', '成员档案', '详情'],
          permissions: [PermissionCodes.memberListView],
        },
      },
      {
        path: 'members/regularization',
        name: 'members.regularization',
        component: () => import('@web/views/MemberRegularizationPage.vue'),
        meta: {
          title: '实习转正管理',
          breadcrumb: ['组织成员', '实习转正'],
          permissions: [PermissionCodes.memberListView],
        },
      },
      {
        path: 'members/transfers',
        name: 'members.transfers',
        component: () => import('@web/views/FeatureReservedPage.vue'),
        meta: {
          title: '调岗预留',
          breadcrumb: ['组织成员', '调岗预留'],
          permissions: [PermissionCodes.memberListView],
        },
      },
      {
        path: 'members/exits',
        name: 'members.exits',
        component: () => import('@web/views/FeatureReservedPage.vue'),
        meta: {
          title: '退出预留',
          breadcrumb: ['组织成员', '退出预留'],
          permissions: [PermissionCodes.memberListView],
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
