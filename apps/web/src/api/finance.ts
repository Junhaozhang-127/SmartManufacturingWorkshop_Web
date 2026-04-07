import type {
  FundAccountItem,
  FundApplicationDetail,
  FundApplicationListResult,
  FundOverviewSummary,
  ProjectFundDetail,
} from '@smw/shared';

import { http } from './client';

export async function fetchFundOverview() {
  return http.get<never, { data: FundOverviewSummary }>('/funds/overview');
}

export async function fetchFundAccounts() {
  return http.get<never, { data: FundAccountItem[] }>('/funds/accounts');
}

export async function fetchFundApplications(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  statusCode?: string;
  paymentStatus?: string;
  expenseType?: string;
  accountId?: string;
}) {
  return http.get<never, { data: FundApplicationListResult }>('/funds/applications', {
    params: {
      ...params,
      keyword: params.keyword || undefined,
      statusCode: params.statusCode || undefined,
      paymentStatus: params.paymentStatus || undefined,
      expenseType: params.expenseType || undefined,
      accountId: params.accountId || undefined,
    },
  });
}

export async function fetchFundApplicationDetail(id: string) {
  return http.get<never, { data: FundApplicationDetail }>(`/funds/applications/${id}`);
}

export async function createFundApplication(payload: {
  accountId: string;
  applicationType: string;
  expenseType: string;
  title: string;
  purpose: string;
  amount: number;
  reimbursementAmount?: number;
  payeeName?: string;
  projectId?: string;
  projectName?: string;
  relatedBusinessType?: string;
  relatedBusinessId?: string;
  attachments?: Array<{
      storageKey: string;
      fileName: string;
      downloadUrl: string;
      mimeType?: string | null;
      size?: number | null;
    }>;
}) {
  return http.post<never, { data: FundApplicationDetail }>('/funds/applications', payload);
}

export async function markFundApplicationPaid(id: string, payload: { paymentRemark?: string }) {
  return http.post<never, { data: FundApplicationDetail }>(`/funds/applications/${id}/pay`, payload);
}

export async function fetchProjectFundDetail(projectId: string) {
  return http.get<never, { data: ProjectFundDetail }>(`/funds/projects/${projectId}`);
}

export async function uploadFundAttachment(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return http.post<
    never,
    {
      data: {
        storageKey: string;
        fileName: string;
        downloadUrl: string;
        mimeType: string | null;
        size: number | null;
      };
    }
  >('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}
