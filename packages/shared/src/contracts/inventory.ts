import type { PageResult } from '../dto/pagination';

export enum ConsumableStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export enum ConsumableInventoryStatus {
  NORMAL = 'NORMAL',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISABLED = 'DISABLED',
}

export enum InventoryTxnType {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  REQUEST_OUTBOUND = 'REQUEST_OUTBOUND',
}

export enum ConsumableRequestStatus {
  DRAFT = 'DRAFT',
  IN_APPROVAL = 'IN_APPROVAL',
  FULFILLED = 'FULFILLED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  CANCELLED = 'CANCELLED',
}

export interface ConsumableItem {
  id: string;
  consumableCode: string;
  consumableName: string;
  categoryName: string;
  specification: string | null;
  unitName: string;
  statusCode: ConsumableStatus | string;
  inventoryStatus: ConsumableInventoryStatus | string;
  currentStock: number;
  warningThreshold: number;
  warningFlag: boolean;
  orgUnitId: string | null;
  orgUnitName: string | null;
  defaultLocation: string | null;
  lastTxnAt: string | null;
  replenishmentTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTxnItem {
  id: string;
  consumableId: string;
  consumableName: string;
  consumableCode: string;
  txnType: InventoryTxnType | string;
  quantity: number;
  balanceAfter: number;
  projectId: string | null;
  projectName: string | null;
  requestId: string | null;
  operatorUserId: string | null;
  operatorName: string | null;
  operatorRoleCode: string | null;
  remark: string | null;
  txnAt: string;
  createdAt: string;
}

export interface ConsumableRequestItem {
  id: string;
  requestNo: string;
  consumableId: string;
  consumableName: string;
  consumableCode: string;
  quantity: number;
  statusCode: ConsumableRequestStatus | string;
  purpose: string;
  projectId: string | null;
  projectName: string | null;
  applicantUserId: string;
  applicantName: string;
  applicantRoleCode: string | null;
  approvalInstanceId: string | null;
  latestResult: string | null;
  outboundTxnId: string | null;
  requestedAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface ConsumableRequestDetail extends ConsumableRequestItem {
  statusLogs: InventoryStatusLogItem[];
  consumable: Pick<
    ConsumableItem,
    | 'id'
    | 'consumableCode'
    | 'consumableName'
    | 'categoryName'
    | 'specification'
    | 'unitName'
    | 'inventoryStatus'
    | 'currentStock'
    | 'warningThreshold'
    | 'warningFlag'
  >;
}

export interface ConsumableDetail extends ConsumableItem {
  recentTxns: InventoryTxnItem[];
}

export interface InventoryStatusLogItem {
  actionType: string;
  fromStatus: string | null;
  toStatus: string | null;
  operatorUserId: string | null;
  operatorName: string | null;
  comment: string | null;
  createdAt: string;
}

export type ConsumableListResult = PageResult<ConsumableItem>;
export type InventoryTxnListResult = PageResult<InventoryTxnItem>;
export type ConsumableRequestListResult = PageResult<ConsumableRequestItem>;
