import type { DataScope, MenuCode, PermissionCode, RoleCode } from '../constants/permissions';

export interface RoleOption {
  roleCode: RoleCode;
  roleName: string;
  dataScope: DataScope;
}

export interface UserOrgProfile {
  orgUnitId: string | null;
  orgUnitName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  groupId: string | null;
  groupName: string | null;
  positionCode: string | null;
}

export interface DataScopeContext {
  scope: DataScope;
  userId: string;
  orgUnitId: string | null;
  departmentId: string | null;
  departmentAndDescendantIds: string[];
  groupId: string | null;
  selfUserIds: string[];
  participatingUserIds: string[];
}

export interface QuickEntry {
  code: MenuCode;
  label: string;
  path: string;
}

export interface DashboardSummaryMock {
  todoCount: number;
  shortcutEntries: QuickEntry[];
  deviceAbnormalCount?: number;
  pendingRepairCount?: number;
}

export interface CurrentUserProfile {
  id: string;
  username: string;
  displayName: string;
  statusCode: string;
  activeRole: RoleOption;
  roleOptions: RoleOption[];
  permissions: PermissionCode[];
  forcePasswordChange: boolean;
  orgProfile: UserOrgProfile;
  dataScopeContext: DataScopeContext;
  dashboard: DashboardSummaryMock;
}

export interface AuthLoginRequest {
  username: string;
  password: string;
}

export interface AuthLoginResponse {
  token: string;
  user: CurrentUserProfile;
}

export interface AuthRegisterRequest {
  username: string;
  password: string;
  displayName: string;
}

export interface AuthRegisterResponse {
  success: boolean;
}

export interface SwitchRoleRequest {
  roleCode: RoleCode;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AccessTokenPayload {
  sub: string;
  username: string;
  activeRoleCode: RoleCode;
  roleCodes: RoleCode[];
  scopeVersion: number;
  exp: number;
}
