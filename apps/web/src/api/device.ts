import type { DeviceDashboardSummary, DeviceRepairDetail, DeviceRepairListResult } from '@smw/shared';

import { http } from './client';

export interface DeviceLedgerListItem {
  id: string;
  deviceCode: string;
  deviceName: string;
  categoryName: string;
  model: string | null;
  statusCode: string;
  orgUnitId: string | null;
  orgUnitName: string | null;
  responsibleUserId: string | null;
  responsibleUserName: string | null;
  locationLabel: string | null;
  latestRepairId: string | null;
  latestRepairNo: string | null;
  latestRepairStatus: string | null;
  updatedAt: string;
}

export interface DeviceLedgerListResult {
  items: DeviceLedgerListItem[];
  meta: { page: number; pageSize: number; total: number };
}

export interface DeviceLedgerDetail {
  id: string;
  deviceCode: string;
  deviceName: string;
  categoryName: string;
  model: string | null;
  specification: string | null;
  manufacturer: string | null;
  serialNo: string | null;
  assetTag: string | null;
  statusCode: string;
  orgUnitId: string | null;
  orgUnitName: string | null;
  responsibleUserId: string | null;
  responsibleUserName: string | null;
  locationLabel: string | null;
  purchaseDate: string | null;
  warrantyUntil: string | null;
  purchaseAmount: number | null;
  remarks: string | null;
  latestRepairId: string | null;
  statusChangedAt: string | null;
  statusLogs: Array<{
    actionType: string;
    fromStatus: string | null;
    toStatus: string | null;
    operatorUserId: string | null;
    operatorName: string | null;
    comment: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  latestRepair: {
    id: string;
    repairNo: string;
    statusCode: string;
    latestResult: string | null;
    reportedAt: string;
  } | null;
}

export async function createDevice(payload: {
  deviceCode: string;
  deviceName: string;
  categoryName: string;
  model?: string;
  locationLabel?: string;
  orgUnitId?: string;
  responsibleUserId?: string;
  statusCode?: string;
  remarks?: string;
}) {
  return http.post<never, { data: DeviceLedgerDetail }>('/devices', payload);
}

export async function fetchDeviceLedgerList(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  statusCode?: string;
}) {
  return http.get<never, { data: DeviceLedgerListResult }>('/devices', {
    params: {
      ...params,
      keyword: params.keyword || undefined,
      statusCode: params.statusCode || undefined,
    },
  });
}

export async function fetchDeviceLedgerDetail(id: string) {
  return http.get<never, { data: DeviceLedgerDetail }>(`/devices/${id}`);
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
