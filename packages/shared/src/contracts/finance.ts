import type { PageResult } from '../dto/pagination';

export enum FundAccountStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
}

export enum FundApplicationStatus {
  DRAFT = 'DRAFT',
  IN_APPROVAL = 'IN_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  PAID = 'PAID',
}

export enum FundPaymentStatus {
  UNPAID = 'UNPAID',
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export enum FundApplicationType {
  EXPENSE = 'EXPENSE',
  REIMBURSEMENT = 'REIMBURSEMENT',
}

export enum FundExpenseType {
  PROCUREMENT = 'PROCUREMENT',
  REIMBURSEMENT = 'REIMBURSEMENT',
  TRAVEL = 'TRAVEL',
  REPAIR = 'REPAIR',
  MAINTENANCE = 'MAINTENANCE',
  COMPETITION_REGISTRATION = 'COMPETITION_REGISTRATION',
  OTHER = 'OTHER',
}

export interface FundStatusLogItem {
  actionType: string;
  fromStatus: string | null;
  toStatus: string | null;
  operatorUserId: string | null;
  operatorName: string | null;
  comment: string | null;
  createdAt: string;
}

export interface FundAttachmentItem {
  storageKey: string;
  fileName: string;
  downloadUrl: string;
  mimeType: string | null;
  size: number | null;
}

export interface FundAccountItem {
  id: string;
  accountCode: string;
  accountName: string;
  statusCode: FundAccountStatus | string;
  projectId: string | null;
  projectName: string | null;
  categoryName: string;
  ownerOrgUnitId: string | null;
  ownerOrgUnitName: string | null;
  managerUserId: string | null;
  managerUserName: string | null;
  totalBudget: number;
  reservedAmount: number;
  usedAmount: number;
  paidAmount: number;
  availableAmount: number;
  lastExpenseAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FundApplicationItem {
  id: string;
  applicationNo: string;
  accountId: string;
  accountName: string;
  projectId: string | null;
  projectName: string | null;
  applicationType: FundApplicationType | string;
  expenseType: FundExpenseType | string;
  title: string;
  amount: number;
  reimbursementAmount: number | null;
  statusCode: FundApplicationStatus | string;
  paymentStatus: FundPaymentStatus | string;
  applicantUserId: string;
  applicantName: string;
  applicantRoleCode: string | null;
  payeeName: string | null;
  relatedBusinessType: string | null;
  relatedBusinessId: string | null;
  approvalInstanceId: string | null;
  latestResult: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  paidAt: string | null;
  updatedAt: string;
}

export interface FundApplicationDetail extends FundApplicationItem {
  purpose: string;
  paymentRemark: string | null;
  statusLogs: FundStatusLogItem[];
  attachments: FundAttachmentItem[];
  account: Pick<
    FundAccountItem,
    | 'id'
    | 'accountCode'
    | 'accountName'
    | 'statusCode'
    | 'projectId'
    | 'projectName'
    | 'categoryName'
    | 'totalBudget'
    | 'reservedAmount'
    | 'usedAmount'
    | 'paidAmount'
    | 'availableAmount'
  >;
}

export interface FundOverviewSummary {
  totalBudget: number;
  reservedAmount: number;
  usedAmount: number;
  paidAmount: number;
  availableAmount: number;
  pendingApprovalCount: number;
  accountCards: FundAccountItem[];
  latestApplications: FundApplicationItem[];
  recentExpensePlaceholder: Array<{
    label: string;
    value: string;
  }>;
}

export interface ProjectFundDetail {
  projectId: string;
  projectName: string | null;
  totalBudget: number;
  reservedAmount: number;
  usedAmount: number;
  paidAmount: number;
  availableAmount: number;
  accountCards: FundAccountItem[];
  applications: FundApplicationItem[];
  linkedRepairs: Array<{
    id: string;
    repairNo: string;
    deviceName: string;
    amount: number | null;
    fundLinkCode: string | null;
    statusCode: string;
  }>;
}

export type FundAccountListResult = PageResult<FundAccountItem>;
export type FundApplicationListResult = PageResult<FundApplicationItem>;
