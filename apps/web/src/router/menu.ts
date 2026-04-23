import type { PermissionCode, RoleCode } from '@smw/shared';
import { PermissionCodes, RoleCode as RoleCodeEnum } from '@smw/shared';
import type { NavItem } from '@smw/ui';

export interface AppMenuItem extends NavItem {
  permissions?: PermissionCode[];
  roles?: RoleCode[];
  children?: AppMenuItem[];
}

export const adminMenu: AppMenuItem[] = [
  {
    key: 'workbench',
    label: '工作台',
    path: '/',
    icon: 'House',
    permissions: [PermissionCodes.systemDashboardView],
  },
  {
    key: 'system-configuration',
    label: '系统配置',
    path: '/system/configuration',
    icon: 'Setting',
    permissions: [PermissionCodes.systemConfigView],
  },
  {
    key: 'org-member',
    label: '组织与成员',
    path: '/org/overview',
    icon: 'Share',
    children: [
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
        roles: [RoleCodeEnum.INTERN],
      },
    ],
  },
  {
    key: 'evaluation-promotion',
    label: '考核与晋升',
    path: '/evaluation/scores',
    icon: 'DataAnalysis',
    children: [
      {
        key: 'evaluation-score',
        label: '考核评分',
        path: '/evaluation/scores',
        icon: 'DataAnalysis',
        permissions: [PermissionCodes.evaluationView],
      },
      {
        key: 'promotion-manage',
        label: '晋升管理',
        path: '/promotion/manage',
        icon: 'Histogram',
        permissions: [PermissionCodes.promotionView],
      },
    ],
  },
  {
    key: 'competition-achievement',
    label: '竞赛与成果',
    path: '/competitions/library',
    icon: 'Trophy',
    children: [
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
    ],
  },
  {
    key: 'device-resource',
    label: '设备与资源',
    path: '/devices/repairs',
    icon: 'Tools',
    children: [
      {
        key: 'device-ledger',
        label: '设备台账',
        path: '/devices/ledger',
        icon: 'Monitor',
        permissions: [PermissionCodes.deviceRepairView],
      },
      {
        key: 'device-repair',
        label: '设备报修工单',
        path: '/devices/repairs',
        icon: 'Tools',
        permissions: [PermissionCodes.deviceRepairView],
      },
      {
        key: 'fund-application',
        label: '经费申请与审批',
        path: '/funds/applications',
        icon: 'DocumentAdd',
        permissions: [PermissionCodes.fundCreate],
      },
    ],
  },
  {
    key: 'teacher-panel',
    label: '项目面板',
    path: '/teacher/projects/entry',
    icon: 'Money',
    roles: [RoleCodeEnum.TEACHER, RoleCodeEnum.MINISTER],
    permissions: [PermissionCodes.fundView],
    children: [
      {
        key: 'teacher-project-entry',
        label: '项目录入',
        path: '/teacher/projects/entry',
        icon: 'DocumentAdd',
        roles: [RoleCodeEnum.TEACHER, RoleCodeEnum.MINISTER],
        permissions: [PermissionCodes.fundView],
      },
      {
        key: 'teacher-project-assign',
        label: '项目分配',
        path: '/teacher/projects/assign',
        icon: 'Share',
        roles: [RoleCodeEnum.TEACHER, RoleCodeEnum.MINISTER],
        permissions: [PermissionCodes.fundView],
      },
      {
        key: 'teacher-fund-manage',
        label: '经费管理',
        path: '/funds/overview',
        icon: 'Money',
        roles: [RoleCodeEnum.TEACHER],
        permissions: [PermissionCodes.fundView],
      },
    ],
  },
  {
    key: 'content-center',
    label: '内容中心',
    path: '/notifications',
    icon: 'Bell',
    children: [
      {
        key: 'notifications',
        label: '通知公告',
        path: '/notifications',
        icon: 'Bell',
        permissions: [PermissionCodes.notificationView],
      },
      {
        key: 'portal-content-manage',
        label: '首页内容管理',
        path: '/portal/manage',
        icon: 'Picture',
        roles: [RoleCodeEnum.TEACHER, RoleCodeEnum.MINISTER],
      },
      {
        key: 'creation-center',
        label: '创作中心',
        path: '/creation',
        icon: 'EditPen',
      },
      {
        key: 'knowledge-base',
        label: '智库',
        path: '/knowledge/contents',
        icon: 'Collection',
      },
    ],
  },
  {
    key: 'approval-center',
    label: '审批中心',
    path: '/workflow/approval-center',
    icon: 'Finished',
    permissions: [PermissionCodes.approvalCenterView],
    roles: [RoleCodeEnum.TEACHER, RoleCodeEnum.MINISTER, RoleCodeEnum.GROUP_LEADER],
  },
  {
    key: 'profile',
    label: '个人中心',
    path: '/profile',
    icon: 'UserFilled',
    permissions: [PermissionCodes.profileView],
  },
];

function canAccessItem(item: AppMenuItem, permissions: string[], roleCode: RoleCode | null) {
  const permissionAllowed =
    !item.permissions?.length || item.permissions.every((permission) => permissions.includes(permission));
  const roleAllowed = !item.roles?.length || (roleCode ? item.roles.includes(roleCode) : false);

  return permissionAllowed && roleAllowed;
}

export function filterMenuByAccess(items: AppMenuItem[], permissions: string[], roleCode: RoleCode | null): AppMenuItem[] {
  return items
    .map((item) => {
      if (item.children?.length) {
        const children = filterMenuByAccess(item.children, permissions, roleCode);
        if (!children.length) return null;
        return {
          ...item,
          children,
        };
      }

      if (!canAccessItem(item, permissions, roleCode)) return null;
      return item;
    })
    .filter((item): item is AppMenuItem => Boolean(item));
}
