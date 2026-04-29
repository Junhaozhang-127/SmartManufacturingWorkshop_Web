import { PermissionCodes, RoleCode } from '@smw/shared';
import { useAuthStore } from '@web/stores/auth';
import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';

import { resolveAuthNavigation } from './guard';

const FeatureUnavailablePage: Component = {
  template: '<div style="padding:24px;text-align:center;color:#64748b;">该功能暂未开放</div>',
};

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    breadcrumb?: string[];
    activeMenu?: string;
    requiresAuth?: boolean;
    permissions?: string[];
    roles?: RoleCode[];
    allowFirstLoginBypass?: boolean;
    homeVariant?: string;
    contentType?: string;
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
    path: '/register',
    name: 'auth.register',
    component: () => import('@web/views/RegisterPage.vue'),
    meta: {
      title: '注册',
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
    path: '/portal',
    name: 'portal.home',
    component: () => import('@web/views/HomePortalPage.vue'),
    meta: {
      title: '门户首页',
      requiresAuth: false,
      allowFirstLoginBypass: true,
    },
  },
  {
    path: '/portal/achievements',
    name: 'portal.achievements',
    component: () => import('@web/views/PortalShowcasePage.vue'),
    meta: {
      title: '优秀成果展示',
      requiresAuth: false,
      allowFirstLoginBypass: true,
      contentType: 'ACHIEVEMENT',
    },
  },
  {
    path: '/portal/competitions',
    name: 'portal.competitions',
    component: () => import('@web/views/PortalShowcasePage.vue'),
    meta: {
      title: '竞赛风采',
      requiresAuth: false,
      allowFirstLoginBypass: true,
      contentType: 'COMPETITION',
    },
  },
  {
    path: '/portal/members',
    name: 'portal.members',
    component: () => import('@web/views/PortalShowcasePage.vue'),
    meta: {
      title: '成员简介',
      requiresAuth: false,
      allowFirstLoginBypass: true,
      contentType: 'MEMBER_INTRO',
    },
  },
  {
    path: '/feature-unavailable',
    name: 'feature.unavailable',
    component: FeatureUnavailablePage,
    meta: {
      requiresAuth: false,
      allowFirstLoginBypass: true,
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
          title: '工作台',
          breadcrumb: ['工作台'],
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
          breadcrumb: ['内容中心', '通知公告'],
          permissions: [PermissionCodes.notificationView],
        },
      },
      {
        path: 'org/overview',
        name: 'org.overview',
        component: () => import('@web/views/OrgOverviewPage.vue'),
        meta: {
          title: '组织架构总览',
          breadcrumb: ['组织与成员', '组织架构总览'],
          permissions: [PermissionCodes.orgTreeView],
          roles: [RoleCode.TEACHER, RoleCode.MINISTER],
        },
      },
      {
        path: 'members/archive',
        name: 'members.archive',
        component: () => import('@web/views/MemberArchiveListPage.vue'),
        meta: {
          title: '成员档案',
          breadcrumb: ['组织与成员', '成员档案'],
          permissions: [PermissionCodes.memberListView],
        },
      },
      {
        path: 'members/archive/:id',
        name: 'members.detail',
        component: () => import('@web/views/MemberArchiveDetailPage.vue'),
        meta: {
          title: '成员档案详情',
          breadcrumb: ['组织与成员', '成员档案', '详情'],
          activeMenu: '/members/archive',
          permissions: [PermissionCodes.memberListView],
        },
      },
      {
        path: 'members/regularization',
        name: 'members.regularization',
        component: () => import('@web/views/MemberRegularizationPage.vue'),
        meta: {
          title: '成员转正管理',
          breadcrumb: ['组织与成员', '成员转正'],
          permissions: [PermissionCodes.memberListView],
        },
      },
      {
        path: 'evaluation/scores',
        name: 'evaluation.scores',
        component: () => import('@web/views/EvaluationScorePage.vue'),
        meta: {
          title: '考核评分与结果',
          breadcrumb: ['考核与晋升', '考核评分'],
          permissions: [PermissionCodes.evaluationView],
        },
      },
      {
        path: 'promotion/eligibility',
        name: 'promotion.eligibility',
        redirect: (to) => ({
          name: 'promotion.manage',
          query: {
            ...to.query,
            tab: 'eligibility',
          },
        }),
      },
      {
        path: 'promotion/applications',
        name: 'promotion.applications',
        redirect: (to) => ({
          name: 'promotion.manage',
          query: {
            ...to.query,
            tab: 'applications',
          },
        }),
      },
      {
        path: 'promotion/manage',
        name: 'promotion.manage',
        component: () => import('@web/views/PromotionManagePage.vue'),
        meta: {
          title: '晋升管理',
          breadcrumb: ['考核与晋升', '晋升管理'],
          permissions: [PermissionCodes.promotionView],
          activeMenu: '/promotion/manage',
        },
      },
      {
        path: 'funds/overview',
        name: 'funds.overview',
        component: () => import('@web/views/FundOverviewPage.vue'),
        meta: {
          title: '经费总览',
          breadcrumb: ['设备与资源', '经费总览'],
          permissions: [PermissionCodes.fundView],
          roles: [RoleCode.TEACHER],
        },
      },
      {
        path: 'funds/applications',
        name: 'funds.applications',
        component: () => import('@web/views/FundApplicationPage.vue'),
        meta: {
          title: '经费申请与审批',
          breadcrumb: ['设备与资源', '经费申请与审批'],
          permissions: [PermissionCodes.fundCreate],
          activeMenu: '/funds/applications',
        },
      },
      {
        path: 'funds/labor-applications',
        name: 'funds.labor-applications',
        component: () => import('@web/views/LaborApplicationPage.vue'),
        meta: {
          title: '劳务发放',
          breadcrumb: ['设备与资源', '劳务发放'],
          permissions: [PermissionCodes.fundCreate],
          activeMenu: '/funds/labor-applications',
        },
      },
      {
        path: 'projects/:projectId',
        name: 'projects.detail',
        component: () => import('@web/views/ProjectFundDetailPage.vue'),
        meta: {
          title: '项目经费明细',
          breadcrumb: ['设备与资源', '经费总览', '项目经费明细'],
          activeMenu: '/funds/overview',
          permissions: [PermissionCodes.fundView],
        },
      },
      {
        path: 'devices/repairs',
        name: 'devices.repairs',
        component: () => import('@web/views/DeviceRepairPage.vue'),
        meta: {
          title: '设备报修工单',
          breadcrumb: ['设备与资源', '设备报修工单'],
          permissions: [PermissionCodes.deviceRepairView],
          activeMenu: '/devices/repairs',
        },
      },
      {
        path: 'competitions/library',
        name: 'competitions.library',
        component: () => import('@web/views/CompetitionLibraryPage.vue'),
        meta: {
          title: '竞赛库与报名',
          breadcrumb: ['竞赛与成果', '竞赛库与报名'],
          permissions: [PermissionCodes.competitionView],
        },
      },
      {
        path: 'achievements',
        name: 'achievements.list',
        component: () => import('@web/views/AchievementListPage.vue'),
        meta: {
          title: '成果列表',
          breadcrumb: ['竞赛与成果', '成果列表'],
          permissions: [PermissionCodes.achievementView],
        },
      },
      {
        path: 'achievements/new',
        name: 'achievements.create',
        component: () => import('@web/views/AchievementFormPage.vue'),
        meta: {
          title: '成果新增',
          breadcrumb: ['竞赛与成果', '成果列表', '新增'],
          activeMenu: '/achievements',
          permissions: [PermissionCodes.achievementCreate],
        },
      },
      {
        path: 'achievements/:id/edit',
        name: 'achievements.edit',
        component: () => import('@web/views/AchievementFormPage.vue'),
        meta: {
          title: '成果编辑',
          breadcrumb: ['竞赛与成果', '成果列表', '编辑'],
          activeMenu: '/achievements',
          permissions: [PermissionCodes.achievementUpdate],
        },
      },
      {
        path: 'achievements/:id',
        name: 'achievements.detail',
        component: () => import('@web/views/AchievementDetailPage.vue'),
        meta: {
          title: '成果详情',
          breadcrumb: ['竞赛与成果', '成果列表', '详情'],
          activeMenu: '/achievements',
          permissions: [PermissionCodes.achievementView],
        },
      },
      {
        path: 'workflow/approval-center',
        name: 'workflow.approval-center',
        component: () => import('@web/views/ApprovalCenterPage.vue'),
        meta: {
          title: '统一审批中心',
          breadcrumb: ['审批中心', '统一审批中心'],
          permissions: [PermissionCodes.approvalCenterView],
        },
      },
      {
        path: 'workflow/approval-center/creation-review',
        name: 'workflow.approval-center.creation-review',
        component: () => import('@web/views/CreationReviewPage.vue'),
        meta: {
          title: '创作审核',
          breadcrumb: ['审批中心', '创作审核'],
          permissions: [PermissionCodes.approvalCenterView],
          roles: [RoleCode.TEACHER, RoleCode.MINISTER],
          activeMenu: '/workflow/approval-center',
        },
      },
      {
        path: 'system/health',
        name: 'system.health',
        redirect: '/',
      },
      {
        path: 'system/configuration',
        name: 'system.configuration',
        component: () => import('@web/views/SystemConfigPage.vue'),
        meta: {
          title: '数据字典与配置管理',
          breadcrumb: ['系统配置', '数据字典与配置管理'],
          permissions: [PermissionCodes.systemConfigView],
          activeMenu: '/system/configuration',
        },
      },
      {
        path: 'portal/manage',
        redirect: '/dashboard/portal/manage',
      },
      {
        path: 'dashboard/portal/manage',
        name: 'portal.manage',
        component: () => import('@web/views/PortalContentManagePage.vue'),
        meta: {
          title: '首页内容管理',
          breadcrumb: ['内容中心', '首页内容管理'],
          permissions: [PermissionCodes.portalContentView],
          roles: [RoleCode.TEACHER, RoleCode.MINISTER],
          activeMenu: '/dashboard/portal/manage',
        },
      },
      {
        path: 'creation',
        name: 'creation.center',
        component: () => import('@web/views/CreationCenterPage.vue'),
        meta: {
          title: '创作中心',
          breadcrumb: ['内容中心', '创作中心'],
          permissions: [PermissionCodes.creationView],
        },
      },
      {
        path: 'creation/new',
        name: 'creation.new',
        component: () => import('@web/views/CreationEditorPage.vue'),
        meta: {
          title: '新建内容',
          breadcrumb: ['内容中心', '创作中心', '新建内容'],
          activeMenu: '/creation',
          permissions: [PermissionCodes.creationCreate],
        },
      },
      {
        path: 'creation/:id/edit',
        name: 'creation.edit',
        component: () => import('@web/views/CreationEditorPage.vue'),
        meta: {
          title: '编辑内容',
          breadcrumb: ['内容中心', '创作中心', '编辑内容'],
          activeMenu: '/creation',
          permissions: [PermissionCodes.creationUpdate],
        },
      },
      {
        path: 'creation/review',
        name: 'creation.review',
        redirect: '/workflow/approval-center/creation-review',
      },
      {
        path: 'devices/ledger',
        name: 'devices.ledger',
        component: () => import('@web/views/DeviceLedgerPage.vue'),
        meta: {
          title: '设备台账',
          breadcrumb: ['设备与资源', '设备台账'],
          permissions: [PermissionCodes.deviceRepairView],
          activeMenu: '/devices/ledger',
        },
      },
      {
        path: 'inventory/consumables',
        name: 'inventory.consumables',
        component: () => import('@web/views/InventoryConsumablesPage.vue'),
        meta: {
          title: '耗材库存',
          breadcrumb: ['设备与资源', '耗材库存'],
          permissions: [PermissionCodes.inventoryView],
          activeMenu: '/inventory/consumables',
        },
      },
      {
        path: 'teacher/projects/entry',
        name: 'teacher.projects.entry',
        component: () => import('@web/views/TeacherProjectLedgerPage.vue'),
        meta: {
          title: '项目录入',
          breadcrumb: ['项目面板', '项目录入'],
          permissions: [PermissionCodes.fundView],
          roles: [RoleCode.TEACHER, RoleCode.MINISTER],
          activeMenu: '/teacher/projects/entry',
        },
      },
      {
        path: 'teacher/projects/assign',
        name: 'teacher.projects.assign',
        component: () => import('@web/views/TeacherProjectLedgerPage.vue'),
        meta: {
          title: '项目分配',
          breadcrumb: ['项目面板', '项目分配'],
          permissions: [PermissionCodes.fundView],
          roles: [RoleCode.TEACHER, RoleCode.MINISTER],
          activeMenu: '/teacher/projects/assign',
        },
      },
      {
        path: 'knowledge/contents',
        name: 'knowledge.list',
        component: () => import('@web/views/KnowledgeBaseListPage.vue'),
        meta: {
          title: '智库',
          breadcrumb: ['内容中心', '智库'],
          permissions: [PermissionCodes.knowledgeView],
        },
      },
      {
        path: 'knowledge/contents/:id',
        name: 'knowledge.detail',
        component: () => import('@web/views/KnowledgeBaseDetailPage.vue'),
        meta: {
          title: '智库详情',
          breadcrumb: ['内容中心', '智库', '详情'],
          activeMenu: '/knowledge/contents',
          permissions: [PermissionCodes.knowledgeView],
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
    activeRoleCode: authStore.activeRoleCode,
  });
});

router.onError(async (error, to) => {
  const message = error instanceof Error ? error.message : String(error);
  const isDynamicImportError =
    message.includes('Failed to fetch dynamically imported module') || message.includes('Importing a module script failed');

  if (isDynamicImportError && to.path !== '/feature-unavailable') {
    await router.replace('/feature-unavailable');
  }
});
