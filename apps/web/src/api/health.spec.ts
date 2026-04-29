import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockHttpGet } = vi.hoisted(() => ({
  mockHttpGet: vi.fn(),
}));

vi.mock('./client', () => ({
  http: {
    get: mockHttpGet,
  },
}));

import { fetchHealth } from './health';

describe('health api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests health endpoint', async () => {
    mockHttpGet.mockResolvedValueOnce({
      data: {
        app: { status: 'up', name: 'smw', now: '2026-04-29T00:00:00.000Z' },
      },
    } as never);

    await fetchHealth();

    expect(mockHttpGet).toHaveBeenCalledWith('/health');
  });
});
