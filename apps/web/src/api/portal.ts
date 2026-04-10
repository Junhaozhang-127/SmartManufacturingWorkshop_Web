import { http } from './client';

export type PortalContentType = 'NEWS' | 'NOTICE' | 'ACHIEVEMENT' | 'COMPETITION' | 'MEMBER_INTRO';

export interface PortalHomeResponse {
  carousel: Array<{
    id: string;
    title: string;
    summary: string | null;
    targetUrl: string | null;
    themeCode: 'blue' | 'gold' | 'teal';
    imageUrl: string | null;
  }>;
  news: Array<{ id: string; title: string; publishedAt: string }>;
  notices: Array<{ id: string; title: string; publishedAt: string }>;
  achievements: Array<{ id: string; title: string; summary: string | null; coverUrl: string | null }>;
  competitions: Array<{ id: string; title: string; summary: string | null; coverUrl: string | null }>;
  members: Array<{ id: string; title: string; summary: string | null; coverUrl: string | null }>;
}

export async function fetchPortalHome() {
  return http.get<never, { data: PortalHomeResponse }>('/portal/home');
}

export async function fetchPortalContentList(params: { contentType: PortalContentType; page?: number; pageSize?: number }) {
  return http.get<
    never,
    {
    data: {
      items: Array<{ id: string; title: string; summary: string | null; coverUrl: string | null; publishedAt: string }>;
      meta: { page: number; pageSize: number; total: number };
    };
  }
  >('/portal/contents', { params });
}

export async function fetchPortalContentDetail(id: string) {
  return http.get<
    never,
    {
    data: {
      id: string;
      contentType: PortalContentType;
      title: string;
      summary: string | null;
      body: string | null;
      coverUrl: string | null;
      linkUrl: string | null;
      publishedAt: string;
    };
  }
  >(`/portal/contents/${id}`);
}

export async function uploadPortalAsset(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return http.post<never, { data: { storageKey: string; fileName: string; previewUrl: string } }>(
    '/portal/admin/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
}

export async function fetchPortalAdminCarousel(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  statusCode?: 'ACTIVE' | 'INACTIVE' | '';
}) {
  return http.get<
    never,
    {
    data: {
      items: Array<{
        id: string;
        title: string;
        summary: string | null;
        imageStorageKey: string | null;
        imageFileName: string | null;
        imageUrl: string | null;
        targetUrl: string | null;
        themeCode: 'blue' | 'gold' | 'teal';
        sortNo: number | null;
        statusCode: 'ACTIVE' | 'INACTIVE';
        sourceType: 'MANUAL' | 'KNOWLEDGE';
        sourceCreationId: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
      meta: { page: number; pageSize: number; total: number };
    };
  }
  >('/portal/admin/carousel', { params });
}

export async function createPortalAdminCarousel(payload: {
  title: string;
  summary?: string;
  imageStorageKey?: string;
  imageFileName?: string;
  targetUrl?: string;
  themeCode?: 'blue' | 'gold' | 'teal';
  sortNo?: number;
  statusCode?: 'ACTIVE' | 'INACTIVE';
}) {
  return http.post<never, { data: { id: string } }>('/portal/admin/carousel', payload);
}

export async function updatePortalAdminCarousel(
  id: string,
  payload: {
    title: string;
    summary?: string;
    imageStorageKey?: string;
    imageFileName?: string;
    targetUrl?: string;
    themeCode?: 'blue' | 'gold' | 'teal';
    sortNo?: number;
    statusCode?: 'ACTIVE' | 'INACTIVE';
  },
) {
  return http.patch<never, { data: null }>(`/portal/admin/carousel/${id}`, payload);
}

export async function deletePortalAdminCarousel(id: string) {
  return http.delete<never, { data: null }>(`/portal/admin/carousel/${id}`);
}

export async function fetchPortalAdminContents(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  contentType?: PortalContentType | '';
  statusCode?: 'ACTIVE' | 'INACTIVE' | '';
}) {
  return http.get<
    never,
    {
    data: {
      items: Array<{
        id: string;
        contentType: PortalContentType;
        title: string;
        summary: string | null;
        body: string | null;
        coverStorageKey: string | null;
        coverFileName: string | null;
        coverUrl: string | null;
        linkUrl: string | null;
        sortNo: number | null;
        statusCode: 'ACTIVE' | 'INACTIVE';
        sourceType: 'MANUAL' | 'KNOWLEDGE';
        sourceCreationId: string | null;
        publishedAt: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
      meta: { page: number; pageSize: number; total: number };
    };
  }
  >('/portal/admin/contents', { params });
}

export async function createPortalAdminContent(payload: {
  contentType: PortalContentType;
  title: string;
  summary?: string;
  body?: string;
  coverStorageKey?: string;
  coverFileName?: string;
  linkUrl?: string;
  sortNo?: number;
  statusCode?: 'ACTIVE' | 'INACTIVE';
}) {
  return http.post<never, { data: { id: string } }>('/portal/admin/contents', payload);
}

export async function updatePortalAdminContent(
  id: string,
  payload: {
    contentType: PortalContentType;
    title: string;
    summary?: string;
    body?: string;
    coverStorageKey?: string;
    coverFileName?: string;
    linkUrl?: string;
    sortNo?: number;
    statusCode?: 'ACTIVE' | 'INACTIVE';
  },
) {
  return http.patch<never, { data: null }>(`/portal/admin/contents/${id}`, payload);
}

export async function deletePortalAdminContent(id: string) {
  return http.delete<never, { data: null }>(`/portal/admin/contents/${id}`);
}
