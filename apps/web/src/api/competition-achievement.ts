import type {
  AchievementDetail,
  AchievementListResult,
  CompetitionListResult,
  CompetitionWithTeams,
  UserOptionItem,
} from '@smw/shared';

import { http } from './client';

export async function fetchCompetitionList(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  statusCode?: string;
  competitionLevel?: string;
}) {
  return http.get<never, { data: CompetitionListResult }>('/competitions', {
    params: {
      ...params,
      keyword: params.keyword || undefined,
      statusCode: params.statusCode || undefined,
      competitionLevel: params.competitionLevel || undefined,
    },
  });
}

export async function fetchCompetitionDetail(id: string) {
  return http.get<never, { data: CompetitionWithTeams }>(`/competitions/${id}`);
}

export async function createCompetition(payload: {
  competitionCode: string;
  name: string;
  organizer: string;
  competitionLevel: string;
  competitionCategory: string;
  statusCode: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  description?: string;
}) {
  return http.post<never, { data: CompetitionWithTeams }>('/competitions', payload);
}

export async function updateCompetition(
  id: string,
  payload: {
    competitionCode: string;
    name: string;
    organizer: string;
    competitionLevel: string;
    competitionCategory: string;
    statusCode: string;
    registrationStartDate?: string;
    registrationEndDate?: string;
    eventStartDate?: string;
    eventEndDate?: string;
    description?: string;
  },
) {
  return http.patch<never, { data: CompetitionWithTeams }>(`/competitions/${id}`, payload);
}

export async function registerCompetitionTeam(
  competitionId: string,
  payload: {
    teamName: string;
    teamLeaderUserId: string;
    advisorUserId?: string;
    members: Array<{ userId: string }>;
    projectId?: string;
    projectName?: string;
    applicationReason?: string;
  },
) {
  return http.post<never, { data: unknown }>(`/competitions/${competitionId}/teams`, payload);
}

export async function fetchCompetitionOptions() {
  return http.get<never, { data: Array<{ id: string; label: string }> }>('/competitions/options');
}

export async function fetchAchievementUsers() {
  return http.get<never, { data: UserOptionItem[] }>('/achievement-users/options');
}

export async function fetchAchievementList(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  achievementType?: string;
  statusCode?: string;
  levelCode?: string;
  projectId?: string;
  memberUserId?: string;
}) {
  return http.get<never, { data: AchievementListResult }>('/achievements', {
    params: {
      ...params,
      keyword: params.keyword || undefined,
      achievementType: params.achievementType || undefined,
      statusCode: params.statusCode || undefined,
      levelCode: params.levelCode || undefined,
      projectId: params.projectId || undefined,
      memberUserId: params.memberUserId || undefined,
    },
  });
}

export async function fetchAchievementDetail(id: string) {
  return http.get<never, { data: AchievementDetail }>(`/achievements/${id}`);
}

export async function createAchievement(payload: {
  title: string;
  achievementType: string;
  levelCode?: string;
  projectId?: string;
  projectName?: string;
  sourceCompetitionId?: string;
  sourceTeamId?: string;
  description?: string;
  attachmentFileIds?: string[];
  contributors: Array<{
    userId?: string;
    contributorName: string;
    contributorRole: string;
    contributionRank: number;
    isInternal: boolean;
    contributionDescription?: string;
  }>;
  paper?: {
    journalName?: string;
    publishDate?: string;
    doi?: string;
    indexedBy?: string;
    authorOrder?: string;
    correspondingAuthor?: string;
  };
  ipAsset?: {
    assetType?: string;
    certificateNo?: string;
    registrationNo?: string;
    authorizedDate?: string;
    ownerUnit?: string;
    remarks?: string;
  };
  submitForApproval: boolean;
}) {
  return http.post<never, { data: AchievementDetail }>('/achievements', payload);
}

export async function updateAchievement(
  id: string,
  payload: {
    title: string;
    achievementType: string;
    levelCode?: string;
    projectId?: string;
    projectName?: string;
    sourceCompetitionId?: string;
    sourceTeamId?: string;
    description?: string;
    attachmentFileIds?: string[];
    contributors: Array<{
      userId?: string;
      contributorName: string;
      contributorRole: string;
      contributionRank: number;
      isInternal: boolean;
      contributionDescription?: string;
    }>;
    paper?: {
      journalName?: string;
      publishDate?: string;
      doi?: string;
      indexedBy?: string;
      authorOrder?: string;
      correspondingAuthor?: string;
    };
    ipAsset?: {
      assetType?: string;
      certificateNo?: string;
      registrationNo?: string;
      authorizedDate?: string;
      ownerUnit?: string;
      remarks?: string;
    };
    submitForApproval: boolean;
  },
) {
  return http.patch<never, { data: AchievementDetail }>(`/achievements/${id}`, payload);
}
