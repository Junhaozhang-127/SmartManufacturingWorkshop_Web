import type { AxiosProgressEvent } from 'axios';

import { http } from './client';

export type FileCategory = 'DOCUMENT' | 'ARCHIVE' | 'IMAGE' | 'OTHER';

export interface AttachmentItem {
  fileId: string;
  originalName: string;
  fileExt?: string;
  mimeType?: string | null;
  fileSize?: number;
  fileCategory?: FileCategory;
  createdAt?: string;
  expiresAt?: string | null;
  uploadedBy?: string;
  uploadedByName?: string;
  downloadUrl?: string;
  previewUrl?: string;
}

export async function uploadAttachment(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return http.post<never, { data: AttachmentItem }>('/attachments/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

export async function uploadAttachmentWithProgress(
  file: File,
  options?: {
    onUploadProgress?: (event: AxiosProgressEvent) => void;
  },
) {
  const formData = new FormData();
  formData.append('file', file);

  return http.post<never, { data: AttachmentItem }>('/attachments/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: options?.onUploadProgress,
  });
}

export async function listBusinessAttachments(params: { businessType: string; businessId: string; usageType: string }) {
  return http.get<never, { data: AttachmentItem[] }>('/attachments', { params });
}

export async function bindBusinessAttachments(payload: {
  businessType: string;
  businessId: string;
  usageType: string;
  fileIds: string[];
}) {
  return http.post<never, { data: AttachmentItem[] }>('/attachments/bind', payload);
}

export async function unbindBusinessAttachment(params: {
  businessType: string;
  businessId: string;
  usageType: string;
  fileId: string;
}) {
  return http.delete<never, { data: null }>('/attachments/unbind', { params });
}

export async function listMyTempAttachments() {
  return http.get<never, { data: AttachmentItem[] }>('/attachments/temp');
}

export async function deleteMyTempAttachment(fileId: string) {
  return http.delete<never, { data: null }>(`/attachments/temp/${encodeURIComponent(fileId)}`);
}

export async function downloadAttachment(fileId: string, fileName?: string) {
  return http.get<never, Blob>(`/attachments/${encodeURIComponent(fileId)}/download`, {
    params: {
      name: fileName,
    },
    responseType: 'blob',
  });
}

