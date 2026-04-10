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
          title: '系统总览',
          breadcrumb: ['系统总览'],
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
          title: '经费申请与审批',
          breadcrumb: ['经费管理', '经费申请与审批'],
          permissions: [PermissionCodes.fundCreate],
        },
      },
      {
        path: 'projects/:projectId',
        name: 'projects.detail',
        component: () => import('@web/views/ProjectFundDetailPage.vue'),
        meta: {
          title: '项目经费明细',
          breadcrumb: ['项目经费明细'],
          permissions: [PermissionCodes.fundView],
        },
      },
      {
        path: 'devices/repairs',
        name: 'devices.repairs',
        component: () => import('@web/views/DeviceRepairPage.vue'),
        meta: {
          title: '设备报修工单',
          breadcrumb: ['设备管理', '设备报修工单'],
          permissions: [PermissionCodes.deviceRepairView],
        },
      },
      {
        path: 'competitions/library',
        name: 'competitions.library',
        component: () => import('@web/views/CompetitionLibraryPage.vue'),
        meta: {
          title: '竞赛库与报名',
          breadcrumb: ['竞赛管理', '竞赛库与报名'],
          permissions: [PermissionCodes.competitionView],
        },
      },
      {
        path: 'achievements',
        name: 'achievements.list',
        component: () => import('@web/views/AchievementListPage.vue'),
        meta: {
          title: '成果列表',
          breadcrumb: ['竞赛管理', '成果列表'],
          permissions: [PermissionCodes.achievementView],
        },
      },
      {
        path: 'achievements/new',
        name: 'achievements.create',
        component: () => import('@web/views/AchievementFormPage.vue'),
        meta: {
          title: '成果新增',
          breadcrumb: ['竞赛管理', '成果新增'],
          permissions: [PermissionCodes.achievementCreate],
        },
      },
      {
        path: 'achievements/:id/edit',
        name: 'achievements.edit',
        component: () => import('@web/views/AchievementFormPage.vue'),
        meta: {
          title: '成果编辑',
          breadcrumb: ['竞赛管理', '成果编辑'],
          permissions: [PermissionCodes.achievementUpdate],
        },
      },
      {
        path: 'workflow/approval-center',
        name: 'workflow.approval-center',
        component: () => import('@web/views/ApprovalCenterPage.vue'),
        meta: {
          title: '统一审批中心',
          breadcrumb: ['审批管理', '统一审批中心'],
          permissions: [PermissionCodes.approvalCenterView],
        },
      },
      {
        path: 'system/health',
        name: 'system.health',
        component: () => import('@web/views/HealthCheckPage.vue'),
        meta: {
          title: '系统健康',
          breadcrumb: ['系统管理', '系统健康'],
          permissions: [PermissionCodes.systemHealthView],
        },
      },
      {
        path: 'system/configuration',
        name: 'system.configuration',
        component: () => import('@web/views/SystemConfigPage.vue'),
        meta: {
          title: '数据字典与配置管理',
          breadcrumb: ['系统管理', '数据字典与配置管理'],
          permissions: [PermissionCodes.systemConfigView],
        },
      },
      {
        path: 'portal/manage',
        name: 'portal.manage',
        component: () => import('@web/views/PortalContentManagePage.vue'),
        meta: {
          title: '首页内容管理',
          breadcrumb: ['首页内容管理'],
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
