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
        path: 'profile',
        name: 'profile.index',
        component: () => import('@web/views/PersonalCenterPage.vue'),
        meta: {
          title: '个人中心',
          breadcrumb: ['个人中心'],
          permissions: [PermissionCodes.profileView],
        },
      },
      {
        path: 'notifications',
        name: 'notifications.index',
        component: () => import('@web/views/NotificationPage.vue'),
        meta: {
          title: '通知公告',
          breadcrumb: ['通知公告'],
          permissions: [PermissionCodes.notificationView],
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
          title: '成员转正管理',
          breadcrumb: ['组织成员', '成员转正'],
          permissions: [PermissionCodes.memberListView],
        },
      },
      {
        path: 'evaluation/scores',
        name: 'evaluation.scores',
        component: () => import('@web/views/EvaluationScorePage.vue'),
        meta: {
          title: '考核评分与结果',
          breadcrumb: ['组织成员', '考核评分与结果'],
          permissions: [PermissionCodes.evaluationView],
        },
      },
      {
        path: 'promotion/eligibility',
        name: 'promotion.eligibility',
        component: () => import('@web/views/PromotionEligibilityPage.vue'),
        meta: {
          title: '晋升资格看板',
          breadcrumb: ['组织成员', '晋升资格看板'],
          permissions: [PermissionCodes.promotionView],
        },
      },
      {
        path: 'promotion/applications',
        name: 'promotion.applications',
        component: () => import('@web/views/PromotionApplicationPage.vue'),
        meta: {
          title: '晋升申请与评审',
          breadcrumb: ['组织成员', '晋升申请与评审'],
          permissions: [PermissionCodes.promotionView],
        },
      },
      {
        path: 'funds/overview',
        name: 'funds.overview',
        component: () => import('@web/views/FundOverviewPage.vue'),
        meta: {
          title: '经费总览',
          breadcrumb: ['经费管理', '经费总览'],
          permissions: [PermissionCodes.fundView],
        },
      },
      {
        path: 'funds/applications',
        name: 'funds.applications',
        component: () => import('@web/views/FundApplicationPage.vue'),
        meta: {
          title: '费用申请与报销',
          breadcrumb: ['经费管理', '费用申请与报销'],
          permissions: [PermissionCodes.fundCreate],
        },
      },
      {
        path: 'projects/:projectId',
        name: 'projects.detail',
        component: () => import('@web/views/ProjectFundDetailPage.vue'),
        meta: {
          title: '项目详情',
          breadcrumb: ['项目详情'],
          permissions: [PermissionCodes.fundView],
        },
      },
      {
        path: 'inventory/ledger',
        name: 'inventory.ledger',
        component: () => import('@web/views/InventoryLedgerPage.vue'),
        meta: {
          title: '耗材库存台账',
          breadcrumb: ['库存管理', '耗材库存台账'],
          permissions: [PermissionCodes.inventoryView],
        },
      },
      {
        path: 'inventory/requests',
        name: 'inventory.requests',
        component: () => import('@web/views/InventoryRequestPage.vue'),
        meta: {
          title: '耗材领用申请',
          breadcrumb: ['库存管理', '耗材领用申请'],
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
          title: '竞赛项目库',
          breadcrumb: ['竞赛成果', '竞赛项目库'],
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
        path: 'system/configuration',
        name: 'system.configuration',
        component: () => import('@web/views/SystemConfigPage.vue'),
        meta: {
          title: '字典与基础配置',
          breadcrumb: ['系统基础', '字典与基础配置'],
          permissions: [PermissionCodes.systemConfigView],
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
