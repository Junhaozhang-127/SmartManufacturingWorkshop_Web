import { ApprovalCenterTab } from '@smw/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockHttpGet, mockHttpPost } = vi.hoisted(() => ({
  mockHttpGet: vi.fn(),
  mockHttpPost: vi.fn(),
}));

vi.mock('./client', () => ({
  http: {
    get: mockHttpGet,
    post: mockHttpPost,
  },
}));

import { approveApproval, fetchApprovalDetail, fetchApprovalList } from './approval';

describe('approval api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends undefined keyword when keyword is empty', async () => {
    mockHttpGet.mockResolvedValueOnce({ data: { items: [], total: 0 } } as never);

    await fetchApprovalList(ApprovalCenterTab.PENDING, 2, 20, '');

    expect(mockHttpGet).toHaveBeenCalledWith('/approval-center', {
      params: {
        tab: ApprovalCenterTab.PENDING,
        page: 2,
        pageSize: 20,
        keyword: undefined,
      },
    });
  });

  it('loads approval detail by id', async () => {
    mockHttpGet.mockResolvedValueOnce({ data: { id: 'ap-1' } } as never);

    await fetchApprovalDetail('ap-1');

    expect(mockHttpGet).toHaveBeenCalledWith('/approval-center/ap-1');
  });

  it('submits approve action with comment', async () => {
    mockHttpPost.mockResolvedValueOnce({ data: {} } as never);

    await approveApproval('ap-2', 'looks good');

    expect(mockHttpPost).toHaveBeenCalledWith('/approval-center/ap-2/approve', {
      comment: 'looks good',
    });
  });
});
