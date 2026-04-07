import { describe, expect, it } from 'vitest';

import { filterMenuByPermissions } from './menu';

describe('filterMenuByPermissions', () => {
  it('keeps only menu items allowed by permission set', () => {
    const items = [
      { key: '1', label: 'A', path: '/a', permission: 'A:VIEW' },
      { key: '2', label: 'B', path: '/b', permission: 'B:VIEW' },
      { key: '3', label: 'C', path: '/c' },
    ];

    const result = filterMenuByPermissions(items, ['A:VIEW']);

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.key)).toEqual(['1', '3']);
  });
});
