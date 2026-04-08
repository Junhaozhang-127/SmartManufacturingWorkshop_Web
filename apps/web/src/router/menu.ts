import type { PermissionCode, RoleCode } from '@smw/shared';
import { PermissionCodes, RoleCode as RoleCodeEnum } from '@smw/shared';
import type { NavItem } from '@smw/ui';

export interface AppMenuItem extends NavItem {
  permissions?: PermissionCode[];
  roles?: RoleCode[];
}

export const adminMenu: AppMenuItem[] = [
  {
    key: 'dashboard',
    label: '绯荤粺椹鹃┒鑸?',
    path: '/',
    icon: 'House',
    permissions: [PermissionCodes.systemDashboardView],
  },
  {
    key: 'profile',
    label: '涓汉涓績',
    path: '/profile',
    icon: 'UserFilled',
    permissions: [PermissionCodes.profileView],
  },
  {
    key: 'org-overview',
    label: '缁勭粐鏋舵瀯',
    path: '/org/overview',
    icon: 'Share',
    permissions: [PermissionCodes.orgTreeView],
  },
  {
    key: 'member-archive',
    label: '鎴愬憳妗ｆ',
    path: '/members/archive',
    icon: 'User',
    permissions: [PermissionCodes.memberListView],
  },
  {
    key: 'member-regularization',
    label: '瀹炰範杞',
    path: '/members/regularization',
    icon: 'Promotion',
    permissions: [PermissionCodes.memberListView],
  },
  {
    key: 'evaluation-score',
    label: '鑰冩牳璇勫垎',
    path: '/evaluation/scores',
    icon: 'DataAnalysis',
    permissions: [PermissionCodes.evaluationView],
  },
  {
    key: 'promotion-eligibility',
    label: '鏅嬪崌璧勬牸鐪嬫澘',
    path: '/promotion/eligibility',
    icon: 'Histogram',
    permissions: [PermissionCodes.promotionView],
  },
  {
    key: 'promotion-application',
    label: '鏅嬪崌鐢宠涓庤瘎瀹?',
    path: '/promotion/applications',
    icon: 'Postcard',
    permissions: [PermissionCodes.promotionView],
  },
  {
    key: 'fund-overview',
    label: '缁忚垂鎬昏',
    path: '/funds/overview',
    icon: 'Money',
    permissions: [PermissionCodes.fundView],
    roles: [RoleCodeEnum.TEACHER, RoleCodeEnum.LAB_LEADER],
  },
  {
    key: 'fund-application',
    label: '璐圭敤鐢宠涓庢姤閿€',
    path: '/funds/applications',
    icon: 'Tickets',
    permissions: [PermissionCodes.fundCreate],
    roles: [RoleCodeEnum.LAB_LEADER],
  },
  {
    key: 'consumable-ledger',
    label: '鑰楁潗搴撳瓨',
    path: '/inventory/ledger',
    icon: 'Goods',
    permissions: [PermissionCodes.inventoryView],
  },
  {
    key: 'consumable-request',
    label: '鐢抽涓庡嚭鍏ュ簱',
    path: '/inventory/requests',
    icon: 'DocumentCopy',
    permissions: [PermissionCodes.inventoryView],
  },
  {
    key: 'device-ledger',
    label: '璁惧鍙拌处',
    path: '/devices/ledger',
    icon: 'Box',
    permissions: [PermissionCodes.deviceView],
  },
  {
    key: 'device-repair',
    label: '缁翠慨鎶ヤ慨',
    path: '/devices/repairs',
    icon: 'Tools',
    permissions: [PermissionCodes.deviceRepairView],
  },
  {
    key: 'competition-library',
    label: '璧涗簨搴撲笌鎶ュ悕',
    path: '/competitions/library',
    icon: 'Trophy',
    permissions: [PermissionCodes.competitionView],
  },
  {
    key: 'achievement-list',
    label: '鎴愭灉鍒楄〃',
    path: '/achievements',
    icon: 'Medal',
    permissions: [PermissionCodes.achievementView],
  },
  {
    key: 'approval-center',
    label: '缁熶竴瀹℃壒涓績',
    path: '/workflow/approval-center',
    icon: 'Finished',
    permissions: [PermissionCodes.approvalCenterView],
  },
  {
    key: 'notifications',
    label: '閫氱煡娑堟伅',
    path: '/notifications',
    icon: 'Bell',
    permissions: [PermissionCodes.notificationView],
  },
  {
    key: 'health',
    label: '绯荤粺鍋ュ悍',
    path: '/system/health',
    icon: 'Monitor',
    permissions: [PermissionCodes.systemHealthView],
    roles: [RoleCodeEnum.LAB_LEADER],
  },
  {
    key: 'system-configuration',
    label: '瀛楀吀涓庡熀纭€閰嶇疆',
    path: '/system/configuration',
    icon: 'Setting',
    permissions: [PermissionCodes.systemConfigView],
    roles: [RoleCodeEnum.LAB_LEADER],
  },
];

export function filterMenuByAccess(items: AppMenuItem[], permissions: string[], roleCode: RoleCode | null) {
  return items.filter((item) => {
    const permissionAllowed =
      !item.permissions?.length || item.permissions.every((permission) => permissions.includes(permission));
    const roleAllowed = !item.roles?.length || (roleCode ? item.roles.includes(roleCode) : false);

    return permissionAllowed && roleAllowed;
  });
}
