import { http } from './client';

export type CreationStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type HomeSection = 'CAROUSEL' | 'NEWS' | 'NOTICE' | 'ACHIEVEMENT' | 'COMPETITION' | 'MEMBER_INTRO';

export async function createCreationDraft(payload?: {
  title?: string;
  summary?: string;
  body?: string;
  coverStorageKey?: string;
  coverFileName?: string;
}) {
  return http.post<never, { data: { id: string } }>('/creation/contents', payload ?? {});
}

export async function fetchMyCreationContents(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  statusCode?: CreationStatus | '';
}) {
  return http.get<
    never,
    {
      data: {
        items: Array<{
          id: string;
          title: string;
          summary: string | null;
          statusCode: CreationStatus;
          submittedAt: string | null;
          reviewedAt: string | null;
          reviewComment: string | null;
          inKnowledgeBase: boolean;
          recommendToHome: boolean;
          homeSection: string | null;
          createdAt: string | null;
          updatedAt: string | null;
        }>;
        meta: { page: number; pageSize: number; total: number };
      };
    }
  >('/creation/contents/my', { params });
}

export async function fetchCreationDetail(id: string) {
  return http.get<
    never,
    {
      data: {
        id: string;
        title: string;
        summary: string | null;
        body: string | null;
        coverStorageKey: string | null;
        coverFileName: string | null;
        coverUrl: string | null;
        author: { id: string; displayName: string };
        statusCode: CreationStatus;
        submittedAt: string | null;
        reviewer: { id: string; displayName: string } | null;
        reviewComment: string | null;
        reviewedAt: string | null;
        inKnowledgeBase: boolean;
        recommendToHome: boolean;
        homeSection: string | null;
        portalContentId: string | null;
        portalCarouselId: string | null;
        createdAt: string | null;
        updatedAt: string | null;
      };
    }
  >(`/creation/contents/${id}`);
}

export async function updateCreationContent(
  id: string,
  payload: {
    title?: string;
    summary?: string;
    body?: string;
    coverStorageKey?: string;
    coverFileName?: string;
  },
) {
  return http.patch<never, { data: null }>(`/creation/contents/${id}`, payload);
}

export async function submitCreationContent(id: string) {
  return http.post<never, { data: null }>(`/creation/contents/${id}/submit`);
}

export async function uploadCreationCover(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return http.post<
    never,
    {
      data: {
        storageKey: string;
        fileName: string;
        downloadUrl: string;
        mimeType: string | null;
        size: number | null;
      };
    }
  >('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

export async function fetchReviewPending(params: { page?: number; pageSize?: number; keyword?: string }) {
  return http.get<
    never,
    {
      data: {
        items: Array<{
          id: string;
          title: string;
          summary: string | null;
          statusCode: CreationStatus;
          submittedAt: string | null;
          coverUrl: string | null;
          author: { id: string; displayName: string };
        }>;
        meta: { page: number; pageSize: number; total: number };
      };
    }
  >('/creation/review/pending', { params });
}

export async function fetchReviewApproved(params: { page?: number; pageSize?: number; keyword?: string }) {
  return http.get<
    never,
    {
      data: {
        items: Array<{
          id: string;
          title: string;
          summary: string | null;
          reviewedAt: string | null;
          reviewComment: string | null;
          author: { id: string; displayName: string };
          reviewer: { id: string; displayName: string } | null;
          inKnowledgeBase: boolean;
          recommendToHome: boolean;
          homeSection: string | null;
          portalContentId: string | null;
          portalCarouselId: string | null;
        }>;
        meta: { page: number; pageSize: number; total: number };
      };
    }
  >('/creation/review/approved', { params });
}

export async function approveCreationContent(
  id: string,
  payload: { publishMode?: 'KNOWLEDGE' | 'HOME' | 'BOTH'; homeSection?: HomeSection; reviewComment?: string },
) {
  return http.post<never, { data: null }>(`/creation/review/${id}/approve`, payload);
}

export async function rejectCreationContent(id: string, payload: { reviewComment: string }) {
  return http.post<never, { data: null }>(`/creation/review/${id}/reject`, payload);
}

export async function publishCreationContent(
  id: string,
  payload: { inKnowledgeBase?: boolean; recommendToHome?: boolean; homeSection?: HomeSection },
) {
  return http.patch<never, { data: null }>(`/creation/review/${id}/publish`, payload);
}

export async function fetchKnowledgeContents(params: { page?: number; pageSize?: number; keyword?: string }) {
  return http.get<
    never,
    {
      data: {
        items: Array<{
          id: string;
          title: string;
          summary: string | null;
          coverUrl: string | null;
          reviewedAt: string | null;
          author: { id: string; displayName: string };
        }>;
        meta: { page: number; pageSize: number; total: number };
      };
    }
  >('/knowledge/contents', { params });
}

export async function fetchKnowledgeDetail(id: string) {
  return http.get<
    never,
    {
      data: {
        id: string;
        title: string;
        summary: string | null;
        body: string | null;
        coverUrl: string | null;
        author: { id: string; displayName: string };
        reviewer: { id: string; displayName: string } | null;
        reviewedAt: string | null;
        createdAt: string | null;
        updatedAt: string | null;
      };
    }
  >(`/knowledge/contents/${id}`);
}

