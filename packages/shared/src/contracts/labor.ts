import type { PageResult } from '../dto/pagination';

export enum LaborApplicationStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  RETURNED = 'RETURNED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  PAID = 'PAID',
}

export interface LaborApplicationItem {
  id: string;
  laborNo: string;
  laborType: string;
  title: string;
  reason: string;
  amount: number;
  statusCode: LaborApplicationStatus | string;
  latestResult: string | null;
  applicantUserId: string;
  applicantName: string;
  targetUserId: string;
  targetUserName: string;
  approvalInstanceId: string | null;
  submittedAt: string | null;
  paidAt: string | null;
  updatedAt: string;
}

export type LaborApplicationListResult = PageResult<LaborApplicationItem>;

export type LaborApplicationDetail = LaborApplicationItem;

