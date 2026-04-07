import type { PermissionCode } from '@smw/shared';
import { useAuthStore } from '@web/stores/auth';

export function useAuthz() {
  const authStore = useAuthStore();

  function hasPermission(permission: PermissionCode) {
    return authStore.permissions.includes(permission);
  }

  function hasAnyPermission(permissions: PermissionCode[]) {
    return permissions.some((permission) => hasPermission(permission));
  }

  return {
    hasPermission,
    hasAnyPermission,
  };
}
