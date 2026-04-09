import type { RoutePermissionMeta } from '@smw/shared';
import type { RouteLocationNormalized } from 'vue-router';

interface AuthGuardState {
  isAuthenticated: boolean;
  initialized: boolean;
  forcePasswordChange: boolean;
  permissions: string[];
}

type GuardResult =
  | true
  | {
      path: string;
      query?: Record<string, string>;
    };

function readMeta(route: RouteLocationNormalized) {
  return (route.meta ?? {}) as RoutePermissionMeta;
}

export function resolveAuthNavigation(
  to: Pick<RouteLocationNormalized, 'fullPath' | 'path' | 'meta'>,
  auth: AuthGuardState,
): GuardResult {
  const meta = readMeta(to as RouteLocationNormalized);
  const requiresAuth = meta.requiresAuth !== false;
  const needsPasswordBypass = meta.allowFirstLoginBypass === true;

  if (!requiresAuth) {
    if (to.path === '/login' && auth.isAuthenticated && !auth.forcePasswordChange) {
      return { path: '/' };
    }

    return true;
  }

  if (!auth.isAuthenticated) {
    if (to.path === '/') {
      return { path: '/portal' };
    }

    return {
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    };
  }

  if (auth.forcePasswordChange && !needsPasswordBypass) {
    return {
      path: '/change-password',
      query: {
        redirect: to.fullPath,
      },
    };
  }

  if (meta.permissions?.length && !meta.permissions.every((permission) => auth.permissions.includes(permission))) {
    return { path: '/' };
  }

  return true;
}
