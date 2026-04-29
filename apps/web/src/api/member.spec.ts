import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockHttpPost } = vi.hoisted(() => ({
  mockHttpPost: vi.fn(),
}));

vi.mock('./client', () => ({
  http: {
    get: vi.fn(),
    post: mockHttpPost,
    patch: vi.fn(),
    put: vi.fn(),
  },
}));

import { createRegularization } from './member';

describe('member api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends attachmentFileIds when creating regularization', async () => {
    mockHttpPost.mockResolvedValueOnce({ data: { id: '501' } } as never);

    await createRegularization({
      memberProfileId: '101',
      internshipStartDate: '2026-04-01',
      plannedRegularDate: '2026-05-01',
      applicationReason: '申请转正',
      attachmentFileIds: ['11', '12'],
    });

    expect(mockHttpPost).toHaveBeenCalledWith('/member-regularizations', {
      memberProfileId: '101',
      internshipStartDate: '2026-04-01',
      plannedRegularDate: '2026-05-01',
      applicationReason: '申请转正',
      attachmentFileIds: ['11', '12'],
    });
  });
});
