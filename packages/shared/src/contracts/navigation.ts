import type { PermissionCode, RoleCode } from '../constants/permissions';

export type HomeVariant = 'teacher' | 'leader' | 'minister' | 'group' | 'member';

export interface RoutePermissionMeta {
  requiresAuth?: boolean;
  permissions?: PermissionCode[];
  allowFirstLoginBypass?: boolean;
  homeVariant?: HomeVariant;
  roles?: RoleCode[];
}
