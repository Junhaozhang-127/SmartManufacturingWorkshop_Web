import type { PageResult } from '../dto/pagination';

export enum AchievementType {
  PAPER = 'PAPER',
  COMPETITION = 'COMPETITION',
  SOFTWARE_COPYRIGHT = 'SOFTWARE_COPYRIGHT',
}

export enum AchievementStatus {
  DRAFT = 'DRAFT',
  IN_APPROVAL = 'IN_APPROVAL',
  RECOGNIZED = 'RECOGNIZED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface AchievementContributorItem {
  id: string;
  userId: string | null;
  contributorName: string;
  contributorRole: string;
  contributionRank: number;
  isInternal: boolean;
  contributionDescription: string | null;
}

export interface AchievementPaperDetail {
  journalName: string | null;
  publishDate: string | null;
  doi: string | null;
  indexedBy: string | null;
  authorOrder: string | null;
  correspondingAuthor: string | null;
}

export interface IpAssetDetail {
  assetType: string;
  certificateNo: string | null;
  registrationNo: string | null;
  authorizedDate: string | null;
  ownerUnit: string | null;
  remarks: string | null;
}

export interface AchievementItem {
  id: string;
  title: string;
  achievementType: AchievementType | string;
  statusCode: AchievementStatus | string;
  levelCode: string | null;
  recognizedGrade: string | null;
  scoreMapping: Record<string, unknown> | null;
  projectId: string | null;
  projectName: string | null;
  sourceCompetitionId: string | null;
  sourceCompetitionName: string | null;
  sourceTeamId: string | null;
  sourceTeamName: string | null;
  applicantUserId: string;
  applicantName: string;
  latestResult: string | null;
  approvalInstanceId: string | null;
  submittedAt: string | null;
  recognizedAt: string | null;
  createdAt: string;
  contributorNames: string[];
}

export type AchievementListResult = PageResult<AchievementItem>;

export interface AchievementDetail extends AchievementItem {
  description: string | null;
  paper: AchievementPaperDetail | null;
  ipAsset: IpAssetDetail | null;
  contributors: AchievementContributorItem[];
}
