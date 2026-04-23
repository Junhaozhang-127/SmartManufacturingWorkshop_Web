import type { PageResult } from '../dto/pagination';

export enum CompetitionStatus {
  DRAFT = 'DRAFT',
  NOT_STARTED = 'NOT_STARTED',
  REGISTRATION_OPEN = 'REGISTRATION_OPEN',
  REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
  IN_PROGRESS = 'IN_PROGRESS',
  ENDED = 'ENDED',
  ARCHIVED = 'ARCHIVED',
}

export enum CompetitionRegistrationStatus {
  DRAFT = 'DRAFT',
  IN_APPROVAL = 'IN_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface CompetitionItem {
  id: string;
  name: string;
  location: string | null;
  competitionLevel: string;
  involvedField: string | null;
  statusCode: CompetitionStatus | string;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  eventStartDate: string | null;
  eventEndDate: string | null;
  description: string | null;
  createdAt: string;
}

export type CompetitionListResult = PageResult<CompetitionItem>;

export interface CompetitionTeamItem {
  id: string;
  competitionId: string;
  competitionName: string;
  teamName: string;
  teamLeaderUserId: string;
  teamLeaderName: string;
  advisorUserId: string | null;
  advisorName: string | null;
  memberUserIds: string[];
  memberNames: string[];
  projectId: string | null;
  projectName: string | null;
  applicationReason: string | null;
  statusCode: CompetitionRegistrationStatus | string;
  latestResult: string | null;
  approvalInstanceId: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CompetitionWithTeams extends CompetitionItem {
  teams: CompetitionTeamItem[];
}

export interface UserOptionItem {
  id: string;
  label: string;
  username: string;
  roleCodes: string[];
}
