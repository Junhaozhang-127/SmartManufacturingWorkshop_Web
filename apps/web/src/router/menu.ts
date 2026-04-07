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
    label: '系统驾驶舱',
    path: '/',
    icon: 'House',
    permissions: [PermissionCodes.systemDashboardView],
  },
  {
    key: 'org-overview',
    label: '组织架构',
    path: '/org/overview',
    icon: 'Share',
    permissions: [PermissionCodes.orgTreeView],
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
    label: '实习转正',
    path: '/members/regularization',
    icon: 'Promotion',
    permissions: [PermissionCodes.memberListView],
  },
  {
    key: 'member-transfer',
    label: '调岗预留',
    path: '/members/transfers',
    icon: 'Switch',
    permissions: [PermissionCodes.memberListView],
  },
  {
    key: 'member-exit',
    label: '退出预留',
    path: '/members/exits',
    icon: 'CircleClose',
    permissions: [PermissionCodes.memberListView],
  },
  {
    key: 'device-ledger',
    label: '设备台账',
    path: '/devices/ledger',
    icon: 'Box',
    permissions: [PermissionCodes.deviceView],
  },
  {
    key: 'device-repair',
    label: '维修报修',
    path: '/devices/repairs',
    icon: 'Tools',
    permissions: [PermissionCodes.deviceRepairView],
  },
  {
    key: 'competition-library',
    label: '赛事库与报名',
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
    key: 'approval-demo',
    label: '测试审批单',
    path: '/workflow/demo-request',
    icon: 'DocumentAdd',
    permissions: [PermissionCodes.approvalCreate],
  },
  {
    key: 'health',
    label: '系统健康',
    path: '/system/health',
    icon: 'Monitor',
    permissions: [PermissionCodes.systemHealthView],
    roles: [RoleCodeEnum.TEACHER, RoleCodeEnum.LAB_LEADER],
  },
  {
    key: 'examples',
    label: '成员示例',
    path: '/system/examples',
    icon: 'List',
    permissions: [PermissionCodes.memberListView],
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
