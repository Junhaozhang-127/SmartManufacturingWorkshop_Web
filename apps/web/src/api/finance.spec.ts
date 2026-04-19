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

    const result = await downloadFundAttachment('1', 'demo.pdf');

    expect(mockHttpGet).toHaveBeenCalledWith('/attachments/1/download', {
      params: {
        name: 'demo.pdf',
      },
      responseType: 'blob',
    });
    expect(result).toBe(blob);
  });
});
