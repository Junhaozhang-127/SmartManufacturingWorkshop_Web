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
    label: '驾驶舱',
    path: '/',
    icon: 'House',
    permissions: [PermissionCodes.systemDashboardView],
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
