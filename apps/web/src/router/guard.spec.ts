import { describe, expect, it } from 'vitest';

import { resolveAuthNavigation } from './guard';

describe('resolveAuthNavigation', () => {
  it('redirects unauthenticated users to login', () => {
    const result = resolveAuthNavigation(
      {
        path: '/notifications',
        fullPath: '/notifications',
        meta: { requiresAuth: true },
      },
      {
        isAuthenticated: false,
        initialized: true,
        forcePasswordChange: false,
        permissions: [],
      },
    );

    expect(result).toEqual({
      path: '/login',
      query: {
        redirect: '/notifications',
      },
    });
  });

  it('redirects forced-password users to change-password', () => {
    const result = resolveAuthNavigation(
      {
        path: '/notifications',
        fullPath: '/notifications',
        meta: { requiresAuth: true },
      },
      {
        isAuthenticated: true,
        initialized: true,
        forcePasswordChange: true,
        permissions: ['MEMBER:VIEW'],
      },
    );

    expect(result).toEqual({
      path: '/change-password',
      query: {
        redirect: '/notifications',
      },
    });
  });

  it('redirects to home when permission is missing', () => {
    const result = resolveAuthNavigation(
      {
        path: '/system/health',
        fullPath: '/system/health',
        meta: { requiresAuth: true, permissions: ['SYSTEM:VIEW'] },
      },
      {
        isAuthenticated: true,
        initialized: true,
        forcePasswordChange: false,
        permissions: [],
      },
    );

    expect(result).toEqual({ path: '/' });
  });
});
