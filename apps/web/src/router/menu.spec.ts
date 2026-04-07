import { PermissionCodes, RoleCode } from '@smw/shared';
import { describe, expect, it } from 'vitest';

import { filterMenuByAccess } from './menu';

describe('filterMenuByAccess', () => {
  it('keeps only menu items allowed by permission set and role', () => {
    const items = [
      { key: '1', label: 'A', path: '/a', permissions: [PermissionCodes.systemDashboardView] },
      { key: '2', label: 'B', path: '/b', permissions: [PermissionCodes.systemHealthView], roles: [RoleCode.TEACHER] },
      { key: '3', label: 'C', path: '/c' },
    ];

    const result = filterMenuByAccess(items, [PermissionCodes.systemDashboardView], RoleCode.MEMBER);

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.key)).toEqual(['1', '3']);
  });
});
