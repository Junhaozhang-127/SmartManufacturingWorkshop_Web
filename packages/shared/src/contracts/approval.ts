export enum ApprovalBusinessType {
  DEMO_REQUEST = 'DEMO_REQUEST',
  MEMBER_REGULARIZATION = 'MEMBER_REGULARIZATION',
  COMPETITION_REGISTRATION = 'COMPETITION_REGISTRATION',
  ACHIEVEMENT_RECOGNITION = 'ACHIEVEMENT_RECOGNITION',
  REPAIR_ORDER = 'REPAIR_ORDER',
  CONSUMABLE_REQUEST = 'CONSUMABLE_REQUEST',
  FUND_REQUEST = 'FUND_REQUEST',
  PROMOTION_REQUEST = 'PROMOTION_REQUEST',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum ApprovalActionType {
  SUBMIT = 'SUBMIT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  TRANSFER = 'TRANSFER',
  COMMENT = 'COMMENT',
  WITHDRAW = 'WITHDRAW',
  NODE_ENTER = 'NODE_ENTER',
}

export enum ApprovalCenterTab {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  RETURNED = 'RETURNED',
}

export interface ApprovalListItem {
  id: string;
  businessType: ApprovalBusinessType;
  businessId: string;
  title: string;
  status: ApprovalStatus;
  applicantUserId: string;
  applicantName: string;
  applicantRoleCode: string | null;
  currentNodeName: string | null;
  currentApproverRoleCode: string | null;
  currentApproverUserId: string | null;
  latestComment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalNodeLogItem {
  id: string;
  actionType: ApprovalActionType;
  nodeKey: string | null;
  nodeName: string | null;
  actorUserId: string;
  actorName: string;
  actorRoleCode: string | null;
  targetUserId: string | null;
  targetUserName: string | null;
  comment: string | null;
  createdAt: string;
}

export interface ApprovalDetail extends ApprovalListItem {
  formData: Record<string, unknown> | null;
  businessSnapshot: Record<string, unknown> | null;
  logs: ApprovalNodeLogItem[];
  availableActions: Array<'approve' | 'reject' | 'transfer' | 'comment' | 'withdraw'>;
}

export interface ApprovalListResult {
  items: ApprovalListItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface ApprovalDashboardSummary {
  pendingCount: number;
  processedCount: number;
  returnedCount: number;
  pendingItems: ApprovalListItem[];
  processedItems: ApprovalListItem[];
}

export interface DemoApprovalFormItem {
  id: string;
  title: string;
  reason: string;
  statusCode: string;
  approvalInstanceId: string | null;
  createdAt: string;
  updatedAt: string;
}
