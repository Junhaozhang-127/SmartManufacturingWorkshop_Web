import type { PageResult } from '../dto/pagination';

export enum PromotionApplicationStatus {
  IN_APPROVAL = 'IN_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  PUBLIC_NOTICE = 'PUBLIC_NOTICE',
  APPOINTED = 'APPOINTED',
  NOT_APPOINTED = 'NOT_APPOINTED',
}

export interface PromotionEligibilityItem {
  memberProfileId: string;
  userId: string;
  displayName: string;
  orgUnitName: string;
  currentPositionCode: string;
  targetPositionCode: string;
  schemeId: string;
  schemeName: string;
  latestEvaluationTotalScore: number | null;
  latestEvaluationResult: string | null;
  achievementCount: number;
  projectCount: number;
  qualified: boolean;
  reasons: string[];
  latestPromotionStatus: string | null;
}

export interface PromotionAppointmentItem {
  id: string;
  appointmentStatus: string;
  publicNoticeStatus: string;
  publicNoticeStartDate: string | null;
  publicNoticeEndDate: string | null;
  publicNoticeResult: string | null;
  appointedAt: string | null;
  latestResult: string | null;
}

export interface PromotionApplicationItem {
  id: string;
  applicationNo: string;
  memberProfileId: string;
  userId: string;
  displayName: string;
  orgUnitName: string;
  currentPositionCode: string;
  targetPositionCode: string;
  targetRoleCode: string | null;
  schemeId: string | null;
  schemeName: string | null;
  qualificationPassed: boolean;
  statusCode: PromotionApplicationStatus | string;
  latestResult: string | null;
  teamEvaluation: string | null;
  departmentReview: string | null;
  publicNoticeResult: string | null;
  approvalInstanceId: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export type PromotionApplicationListResult = PageResult<PromotionApplicationItem>;

export interface PromotionApplicationDetail extends PromotionApplicationItem {
  qualificationSnapshot: Record<string, unknown> | null;
  appointment: PromotionAppointmentItem | null;
}

export interface MemberPromotionRecordItem {
  id: string;
  applicationNo: string;
  targetPositionCode: string;
  statusCode: PromotionApplicationStatus | string;
  qualificationPassed: boolean;
  latestResult: string | null;
  publicNoticeResult: string | null;
  approvalInstanceId: string | null;
  submittedAt: string | null;
  completedAt: string | null;
}
