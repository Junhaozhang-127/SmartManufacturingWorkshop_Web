import type {
  DeviceDashboardSummary,
  DeviceDetail,
  DeviceListResult,
  DeviceRepairDetail,
  DeviceRepairListResult,
} from '@smw/shared';

import { http } from './client';

export async function fetchDeviceList(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  statusCode?: string;
  responsibleUserId?: string;
}) {
  return http.get<never, { data: DeviceListResult }>('/devices', {
    params: {
      ...params,
      keyword: params.keyword || undefined,
      statusCode: params.statusCode || undefined,
      responsibleUserId: params.responsibleUserId || undefined,
    },
  });
}

export async function fetchDeviceDetail(id: string) {
  return http.get<never, { data: DeviceDetail }>(`/devices/${id}`);
}

export async function fetchDeviceRepairList(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  statusCode?: string;
  severity?: string;
  handlerUserId?: string;
}) {
  return http.get<never, { data: DeviceRepairListResult }>('/device-repairs', {
    params: {
      ...params,
      keyword: params.keyword || undefined,
      statusCode: params.statusCode || undefined,
      severity: params.severity || undefined,
      handlerUserId: params.handlerUserId || undefined,
    },
  });
}

export async function fetchDeviceRepairDetail(id: string) {
  return http.get<never, { data: DeviceRepairDetail }>(`/device-repairs/${id}`);
}

export async function createDeviceRepair(payload: {
  deviceId: string;
  faultDescription: string;
  severity: string;
  handlerUserId?: string;
  requestedAmount?: number;
  costEstimate?: number;
  fundLinkCode?: string;
  attachments?: Array<{ url: string }>;
}) {
  return http.post<never, { data: DeviceRepairDetail }>('/device-repairs', payload);
}

export async function assignDeviceRepair(id: string, payload: { handlerUserId: string; comment?: string }) {
  return http.post<never, { data: DeviceRepairDetail }>(`/device-repairs/${id}/assign`, payload);
}

export async function resolveDeviceRepair(
  id: string,
  payload: { resolutionSummary: string; handlerComment?: string; actualCost?: number },
) {
  return http.post<never, { data: DeviceRepairDetail }>(`/device-repairs/${id}/resolve`, payload);
}

export async function confirmDeviceRepair(id: string, payload: { comment?: string }) {
  return http.post<never, { data: DeviceRepairDetail }>(`/device-repairs/${id}/confirm`, payload);
}

export async function fetchDeviceDashboardSummary() {
  return http.get<never, { data: DeviceDashboardSummary }>('/dashboard/device-summary');
}
