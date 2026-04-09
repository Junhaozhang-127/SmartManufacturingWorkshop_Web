import type { ApprovalBusinessType, ApprovalListItem } from './approval';
import type { QuickEntry, RoleOption, UserOrgProfile } from './auth';

export interface DashboardMetricCard {
  code: string;
  title: string;
  value: number;
  unit?: string;
  trendLabel?: string;
  description: string;
  path?: string;
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export interface DashboardShortcutGroup {
  title: string;
  entries: QuickEntry[];
}

export interface DashboardNotificationItem {
  id: string;
  title: string;
  content: string;
  categoryCode: string;
  levelCode: string;
  businessType: ApprovalBusinessType | string | null;
  businessId: string | null;
  routePath: string | null;
  routeQuery: Record<string, string> | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface HomeDashboardData {
  roleCode: string;
  roleName: string;
  metricCards: DashboardMetricCard[];
  shortcutGroups: DashboardShortcutGroup[];
  todoSummary: {
    pendingApprovalCount: number;
    unreadNotificationCount: number;
    myApplicationCount: number;
    qualificationReminderCount: number;
  };
  pendingApprovals: ApprovalListItem[];
  myApplications: ApprovalListItem[];
  notifications: DashboardNotificationItem[];
}

export interface PersonalCenterData {
  userId: string;
  username: string;
  displayName: string;
  studentNo?: string | null;
  mobile: string | null;
  email: string | null;
  avatarUrl?: string | null;
  statusCode: string;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  orgProfile: UserOrgProfile;
  activeRole: RoleOption;
  roles: RoleOption[];
  quickLinks: QuickEntry[];
  stats: {
    unreadNotificationCount: number;
    pendingApprovalCount: number;
    myApplicationCount: number;
  };
  pendingApprovals: ApprovalListItem[];
  myApplications: ApprovalListItem[];
  recentNotifications: DashboardNotificationItem[];
}

export interface NotificationListResult {
  items: DashboardNotificationItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    unreadCount: number;
  };
}

export interface DictionaryItemSetting {
  id: string;
  itemCode: string;
  itemLabel: string;
  itemValue: string;
  sortNo: number;
  statusCode: string;
  extData: Record<string, unknown> | null;
}

export interface DictionaryTypeSetting {
  id: string;
  dictCode: string;
  dictName: string;
  description: string | null;
  statusCode: string;
  systemFlag: boolean;
  items: DictionaryItemSetting[];
}

export interface ConfigItemSetting {
  id: string;
  configCategory: string;
  configKey: string;
  configName: string;
  configValue: string;
  valueType: string;
  statusCode: string;
  remark: string | null;
  editable: boolean;
}

export interface ApprovalTemplateNodeSetting {
  id: string;
  nodeKey: string;
  nodeName: string;
  sortNo: number;
  approverRoleCode: string;
}

export interface ApprovalTemplateSetting {
  id: string;
  templateCode: string;
  templateName: string;
  businessType: string;
  statusCode: string;
  nodes: ApprovalTemplateNodeSetting[];
}

export interface SystemConfigPayload {
  dictionaries: DictionaryTypeSetting[];
  configs: ConfigItemSetting[];
  approvalTemplates: ApprovalTemplateSetting[];
}
