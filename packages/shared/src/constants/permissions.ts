export enum RoleCode {
  TEACHER = 'TEACHER',
  LAB_LEADER = 'LAB_LEADER',
  MINISTER = 'MINISTER',
  GROUP_LEADER = 'GROUP_LEADER',
  MEMBER = 'MEMBER',
  INTERN = 'INTERN',
}

export enum ResourceCode {
  AUTH = 'AUTH',
  SYSTEM = 'SYSTEM',
  ORG = 'ORG',
  MEMBER = 'MEMBER',
  APPROVAL = 'APPROVAL',
}

export enum ActionCode {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  EXECUTE = 'EXECUTE',
}

export enum DataScope {
  ALL = 'ALL',
  DEPT_PROJECT = 'DEPT_PROJECT',
  GROUP_PROJECT = 'GROUP_PROJECT',
  SELF_PARTICIPATE = 'SELF_PARTICIPATE',
}

export enum MenuCode {
  DASHBOARD = 'DASHBOARD',
  HEALTH = 'HEALTH',
  ORG_OVERVIEW = 'ORG_OVERVIEW',
  MEMBER_ARCHIVE = 'MEMBER_ARCHIVE',
  MEMBER_REGULARIZATION = 'MEMBER_REGULARIZATION',
  MEMBER_EXAMPLES = 'MEMBER_EXAMPLES',
  APPROVAL_CENTER = 'APPROVAL_CENTER',
  APPROVAL_DEMO = 'APPROVAL_DEMO',
}

export function buildPermissionCode(resource: ResourceCode, action: ActionCode) {
  return `${resource}:${action}` as const;
}

export const PermissionCodes = {
  authLogin: buildPermissionCode(ResourceCode.AUTH, ActionCode.EXECUTE),
  authSwitchRole: buildPermissionCode(ResourceCode.AUTH, ActionCode.UPDATE),
  authChangePassword: buildPermissionCode(ResourceCode.AUTH, ActionCode.UPDATE),
  systemDashboardView: buildPermissionCode(ResourceCode.SYSTEM, ActionCode.VIEW),
  systemHealthView: buildPermissionCode(ResourceCode.SYSTEM, ActionCode.VIEW),
  memberListView: buildPermissionCode(ResourceCode.MEMBER, ActionCode.VIEW),
  memberUpdate: buildPermissionCode(ResourceCode.MEMBER, ActionCode.UPDATE),
  memberCreate: buildPermissionCode(ResourceCode.MEMBER, ActionCode.CREATE),
  memberApprove: buildPermissionCode(ResourceCode.MEMBER, ActionCode.APPROVE),
  orgTreeView: buildPermissionCode(ResourceCode.ORG, ActionCode.VIEW),
  approvalCenterView: buildPermissionCode(ResourceCode.APPROVAL, ActionCode.VIEW),
  approvalCreate: buildPermissionCode(ResourceCode.APPROVAL, ActionCode.CREATE),
  approvalApprove: buildPermissionCode(ResourceCode.APPROVAL, ActionCode.APPROVE),
} as const;

export type PermissionCode = (typeof PermissionCodes)[keyof typeof PermissionCodes];

export const RolePermissionMap: Record<RoleCode, PermissionCode[]> = {
  [RoleCode.TEACHER]: [
    PermissionCodes.authLogin,
    PermissionCodes.authSwitchRole,
    PermissionCodes.authChangePassword,
    PermissionCodes.systemDashboardView,
    PermissionCodes.systemHealthView,
    PermissionCodes.memberListView,
    PermissionCodes.memberUpdate,
    PermissionCodes.memberCreate,
    PermissionCodes.memberApprove,
    PermissionCodes.orgTreeView,
    PermissionCodes.approvalCenterView,
    PermissionCodes.approvalCreate,
    PermissionCodes.approvalApprove,
  ],
  [RoleCode.LAB_LEADER]: [
    PermissionCodes.authLogin,
    PermissionCodes.authSwitchRole,
    PermissionCodes.authChangePassword,
    PermissionCodes.systemDashboardView,
    PermissionCodes.systemHealthView,
    PermissionCodes.memberListView,
    PermissionCodes.memberUpdate,
    PermissionCodes.memberCreate,
    PermissionCodes.memberApprove,
    PermissionCodes.orgTreeView,
    PermissionCodes.approvalCenterView,
    PermissionCodes.approvalCreate,
    PermissionCodes.approvalApprove,
  ],
  [RoleCode.MINISTER]: [
    PermissionCodes.authLogin,
    PermissionCodes.authSwitchRole,
    PermissionCodes.authChangePassword,
    PermissionCodes.systemDashboardView,
    PermissionCodes.memberListView,
    PermissionCodes.memberUpdate,
    PermissionCodes.memberCreate,
    PermissionCodes.memberApprove,
    PermissionCodes.orgTreeView,
    PermissionCodes.approvalCenterView,
    PermissionCodes.approvalCreate,
    PermissionCodes.approvalApprove,
  ],
  [RoleCode.GROUP_LEADER]: [
    PermissionCodes.authLogin,
    PermissionCodes.authSwitchRole,
    PermissionCodes.authChangePassword,
    PermissionCodes.systemDashboardView,
    PermissionCodes.memberListView,
    PermissionCodes.memberUpdate,
    PermissionCodes.memberCreate,
    PermissionCodes.memberApprove,
    PermissionCodes.orgTreeView,
    PermissionCodes.approvalCenterView,
    PermissionCodes.approvalCreate,
    PermissionCodes.approvalApprove,
  ],
  [RoleCode.MEMBER]: [
    PermissionCodes.authLogin,
    PermissionCodes.authSwitchRole,
    PermissionCodes.authChangePassword,
    PermissionCodes.systemDashboardView,
    PermissionCodes.memberListView,
    PermissionCodes.memberCreate,
    PermissionCodes.approvalCenterView,
    PermissionCodes.approvalCreate,
  ],
  [RoleCode.INTERN]: [
    PermissionCodes.authLogin,
    PermissionCodes.authSwitchRole,
    PermissionCodes.authChangePassword,
    PermissionCodes.systemDashboardView,
    PermissionCodes.memberListView,
    PermissionCodes.memberCreate,
    PermissionCodes.approvalCenterView,
    PermissionCodes.approvalCreate,
  ],
};

export const RoleDataScopeMap: Record<RoleCode, DataScope> = {
  [RoleCode.TEACHER]: DataScope.ALL,
  [RoleCode.LAB_LEADER]: DataScope.ALL,
  [RoleCode.MINISTER]: DataScope.DEPT_PROJECT,
  [RoleCode.GROUP_LEADER]: DataScope.GROUP_PROJECT,
  [RoleCode.MEMBER]: DataScope.SELF_PARTICIPATE,
  [RoleCode.INTERN]: DataScope.SELF_PARTICIPATE,
};
