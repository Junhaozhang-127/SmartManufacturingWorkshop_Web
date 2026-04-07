import { PermissionCodes } from '@smw/shared';
import type { NavItem } from '@smw/ui';

export const adminMenu: NavItem[] = [
  {
    key: 'dashboard',
    label: '工作台',
    path: '/',
    icon: 'House',
    permission: PermissionCodes.systemDashboardView,
  },
  {
    key: 'health',
    label: '系统健康检查',
    path: '/system/health',
    icon: 'Monitor',
    permission: PermissionCodes.systemHealthView,
  },
  {
    key: 'examples',
    label: '示例列表',
    path: '/system/examples',
    icon: 'List',
    permission: PermissionCodes.memberListView,
  },
];

export function filterMenuByPermissions(items: NavItem[], permissions: string[]) {
  return items.filter((item) => !item.permission || permissions.includes(item.permission));
}
