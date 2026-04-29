import type {
  ConsumableDetail,
  ConsumableListResult,
  ConsumableRequestDetail,
  ConsumableRequestListResult,
  InventoryTxnListResult,
} from '@smw/shared';
import { InventoryTxnType } from '@smw/shared';

import { http } from './client';

export async function fetchConsumables(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  categoryName?: string;
  statusCode?: string;
  warningFlag?: 'true' | 'false' | '';
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

export async function createConsumableRequest(payload: {
  consumableId: string;
  quantity: number;
  purpose: string;
  projectId?: string;
  projectName?: string;
}) {
  return http.post<never, { data: ConsumableRequestDetail }>('/inventory/requests', payload);
}

export async function fetchConsumableRequests(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  categoryName?: string;
  statusCode?: string;
  warningFlag?: 'true' | 'false' | '';
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

export async function fetchInventoryTransactions(params: {
  page: number;
  pageSize: number;
  keyword?: string;
  txnType?: InventoryTxnType | '';
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

export async function createInventoryInbound(payload: {
  consumableId: string;
  quantity: number;
  projectId?: string;
  projectName?: string;
  remark?: string;
}) {
  return http.post<never, { data: ConsumableDetail }>('/inventory/transactions/inbound', payload);
}

export async function createInventoryOutbound(payload: {
  consumableId: string;
  quantity: number;
  projectId?: string;
  projectName?: string;
  remark?: string;
}) {
  return http.post<never, { data: ConsumableDetail }>('/inventory/transactions/outbound', payload);
}
