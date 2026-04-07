import type {
  ConsumableDetail,
  ConsumableListResult,
  ConsumableRequestDetail,
  ConsumableRequestListResult,
  InventoryTxnListResult,
} from '@smw/shared';

import { http } from './client';

export async function fetchConsumableList(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  categoryName?: string;
  statusCode?: string;
  warningFlag?: string;
}) {
  return http.get<never, { data: ConsumableListResult }>('/inventory/consumables', {
    params: {
      ...params,
      keyword: params.keyword || undefined,
      categoryName: params.categoryName || undefined,
      statusCode: params.statusCode || undefined,
      warningFlag: params.warningFlag || undefined,
    },
  });
}

export async function fetchConsumableDetail(id: string) {
  return http.get<never, { data: ConsumableDetail }>(`/inventory/consumables/${id}`);
}

export async function createConsumable(payload: {
  consumableName: string;
  categoryName: string;
  specification?: string;
  unitName: string;
  warningThreshold: number;
  initialStock?: number;
  defaultLocation?: string;
}) {
  return http.post<never, { data: ConsumableDetail }>('/inventory/consumables', payload);
}

export async function fetchConsumableRequestList(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  categoryName?: string;
  statusCode?: string;
  warningFlag?: string;
}) {
  return http.get<never, { data: ConsumableRequestListResult }>('/inventory/requests', {
    params: {
      ...params,
      keyword: params.keyword || undefined,
      categoryName: params.categoryName || undefined,
      statusCode: params.statusCode || undefined,
      warningFlag: params.warningFlag || undefined,
    },
  });
}

export async function fetchConsumableRequestDetail(id: string) {
  return http.get<never, { data: ConsumableRequestDetail }>(`/inventory/requests/${id}`);
}

export async function createConsumableRequest(payload: {
  consumableId: string;
  quantity: number;
  purpose: string;
  projectId?: string;
  projectName?: string;
}) {
  return http.post<never, { data: ConsumableRequestDetail }>('/inventory/requests', payload);
}

export async function fetchInventoryTxnList(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  txnType?: string;
  consumableId?: string;
}) {
  return http.get<never, { data: InventoryTxnListResult }>('/inventory/transactions', {
    params: {
      ...params,
      keyword: params.keyword || undefined,
      txnType: params.txnType || undefined,
      consumableId: params.consumableId || undefined,
    },
  });
}

export async function createInboundTxn(payload: {
  consumableId: string;
  quantity: number;
  projectId?: string;
  projectName?: string;
  remark?: string;
}) {
  return http.post<never, { data: ConsumableDetail }>('/inventory/transactions/inbound', payload);
}

export async function createOutboundTxn(payload: {
  consumableId: string;
  quantity: number;
  projectId?: string;
  projectName?: string;
  remark?: string;
}) {
  return http.post<never, { data: ConsumableDetail }>('/inventory/transactions/outbound', payload);
}
