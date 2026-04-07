import type { PageResult } from '../dto/pagination';

export enum DeviceStatus {
  IDLE = 'IDLE',
  IN_USE = 'IN_USE',
  REPAIRING = 'REPAIRING',
  SCRAP_PENDING = 'SCRAP_PENDING',
  SCRAPPED = 'SCRAPPED',
}

export enum DeviceRepairStatus {
  DRAFT = 'DRAFT',
  IN_APPROVAL = 'IN_APPROVAL',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  RESOLVED = 'RESOLVED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum DeviceRepairSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum DeviceRepairAction {
  ASSIGN = 'ASSIGN',
  START_PROCESSING = 'START_PROCESSING',
  RESOLVE = 'RESOLVE',
  CONFIRM_RESULT = 'CONFIRM_RESULT',
  REQUEST_STATUS_RESTORE = 'REQUEST_STATUS_RESTORE',
  REQUEST_SCRAP = 'REQUEST_SCRAP',
}

export interface DeviceStatusLogItem {
  actionType: string;
  fromStatus: string | null;
  toStatus: string | null;
  operatorUserId: string | null;
  operatorName: string | null;
  comment: string | null;
  createdAt: string;
}

export interface DeviceRepairSummaryItem {
  id: string;
  repairNo: string;
  deviceId: string;
  deviceName: string;
  deviceCode: string;
  faultDescription: string;
  severity: DeviceRepairSeverity | string;
  statusCode: DeviceRepairStatus | string;
  applicantUserId: string;
  applicantName: string;
  handlerUserId: string | null;
  handlerName: string | null;
  approvalInstanceId: string | null;
  latestResult: string | null;
  requestedAmount: number | null;
  reportedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  confirmedAt: string | null;
}

export interface DeviceItem {
  id: string;
  deviceCode: string;
  deviceName: string;
  categoryName: string;
  model: string | null;
  statusCode: DeviceStatus | string;
  orgUnitId: string | null;
  orgUnitName: string | null;
  responsibleUserId: string | null;
  responsibleUserName: string | null;
  locationLabel: string | null;
  purchaseDate: string | null;
  warrantyUntil: string | null;
  latestRepairStatus: DeviceRepairStatus | string | null;
  latestRepairReportedAt: string | null;
  latestRepairId: string | null;
  abnormalRepairCount: number;
  createdAt: string;
  updatedAt: string;
}

export type DeviceListResult = PageResult<DeviceItem>;
export type DeviceRepairListResult = PageResult<DeviceRepairSummaryItem>;

export interface DeviceDetail extends DeviceItem {
  specification: string | null;
  manufacturer: string | null;
  serialNo: string | null;
  assetTag: string | null;
  purchaseAmount: number | null;
  remarks: string | null;
  extensions: {
    repairHistoryReserved: boolean;
    restoreRequestReserved: boolean;
    scrapRequestReserved: boolean;
  };
  statusLogs: DeviceStatusLogItem[];
  repairHistory: DeviceRepairSummaryItem[];
}

export interface DeviceRepairDetail extends DeviceRepairSummaryItem {
  deviceStatusBeforeRepair: string | null;
  applicantRoleCode: string | null;
  handlerComment: string | null;
  resolutionSummary: string | null;
  costEstimate: number | null;
  actualCost: number | null;
  fundLinkCode: string | null;
  attachments: string[];
  canCurrentUserConfirm: boolean;
  availableActions: DeviceRepairAction[];
  statusLogs: DeviceStatusLogItem[];
  device: Pick<
    DeviceDetail,
    | 'id'
    | 'deviceCode'
    | 'deviceName'
    | 'categoryName'
    | 'model'
    | 'statusCode'
    | 'responsibleUserId'
    | 'responsibleUserName'
    | 'locationLabel'
    | 'latestRepairId'
  >;
}

export interface DeviceDashboardSummary {
  abnormalDeviceCount: number;
  pendingRepairCount: number;
  processingRepairCount: number;
  recentRepairs: DeviceRepairSummaryItem[];
}
