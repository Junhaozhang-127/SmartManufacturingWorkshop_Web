import type {
  ApprovalDetail,
  EvalSchemeItem,
  EvalScoreListResult,
  EvalScoreRecordDetail,
  PromotionApplicationDetail,
  PromotionApplicationListResult,
  PromotionEligibilityItem,
} from '@smw/shared';

import { http } from './client';

export async function fetchEvaluationSchemes() {
  return http.get<never, { data: EvalSchemeItem[] }>('/evaluation-schemes');
}

export async function fetchEvaluationScores(params: {
  page: number;
  pageSize: number;
  schemeId?: string;
  keyword?: string;
  resultCode?: string;
}) {
  return http.get<never, { data: EvalScoreListResult }>('/evaluation-scores', {
    params: {
      ...params,
      schemeId: params.schemeId || undefined,
      keyword: params.keyword || undefined,
      resultCode: params.resultCode || undefined,
    },
  });
}

export async function fetchEvaluationScoreDetail(id: string) {
  return http.get<never, { data: EvalScoreRecordDetail }>(`/evaluation-scores/${id}`);
}

export async function refreshEvaluationScores(schemeId: string) {
  return http.post<never, { data: { refreshedCount: number } }>(`/evaluation-schemes/${schemeId}/refresh`);
}

export async function updateEvaluationManualScore(
  id: string,
  payload: {
    manualScore: number;
    manualComment?: string;
  },
) {
  return http.patch<never, { data: EvalScoreRecordDetail }>(`/evaluation-scores/${id}/manual-score`, payload);
}

export async function fetchPromotionEligibility(params: {
  page: number;
  pageSize: number;
  schemeId?: string;
  keyword?: string;
  targetPositionCode?: string;
  qualified?: boolean;
}) {
  return http.get<
    never,
    {
      data: {
        items: PromotionEligibilityItem[];
        meta: { page: number; pageSize: number; total: number };
        scheme: EvalSchemeItem;
      };
    }
  >('/promotion-eligibility', {
    params: {
      ...params,
      schemeId: params.schemeId || undefined,
      keyword: params.keyword || undefined,
      targetPositionCode: params.targetPositionCode || undefined,
      qualified: params.qualified ?? undefined,
    },
  });
}

export async function fetchPromotionApplications(params: {
  page: number;
  pageSize: number;
  schemeId?: string;
  keyword?: string;
  statusCode?: string;
  targetPositionCode?: string;
}) {
  return http.get<never, { data: PromotionApplicationListResult }>('/promotion-applications', {
    params: {
      ...params,
      schemeId: params.schemeId || undefined,
      keyword: params.keyword || undefined,
      statusCode: params.statusCode || undefined,
      targetPositionCode: params.targetPositionCode || undefined,
    },
  });
}

export async function fetchPromotionApplicationDetail(id: string) {
  return http.get<never, { data: PromotionApplicationDetail }>(`/promotion-applications/${id}`);
}

export async function createPromotionApplication(payload: {
  memberProfileId: string;
  schemeId?: string;
  targetPositionCode: string;
  targetRoleCode?: string;
}) {
  return http.post<never, { data: PromotionApplicationDetail }>('/promotion-applications', payload);
}

export async function updatePromotionReview(
  id: string,
  payload: {
    teamEvaluation?: string;
    departmentReview?: string;
  },
) {
  return http.patch<never, { data: PromotionApplicationDetail }>(`/promotion-applications/${id}/review`, payload);
}

export async function publishPromotionResult(
  id: string,
  payload: {
    publicNoticeStartDate: string;
    publicNoticeEndDate: string;
    appointmentPassed: boolean;
    publicNoticeResult?: string;
  },
) {
  return http.post<never, { data: PromotionApplicationDetail }>(`/promotion-applications/${id}/publish`, payload);
}

export async function approvePromotionApplication(id: string, comment: string) {
  return http.post<never, { data: ApprovalDetail }>(`/promotion-applications/${id}/approve`, { comment });
}

export async function rejectPromotionApplication(id: string, comment: string) {
  return http.post<never, { data: ApprovalDetail }>(`/promotion-applications/${id}/reject`, { comment });
}

export async function withdrawPromotionApplication(id: string, comment: string) {
  return http.post<never, { data: ApprovalDetail }>(`/promotion-applications/${id}/withdraw`, { comment });
}
