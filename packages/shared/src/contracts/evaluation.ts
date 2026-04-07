import type { PageResult } from '../dto/pagination';

export enum EvaluationResultCode {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  PASS = 'PASS',
  FAIL = 'FAIL',
}

export interface EvalSchemeItem {
  id: string;
  schemeCode: string;
  schemeName: string;
  periodKey: string;
  startDate: string;
  endDate: string;
  statusCode: string;
}

export interface EvalScoreRecordItem {
  id: string;
  schemeId: string;
  schemeName: string;
  periodKey: string;
  memberProfileId: string;
  userId: string;
  displayName: string;
  orgUnitName: string;
  positionCode: string;
  achievementCount: number;
  projectCount: number;
  rewardPenaltyCount: number;
  autoScore: number;
  manualScore: number;
  totalScore: number;
  resultCode: EvaluationResultCode | string;
  latestResult: string | null;
  evaluatorName: string | null;
  updatedAt: string;
}

export type EvalScoreListResult = PageResult<EvalScoreRecordItem>;

export interface EvalScoreRecordDetail extends EvalScoreRecordItem {
  autoScoreDetail: Record<string, unknown> | null;
  manualScoreDetail: Record<string, unknown> | null;
  manualComment: string | null;
}

export interface MemberLatestEvaluationBrief {
  id: string;
  schemeId: string;
  schemeName: string;
  periodKey: string;
  autoScore: number;
  manualScore: number;
  totalScore: number;
  resultCode: EvaluationResultCode | string;
  updatedAt: string;
}
