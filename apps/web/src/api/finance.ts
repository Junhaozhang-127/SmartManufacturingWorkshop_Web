import type {
  FundAccountItem,
  FundApplicationDetail,
  FundApplicationListResult,
  FundOverviewSummary,
  MyFundItem,
  ProjectFundDetail,
} from '@smw/shared';

import { downloadAttachment, uploadAttachment } from './attachments';
import { http } from './client';

export interface TeacherFundAccountItem {
  id: string;
  accountCode: string;
  accountName: string;
  categoryName: string;
  projectId: string | null;
  projectName: string | null;
  ownerOrgUnitId: string | null;
  ownerOrgUnitName: string | null;
  managerUserId: string | null;
  managerUserName: string | null;
  statusCode: string;
  totalBudget: number;
  reservedAmount: number;
  usedAmount: number;
  paidAmount: number;
  remarks: string | null;
  updatedAt: string;
}

export interface TeacherFundAccountListResult {
  items: TeacherFundAccountItem[];
  meta: { page: number; pageSize: number; total: number };
}

export async function fetchFundOverview() {
  return http.get<never, { data: FundOverviewSummary }>('/funds/overview');
}

export async function fetchFundAccounts() {
  return http.get<never, { data: FundAccountItem[] }>('/funds/accounts');
}

export async function fetchTeacherFundAccounts(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  statusCode?: string;
}) {
  return http.get<never, { data: TeacherFundAccountListResult }>('/funds/teacher/accounts', {
    params: {
      ...params,
      keyword: params.keyword || undefined,
      statusCode: params.statusCode || undefined,
    },
  });
}

export async function createTeacherFundAccount(payload: {
  accountCode: string;
  accountName: string;
  categoryName: string;
  projectId?: string;
  projectName?: string;
  ownerOrgUnitId?: string;
  managerUserId?: string;
  totalBudget: number;
  remarks?: string;
  statusCode?: string;
}) {
  return http.post<never, { data: { id: string } }>('/funds/teacher/accounts', payload);
}

export async function updateTeacherFundAccount(
  id: string,
  payload: {
    accountCode: string;
    accountName: string;
    categoryName: string;
    projectId?: string;
    projectName?: string;
    ownerOrgUnitId?: string;
    managerUserId?: string;
    totalBudget: number;
    remarks?: string;
    statusCode?: string;
  },
) {
  return http.patch<never, { data: null }>(`/funds/teacher/accounts/${id}`, payload);
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
  attachmentFileIds?: string[];
}) {
  return http.post<never, { data: FundApplicationDetail }>('/funds/applications', payload);
}

export async function markFundApplicationPaid(id: string, payload: { paymentRemark?: string }) {
  return http.post<never, { data: FundApplicationDetail }>(`/funds/applications/${id}/pay`, payload);
}

export async function fetchProjectFundDetail(projectId: string) {
  return http.get<never, { data: ProjectFundDetail }>(`/funds/projects/${projectId}`);
}

export async function fetchMyFunds() {
  return http.get<never, { data: MyFundItem[] }>('/profile/me/funds');
}

export async function uploadFundAttachment(file: File) {
  return uploadAttachment(file);
}

export async function downloadFundAttachment(fileId: string, fileName?: string) {
  return downloadAttachment(fileId, fileName);
}
