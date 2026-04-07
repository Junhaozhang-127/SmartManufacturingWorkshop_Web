export enum ResourceCode {
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
  EXPORT = 'EXPORT',
}

export enum DataScope {
  ALL = 'ALL',
  DEPT = 'DEPT',
  GROUP = 'GROUP',
  SELF = 'SELF',
  PARTICIPATING = 'PARTICIPATING',
}

export const PermissionCodes = {
  systemDashboardView: `${ResourceCode.SYSTEM}:${ActionCode.VIEW}`,
  systemHealthView: `${ResourceCode.SYSTEM}:HEALTH_VIEW`,
  systemLoginExecute: `${ResourceCode.SYSTEM}:LOGIN_EXECUTE`,
  orgTreeView: `${ResourceCode.ORG}:${ActionCode.VIEW}`,
  memberListView: `${ResourceCode.MEMBER}:${ActionCode.VIEW}`,
  approvalCenterView: `${ResourceCode.APPROVAL}:${ActionCode.VIEW}`,
} as const;

export type PermissionCode = (typeof PermissionCodes)[keyof typeof PermissionCodes];
