import type {
  ApprovalDetail,
  MemberDetail,
  MemberListResult,
  MemberRegularizationDetail,
  MemberRegularizationListResult,
  MemberStageEvaluationItem,
  OrgOverviewResult,
} from '@smw/shared';

import { http } from './client';

export async function fetchOrgOverview() {
  return http.get<never, { data: OrgOverviewResult }>('/org-units/tree');
}

export async function fetchMemberList(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  orgUnitId?: string;
  statusCode?: string;
}) {
  return http.get<never, { data: MemberListResult }>('/members', {
    params: {
      ...params,
      keyword: params.keyword || undefined,
      orgUnitId: params.orgUnitId || undefined,
      statusCode: params.statusCode || undefined,
    },
  });
}

export async function fetchMemberDetail(id: string) {
  return http.get<never, { data: MemberDetail }>(`/members/${id}`);
}

export async function updateMember(
  id: string,
  payload: {
    orgUnitId?: string;
    positionCode?: string;
    mobile?: string;
    email?: string;
    skillTags?: string[];
  },
) {
  return http.patch<never, { data: MemberDetail }>(`/members/${id}`, payload);
}

export async function bindMentor(id: string, mentorUserId: string) {
  return http.post<never, { data: MemberDetail }>(`/members/${id}/mentor-binding`, { mentorUserId });
}

export async function createStageEvaluation(
  id: string,
  payload: {
    stageCode: string;
    summary: string;
    score?: number;
    resultCode: string;
    nextAction?: string;
  },
) {
  return http.post<never, { data: MemberStageEvaluationItem }>(`/members/${id}/stage-evaluations`, payload);
}

export async function fetchRegularizationList(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  statusCode?: string;
}) {
  return http.get<never, { data: MemberRegularizationListResult }>('/member-regularizations', {
    params: {
      ...params,
      keyword: params.keyword || undefined,
      statusCode: params.statusCode || undefined,
    },
  });
}

export async function fetchRegularizationDetail(id: string) {
  return http.get<never, { data: MemberRegularizationDetail }>(`/member-regularizations/${id}`);
}

export async function createRegularization(payload: {
  memberProfileId: string;
  internshipStartDate: string;
  plannedRegularDate: string;
  applicationReason: string;
  selfAssessment?: string;
}) {
  return http.post<never, { data: MemberRegularizationDetail }>('/member-regularizations', payload);
}

export async function approveRegularization(id: string, comment: string) {
  return http.post<never, { data: ApprovalDetail }>(`/member-regularizations/${id}/approve`, { comment });
}

export async function rejectRegularization(id: string, comment: string) {
  return http.post<never, { data: ApprovalDetail }>(`/member-regularizations/${id}/reject`, { comment });
}

export async function withdrawRegularization(id: string, comment: string) {
  return http.post<never, { data: ApprovalDetail }>(`/member-regularizations/${id}/withdraw`, { comment });
}

export async function fetchReservedTransferFeature() {
  return http.get<never, { data: { feature: string; status: string; message: string } }>('/member-transfers/reserved');
}

export async function fetchReservedExitFeature() {
  return http.get<never, { data: { feature: string; status: string; message: string } }>('/member-exits/reserved');
}
