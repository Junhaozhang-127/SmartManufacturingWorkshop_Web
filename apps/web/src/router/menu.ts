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
    label: '系统总览',
    path: '/',
    icon: 'House',
    permissions: [PermissionCodes.systemDashboardView],
  },
  {
    key: 'profile',
    label: '个人中心',
    path: '/profile',
    icon: 'UserFilled',
    permissions: [PermissionCodes.profileView],
  },
  {
    key: 'org-overview',
    label: '组织架构总览',
    path: '/org/overview',
    icon: 'Share',
    permissions: [PermissionCodes.orgTreeView],
    roles: [RoleCodeEnum.TEACHER, RoleCodeEnum.MINISTER],
  },
  {
    key: 'member-archive',
    label: '成员档案',
    path: '/members/archive',
    icon: 'User',
    permissions: [PermissionCodes.memberListView],
  },
  {
    key: 'member-regularization',
    label: '成员转正',
    path: '/members/regularization',
    icon: 'Promotion',
    permissions: [PermissionCodes.memberListView],
  },
  {
    key: 'evaluation-score',
    label: '考核评分',
    path: '/evaluation/scores',
    icon: 'DataAnalysis',
    permissions: [PermissionCodes.evaluationView],
  },
  {
    key: 'promotion-eligibility',
    label: '晋升资格看板',
    path: '/promotion/eligibility',
    icon: 'Histogram',
    permissions: [PermissionCodes.promotionView],
  },
  {
    key: 'promotion-application',
    label: '晋升申请与评审',
    path: '/promotion/applications',
    icon: 'Postcard',
    permissions: [PermissionCodes.promotionView],
  },
  {
    key: 'fund-overview',
    label: '经费总览',
    path: '/funds/overview',
    icon: 'Money',
    permissions: [PermissionCodes.fundView],
    roles: [RoleCodeEnum.TEACHER],
  },
  {
    key: 'device-repair',
    label: '设备报修',
    path: '/devices/repairs',
    icon: 'Tools',
    permissions: [PermissionCodes.deviceRepairView],
  },
  {
    key: 'competition-library',
    label: '竞赛库与报名',
    path: '/competitions/library',
    icon: 'Trophy',
    permissions: [PermissionCodes.competitionView],
  },
  {
    key: 'achievement-list',
    label: '成果列表',
    path: '/achievements',
    icon: 'Medal',
    permissions: [PermissionCodes.achievementView],
  },
  {
    key: 'approval-center',
    label: '统一审批中心',
    path: '/workflow/approval-center',
    icon: 'Finished',
    permissions: [PermissionCodes.approvalCenterView],
  },
  {
    key: 'notifications',
    label: '通知公告',
    path: '/notifications',
    icon: 'Bell',
    permissions: [PermissionCodes.notificationView],
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
