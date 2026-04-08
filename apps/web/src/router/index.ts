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
      title: '鐧诲綍',
      requiresAuth: false,
      allowFirstLoginBypass: true,
    },
  },
  {
    path: '/change-password',
    name: 'auth.change-password',
    component: () => import('@web/views/ChangePasswordPage.vue'),
    meta: {
      title: '淇敼瀵嗙爜',
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
          title: '绯荤粺椹鹃┒鑸?',
          breadcrumb: ['绯荤粺椹鹃┒鑸?'],
          permissions: [PermissionCodes.systemDashboardView],
        },
      },
      {
        path: 'profile',
        name: 'profile.index',
        component: () => import('@web/views/PersonalCenterPage.vue'),
        meta: {
          title: '涓汉涓績',
          breadcrumb: ['涓汉涓績'],
          permissions: [PermissionCodes.profileView],
        },
      },
      {
        path: 'notifications',
        name: 'notifications.index',
        component: () => import('@web/views/NotificationPage.vue'),
        meta: {
          title: '閫氱煡娑堟伅',
          breadcrumb: ['閫氱煡娑堟伅'],
          permissions: [PermissionCodes.notificationView],
        },
      },
      {
        path: 'org/overview',
        name: 'org.overview',
        component: () => import('@web/views/OrgOverviewPage.vue'),
        meta: {
          title: '缁勭粐鏋舵瀯鎬昏',
          breadcrumb: ['缁勭粐鎴愬憳', '缁勭粐鏋舵瀯鎬昏'],
          permissions: [PermissionCodes.orgTreeView],
        },
      },
      {
        path: 'members/archive',
        name: 'members.archive',
        component: () => import('@web/views/MemberArchiveListPage.vue'),
        meta: {
          title: '鎴愬憳妗ｆ',
          breadcrumb: ['缁勭粐鎴愬憳', '鎴愬憳妗ｆ'],
          permissions: [PermissionCodes.memberListView],
        },
      },
      {
        path: 'members/archive/:id',
        name: 'members.detail',
        component: () => import('@web/views/MemberArchiveDetailPage.vue'),
        meta: {
          title: '鎴愬憳妗ｆ璇︽儏',
          breadcrumb: ['缁勭粐鎴愬憳', '鎴愬憳妗ｆ', '璇︽儏'],
          permissions: [PermissionCodes.memberListView],
        },
      },
      {
        path: 'members/regularization',
        name: 'members.regularization',
        component: () => import('@web/views/MemberRegularizationPage.vue'),
        meta: {
          title: '瀹炰範杞绠＄悊',
          breadcrumb: ['缁勭粐鎴愬憳', '瀹炰範杞'],
          permissions: [PermissionCodes.memberListView],
        },
      },
      {
        path: 'evaluation/scores',
        name: 'evaluation.scores',
        component: () => import('@web/views/EvaluationScorePage.vue'),
        meta: {
          title: '鑰冩牳璇勫垎涓庣粨鏋?',
          breadcrumb: ['缁勭粐鎴愬憳', '鑰冩牳璇勫垎涓庣粨鏋?'],
          permissions: [PermissionCodes.evaluationView],
        },
      },
      {
        path: 'promotion/eligibility',
        name: 'promotion.eligibility',
        component: () => import('@web/views/PromotionEligibilityPage.vue'),
        meta: {
          title: '鏅嬪崌璧勬牸鐪嬫澘',
          breadcrumb: ['缁勭粐鎴愬憳', '鏅嬪崌璧勬牸鐪嬫澘'],
          permissions: [PermissionCodes.promotionView],
        },
      },
      {
        path: 'promotion/applications',
        name: 'promotion.applications',
        component: () => import('@web/views/PromotionApplicationPage.vue'),
        meta: {
          title: '鏅嬪崌鐢宠涓庤瘎瀹?',
          breadcrumb: ['缁勭粐鎴愬憳', '鏅嬪崌鐢宠涓庤瘎瀹?'],
          permissions: [PermissionCodes.promotionView],
        },
      },
      {
        path: 'funds/overview',
        name: 'funds.overview',
        component: () => import('@web/views/FundOverviewPage.vue'),
        meta: {
          title: '缁忚垂鎬昏',
          breadcrumb: ['缁忚垂绠＄悊', '缁忚垂鎬昏'],
          permissions: [PermissionCodes.fundView],
        },
      },
      {
        path: 'funds/applications',
        name: 'funds.applications',
        component: () => import('@web/views/FundApplicationPage.vue'),
        meta: {
          title: '璐圭敤鐢宠涓庢姤閿€',
          breadcrumb: ['缁忚垂绠＄悊', '璐圭敤鐢宠涓庢姤閿€'],
          permissions: [PermissionCodes.fundCreate],
        },
      },
      {
        path: 'projects/:projectId',
        name: 'projects.detail',
        component: () => import('@web/views/ProjectFundDetailPage.vue'),
        meta: {
          title: '椤圭洰璇︽儏',
          breadcrumb: ['椤圭洰璇︽儏'],
          permissions: [PermissionCodes.fundView],
        },
      },
      {
        path: 'inventory/ledger',
        name: 'inventory.ledger',
        component: () => import('@web/views/InventoryLedgerPage.vue'),
        meta: {
          title: '鑰楁潗搴撳瓨鍙拌处',
          breadcrumb: ['搴撳瓨绠＄悊', '鑰楁潗搴撳瓨'],
          permissions: [PermissionCodes.inventoryView],
        },
      },
      {
        path: 'inventory/requests',
        name: 'inventory.requests',
        component: () => import('@web/views/InventoryRequestPage.vue'),
        meta: {
          title: '鑰楁潗鐢抽涓庡嚭鍏ュ簱',
          breadcrumb: ['搴撳瓨绠＄悊', '鐢抽涓庡嚭鍏ュ簱'],
          permissions: [PermissionCodes.inventoryView],
        },
      },
      {
        path: 'devices/ledger',
        name: 'devices.ledger',
        component: () => import('@web/views/DeviceLedgerPage.vue'),
        meta: {
          title: '璁惧鍙拌处',
          breadcrumb: ['璁惧璧勪骇', '璁惧鍙拌处'],
          permissions: [PermissionCodes.deviceView],
        },
      },
      {
        path: 'devices/repairs',
        name: 'devices.repairs',
        component: () => import('@web/views/DeviceRepairPage.vue'),
        meta: {
          title: '缁翠慨鎶ヤ慨宸ュ崟',
          breadcrumb: ['璁惧璧勪骇', '缁翠慨鎶ヤ慨'],
          permissions: [PermissionCodes.deviceRepairView],
        },
      },
      {
        path: 'competitions/library',
        name: 'competitions.library',
        component: () => import('@web/views/CompetitionLibraryPage.vue'),
        meta: {
          title: '璧涗簨搴撲笌鎶ュ悕',
          breadcrumb: ['绔炶禌鎴愭灉', '璧涗簨搴撲笌鎶ュ悕'],
          permissions: [PermissionCodes.competitionView],
        },
      },
      {
        path: 'achievements',
        name: 'achievements.list',
        component: () => import('@web/views/AchievementListPage.vue'),
        meta: {
          title: '鎴愭灉鍒楄〃',
          breadcrumb: ['绔炶禌鎴愭灉', '鎴愭灉鍒楄〃'],
          permissions: [PermissionCodes.achievementView],
        },
      },
      {
        path: 'achievements/new',
        name: 'achievements.create',
        component: () => import('@web/views/AchievementFormPage.vue'),
        meta: {
          title: '鎴愭灉褰曞叆',
          breadcrumb: ['绔炶禌鎴愭灉', '鎴愭灉褰曞叆'],
          permissions: [PermissionCodes.achievementCreate],
        },
      },
      {
        path: 'achievements/:id/edit',
        name: 'achievements.edit',
        component: () => import('@web/views/AchievementFormPage.vue'),
        meta: {
          title: '鎴愭灉缂栬緫',
          breadcrumb: ['绔炶禌鎴愭灉', '鎴愭灉缂栬緫'],
          permissions: [PermissionCodes.achievementUpdate],
        },
      },
      {
        path: 'workflow/approval-center',
        name: 'workflow.approval-center',
        component: () => import('@web/views/ApprovalCenterPage.vue'),
        meta: {
          title: '缁熶竴瀹℃壒涓績',
          breadcrumb: ['娴佺▼涓績', '缁熶竴瀹℃壒涓績'],
          permissions: [PermissionCodes.approvalCenterView],
        },
      },
      {
        path: 'system/health',
        name: 'system.health',
        component: () => import('@web/views/HealthCheckPage.vue'),
        meta: {
          title: '绯荤粺鍋ュ悍',
          breadcrumb: ['绯荤粺鍩虹', '绯荤粺鍋ュ悍'],
          permissions: [PermissionCodes.systemHealthView],
        },
      },
      {
        path: 'system/configuration',
        name: 'system.configuration',
        component: () => import('@web/views/SystemConfigPage.vue'),
        meta: {
          title: '瀛楀吀涓庡熀纭€閰嶇疆',
          breadcrumb: ['绯荤粺鍩虹', '瀛楀吀涓庡熀纭€閰嶇疆'],
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
