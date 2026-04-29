import type { ProjectFundDetail } from '@smw/shared';

import {
  createTeacherFundAccount,
  fetchProjectFundDetail,
  fetchTeacherFundAccounts,
  type TeacherFundAccountItem,
  updateTeacherFundAccount,
} from './finance';

export interface ProjectLedgerItem {
  id: string;
  projectId: string | null;
  projectName: string | null;
  linkedFundAccountCode: string;
  linkedFundAccountName: string;
  categoryName: string;
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

export interface ProjectLedgerListResult {
  items: ProjectLedgerItem[];
  meta: { page: number; pageSize: number; total: number };
}

export interface UpsertProjectLedgerPayload {
  linkedFundAccountCode: string;
  linkedFundAccountName: string;
  categoryName: string;
  projectId?: string;
  projectName?: string;
  ownerOrgUnitId?: string;
  managerUserId?: string;
  totalBudget: number;
  remarks?: string;
  statusCode?: string;
}

function mapLedgerItem(item: TeacherFundAccountItem): ProjectLedgerItem {
  return {
    id: item.id,
    projectId: item.projectId,
    projectName: item.projectName,
    linkedFundAccountCode: item.accountCode,
    linkedFundAccountName: item.accountName,
    categoryName: item.categoryName,
    ownerOrgUnitId: item.ownerOrgUnitId,
    ownerOrgUnitName: item.ownerOrgUnitName,
    managerUserId: item.managerUserId,
    managerUserName: item.managerUserName,
    statusCode: item.statusCode,
    totalBudget: item.totalBudget,
    reservedAmount: item.reservedAmount,
    usedAmount: item.usedAmount,
    paidAmount: item.paidAmount,
    remarks: item.remarks,
    updatedAt: item.updatedAt,
  };
}

// TODO(project-api): Temporary compatibility layer.
// Backend has no dedicated project/task domain yet; this wrapper isolates UI from fund/account semantics.
export async function fetchProjectLedgers(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  statusCode?: string;
}) {
  const response = await fetchTeacherFundAccounts(params);
  const data: ProjectLedgerListResult = {
    items: response.data.items.map(mapLedgerItem),
    meta: response.data.meta,
  };
  return { ...response, data };
}

// TODO(project-api): Temporary compatibility layer.
export async function createProjectLedger(payload: UpsertProjectLedgerPayload) {
  return createTeacherFundAccount({
    accountCode: payload.linkedFundAccountCode,
    accountName: payload.linkedFundAccountName,
    categoryName: payload.categoryName,
    projectId: payload.projectId,
    projectName: payload.projectName,
    ownerOrgUnitId: payload.ownerOrgUnitId,
    managerUserId: payload.managerUserId,
    totalBudget: payload.totalBudget,
    remarks: payload.remarks,
    statusCode: payload.statusCode,
  });
}

// TODO(project-api): Temporary compatibility layer.
export async function updateProjectLedger(id: string, payload: UpsertProjectLedgerPayload) {
  return updateTeacherFundAccount(id, {
    accountCode: payload.linkedFundAccountCode,
    accountName: payload.linkedFundAccountName,
    categoryName: payload.categoryName,
    projectId: payload.projectId,
    projectName: payload.projectName,
    ownerOrgUnitId: payload.ownerOrgUnitId,
    managerUserId: payload.managerUserId,
    totalBudget: payload.totalBudget,
    remarks: payload.remarks,
    statusCode: payload.statusCode,
  });
}

// TODO(project-api): Temporary compatibility layer.
export async function fetchProjectDetailProfile(projectId: string) {
  return fetchProjectFundDetail(projectId) as Promise<{ data: ProjectFundDetail }>;
}

// TODO(project-api): Backend gap. No standalone task domain API yet.
