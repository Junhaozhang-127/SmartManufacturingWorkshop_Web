import type {
  HomeDashboardData,
  NotificationListResult,
  PersonalCenterData,
  SystemConfigPayload,
} from '@smw/shared';

import { http } from './client';

export async function fetchHomeDashboard() {
  return http.get<never, { data: HomeDashboardData }>('/dashboard/home');
}

export async function fetchPersonalCenter() {
  return http.get<never, { data: PersonalCenterData }>('/profile/me');
}

export async function updatePersonalCenter(payload: {
  displayName: string;
  studentNo?: string;
  mobile?: string;
  email?: string;
  avatarStorageKey?: string;
  avatarFileName?: string;
}) {
  return http.patch<never, { data: PersonalCenterData }>('/profile/me', payload);
}

export async function uploadProfileAvatar(file: File) {
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

export async function fetchNotifications(params: {
  page: number;
  pageSize: number;
  readStatus?: 'READ' | 'UNREAD' | '';
}) {
  return http.get<never, { data: NotificationListResult }>('/notifications', {
    params: {
      ...params,
      readStatus: params.readStatus || undefined,
    },
  });
}

export async function markNotificationAsRead(id: string) {
  return http.post<never, { data: unknown }>(`/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead() {
  return http.post<never, { data: { updatedCount: number } }>('/notifications/read-all');
}

export async function fetchSystemConfiguration() {
  return http.get<never, { data: SystemConfigPayload }>('/system/configuration');
}

export async function upsertDictionary(payload: {
  dictCode: string;
  dictName: string;
  description?: string;
  statusCode: string;
}) {
  return http.post<never, { data: SystemConfigPayload }>('/system/configuration/dictionaries', payload);
}

export async function upsertDictionaryItem(
  dictCode: string,
  payload: {
    itemCode: string;
    itemLabel: string;
    itemValue: string;
    sortNo: number;
    statusCode: string;
    extData?: Record<string, unknown>;
  },
) {
  return http.post<never, { data: SystemConfigPayload }>(`/system/configuration/dictionaries/${dictCode}/items`, payload);
}

export async function upsertConfigItem(payload: {
  configCategory: string;
  configKey: string;
  configName: string;
  configValue: string;
  valueType: string;
  statusCode: string;
  remark?: string;
  editable: boolean;
}) {
  return http.post<never, { data: SystemConfigPayload }>('/system/configuration/config-items', payload);
}

export async function upsertApprovalTemplate(
  businessType: string,
  payload: {
    templateCode: string;
    templateName: string;
    statusCode: string;
    nodes: Array<{
      nodeKey: string;
      nodeName: string;
      sortNo: number;
      approverRoleCode: string;
    }>;
  },
) {
  return http.post<never, { data: SystemConfigPayload }>(`/system/configuration/approval-templates/${businessType}`, payload);
}
