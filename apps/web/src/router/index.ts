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
          title: '系统驾驶舱',
          breadcrumb: ['系统驾驶舱'],
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
        path: 'inventory/ledger',
        name: 'inventory.ledger',
        component: () => import('@web/views/InventoryLedgerPage.vue'),
        meta: {
          title: '耗材库存台账',
          breadcrumb: ['库存管理', '耗材库存'],
          permissions: [PermissionCodes.inventoryView],
        },
      },
      {
        path: 'inventory/requests',
        name: 'inventory.requests',
        component: () => import('@web/views/InventoryRequestPage.vue'),
        meta: {
          title: '耗材申领与出入库',
          breadcrumb: ['库存管理', '申领与出入库'],
          permissions: [PermissionCodes.inventoryView],
        },
      },
      {
        path: 'devices/ledger',
        name: 'devices.ledger',
        component: () => import('@web/views/DeviceLedgerPage.vue'),
        meta: {
          title: '设备台账',
          breadcrumb: ['设备资产', '设备台账'],
          permissions: [PermissionCodes.deviceView],
        },
      },
      {
        path: 'devices/repairs',
        name: 'devices.repairs',
        component: () => import('@web/views/DeviceRepairPage.vue'),
        meta: {
          title: '维修报修工单',
          breadcrumb: ['设备资产', '维修报修'],
          permissions: [PermissionCodes.deviceRepairView],
        },
      },
      {
        path: 'competitions/library',
        name: 'competitions.library',
        component: () => import('@web/views/CompetitionLibraryPage.vue'),
        meta: {
          title: '赛事库与报名',
          breadcrumb: ['竞赛成果', '赛事库与报名'],
          permissions: [PermissionCodes.competitionView],
        },
      },
      {
        path: 'achievements',
        name: 'achievements.list',
        component: () => import('@web/views/AchievementListPage.vue'),
        meta: {
          title: '成果列表',
          breadcrumb: ['竞赛成果', '成果列表'],
          permissions: [PermissionCodes.achievementView],
        },
      },
      {
        path: 'achievements/new',
        name: 'achievements.create',
        component: () => import('@web/views/AchievementFormPage.vue'),
        meta: {
          title: '成果录入',
          breadcrumb: ['竞赛成果', '成果录入'],
          permissions: [PermissionCodes.achievementCreate],
        },
      },
      {
        path: 'achievements/:id/edit',
        name: 'achievements.edit',
        component: () => import('@web/views/AchievementFormPage.vue'),
        meta: {
          title: '成果编辑',
          breadcrumb: ['竞赛成果', '成果编辑'],
          permissions: [PermissionCodes.achievementUpdate],
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
