import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockHttpGet } = vi.hoisted(() => ({
  mockHttpGet: vi.fn(),
}));

vi.mock('./client', () => ({
  http: {
    get: mockHttpGet,
    post: vi.fn(),
  },
}));

import { downloadFundAttachment } from './finance';

describe('finance api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads attachments through the authenticated api client', async () => {
    const blob = new Blob(['attachment']);
    mockHttpGet.mockResolvedValueOnce(blob as never);

    const result = await downloadFundAttachment('funds/2026/demo.pdf', 'demo.pdf');

    expect(mockHttpGet).toHaveBeenCalledWith('/files/download', {
      params: {
        key: 'funds/2026/demo.pdf',
        name: 'demo.pdf',
      },
      responseType: 'blob',
    });
    expect(result).toBe(blob);
  });
});
