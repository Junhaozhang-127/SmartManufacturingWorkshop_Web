import type { PageResult } from '../dto/pagination';
import type { MemberLatestEvaluationBrief } from './evaluation';
import type { MemberPromotionRecordItem } from './promotion';

export enum MemberStatus {
  INTERN = 'INTERN',
  REGULARIZATION_PENDING = 'REGULARIZATION_PENDING',
  REGULARIZATION_REJECTED = 'REGULARIZATION_REJECTED',
  ACTIVE = 'ACTIVE',
  TRANSFER_RESERVED = 'TRANSFER_RESERVED',
  EXIT_RESERVED = 'EXIT_RESERVED',
}

export enum MemberGrowthRecordType {
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  MENTOR_BOUND = 'MENTOR_BOUND',
  STAGE_EVALUATED = 'STAGE_EVALUATED',
  REGULARIZATION_APPLIED = 'REGULARIZATION_APPLIED',
  REGULARIZATION_APPROVED = 'REGULARIZATION_APPROVED',
  REGULARIZATION_REJECTED = 'REGULARIZATION_REJECTED',
  ROLE_UPDATED = 'ROLE_UPDATED',
}

export enum RegularizationStatus {
  DRAFT = 'DRAFT',
  IN_APPROVAL = 'IN_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum InternshipStageCode {
  ONBOARDING = 'ONBOARDING',
  FIRST_MONTH = 'FIRST_MONTH',
  MID_TERM = 'MID_TERM',
  REGULARIZATION = 'REGULARIZATION',
}

export interface OrgTreeNode {
  id: string;
  parentId: string | null;
  unitCode: string;
  unitName: string;
  unitType: string;
  leaderUserId: string | null;
  leaderName: string | null;
  memberCount: number;
  activeMemberCount: number;
  regularizationPendingCount: number;
  children: OrgTreeNode[];
}

export interface OrgOverviewSummary {
  orgUnitCount: number;
  memberCount: number;
  internCount: number;
  regularizationPendingCount: number;
}

export interface OrgOverviewResult {
  summary: OrgOverviewSummary;
  tree: OrgTreeNode[];
}

export interface MemberListItem {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  statusCode: string;
  positionCode: string;
  orgUnitId: string;
  orgUnitName: string;
  departmentName: string | null;
  mentorName: string | null;
  roleCodes: string[];
  skillTags: string[];
  joinDate: string;
}

export type MemberListResult = PageResult<MemberListItem>;

export interface MemberGrowthRecordItem {
  id: string;
  recordType: MemberGrowthRecordType | string;
  title: string;
  content: string | null;
  recordDate: string;
  actorName: string | null;
}

export interface MemberStageEvaluationItem {
  id: string;
  stageCode: InternshipStageCode | string;
  summary: string;
  score: number | null;
  resultCode: string;
  nextAction: string | null;
  evaluatorName: string;
  evaluatedAt: string;
}

export interface MemberOperationLogItem {
  id: string;
  actionType: string;
  fromStatus: string | null;
  toStatus: string | null;
  description: string;
  operatorName: string | null;
  createdAt: string;
}

export interface MemberRegularizationBrief {
  id: string;
  statusCode: RegularizationStatus | string;
  internshipStartDate: string;
  plannedRegularDate: string;
  submittedAt: string | null;
  completedAt: string | null;
  latestResult: string | null;
  approvalInstanceId: string | null;
}

export interface MemberProjectExperienceItem {
  projectKey: string;
  projectName: string;
  sourceTypes: string[];
  lastActivityDate: string | null;
}

export interface MemberRewardPenaltyItem {
  id: string;
  eventType: string;
  title: string;
  levelCode: string | null;
  scoreImpact: number;
  occurredAt: string;
  description: string | null;
}

export interface MemberDetail {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  canViewFull: boolean;
  mobile: string | null;
  email: string | null;
  statusCode: MemberStatus | string;
  positionCode: string;
  orgUnitId: string;
  orgUnitName: string;
  departmentName: string | null;
  mentorUserId: string | null;
  mentorName: string | null;
  joinDate: string;
  roleCodes: string[];
  skillTags: string[];
  growthRecords: MemberGrowthRecordItem[];
  stageEvaluations: MemberStageEvaluationItem[];
  operationLogs: MemberOperationLogItem[];
  latestRegularization: MemberRegularizationBrief | null;
  latestEvaluation: MemberLatestEvaluationBrief | null;
  promotionRecords: MemberPromotionRecordItem[];
  projectExperiences: MemberProjectExperienceItem[];
  rewardsAndPenalties: MemberRewardPenaltyItem[];
}

export interface MemberRegularizationItem {
  id: string;
  memberProfileId: string;
  displayName: string;
  username: string;
  orgUnitName: string;
  mentorName: string | null;
  statusCode: RegularizationStatus | string;
  memberStatus: MemberStatus | string;
  internshipStartDate: string;
  plannedRegularDate: string;
  submittedAt: string | null;
  completedAt: string | null;
  latestResult: string | null;
  approvalInstanceId: string | null;
}

export type MemberRegularizationListResult = PageResult<MemberRegularizationItem>;

export interface MemberRegularizationDetail extends MemberRegularizationItem {
  applicationReason: string;
  selfAssessment: string | null;
  stageEvaluations: MemberStageEvaluationItem[];
}
