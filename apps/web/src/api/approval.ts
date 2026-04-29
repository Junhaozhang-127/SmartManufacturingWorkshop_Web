import type {
  ApprovalCenterTab,
  ApprovalDashboardSummary,
  ApprovalDetail,
  ApprovalListResult,
} from '@smw/shared';

import { http } from './client';

export async function fetchApprovalList(tab: ApprovalCenterTab, page = 1, pageSize = 10, keyword = '') {
  return http.get<never, { data: ApprovalListResult }>('/approval-center', {
    params: {
      tab,
      page,
      pageSize,
      keyword: keyword || undefined,
    },
  });
}

export async function fetchApprovalDetail(id: string) {
  return http.get<never, { data: ApprovalDetail }>(`/approval-center/${id}`);
}

export async function fetchTransferCandidates(id: string) {
  throw new Error('当前版本暂不支持审批转交');
}

export async function approveApproval(id: string, comment: string) {
  return http.post<never, { data: unknown }>(`/approval-center/${id}/approve`, { comment });
}

export async function rejectApproval(id: string, comment: string) {
  return http.post<never, { data: unknown }>(`/approval-center/${id}/reject`, { comment });
}

export async function returnApproval(id: string, comment: string) {
  return http.post<never, { data: unknown }>(`/approval-center/${id}/return`, { comment });
}

export async function transferApproval(id: string, targetUserId: string, comment: string) {
  throw new Error('当前版本暂不支持审批转交');
}

export async function commentApproval(id: string, comment: string) {
  return http.post<never, { data: unknown }>(`/approval-center/${id}/comment`, { comment });
}

export async function withdrawApproval(id: string, comment: string) {
  return http.post<never, { data: unknown }>(`/approval-center/${id}/withdraw`, { comment });
}

export async function resubmitApproval(id: string, comment: string) {
  return http.post<never, { data: unknown }>(`/approval-center/${id}/resubmit`, { comment });
}

export async function fetchApprovalDashboardSummary() {
  return http.get<never, { data: ApprovalDashboardSummary }>('/dashboard/approval-summary');
}
