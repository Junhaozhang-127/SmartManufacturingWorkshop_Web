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

export type DeviceRepairListResult = PageResult<DeviceRepairSummaryItem>;

export interface DeviceRepairRelatedDevice {
  id: string;
  deviceCode: string;
  deviceName: string;
  categoryName: string;
  model: string | null;
  statusCode: DeviceStatus | string;
  responsibleUserId: string | null;
  responsibleUserName: string | null;
  locationLabel: string | null;
  latestRepairId: string | null;
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
  device: DeviceRepairRelatedDevice;
}

export interface DeviceDashboardSummary {
  abnormalDeviceCount: number;
  pendingRepairCount: number;
  processingRepairCount: number;
  recentRepairs: DeviceRepairSummaryItem[];
}
