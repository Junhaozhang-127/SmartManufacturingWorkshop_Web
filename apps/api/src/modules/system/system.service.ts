import { randomUUID } from 'node:crypto';

import { buildMemberProfileWhere } from '@api/modules/auth/data-scope-prisma';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AchievementStatus,
  ApprovalBusinessType,
  ApprovalStatus,
  type CurrentUserProfile,
  DataScope,
  type HomeDashboardData,
  type MyFundItem,
  normalizePagination,
  type NotificationListResult,
  type PersonalCenterData,
  RoleCode,
  type SystemConfigPayload,
} from '@smw/shared';

import { AttachmentsService } from '../attachments/attachments.service';
import { PrismaService } from '../prisma/prisma.service';
import type { NotificationQueryDto } from './dto/notification-query.dto';
import type { UpdatePersonalCenterDto } from './dto/update-personal-center.dto';
import type { UpsertApprovalTemplateDto } from './dto/upsert-approval-template.dto';
import type { UpsertConfigItemDto } from './dto/upsert-config-item.dto';
import type { UpsertDictionaryDto } from './dto/upsert-dictionary.dto';
import type { UpsertDictionaryItemDto } from './dto/upsert-dictionary-item.dto';

type ApprovalInstanceRecord = Prisma.WfApprovalInstanceGetPayload<{
  include: {
    applicant: true;
    currentApprover: true;
  };
}>;

type NotificationRecord = Prisma.SysNotificationGetPayload<Record<string, never>>;

@Injectable()
export class SystemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  private async collectOrgDescendantIds(rootOrgUnitId: string) {
    const units = await this.prisma.orgUnit.findMany({
      where: { isDeleted: false, statusCode: 'ACTIVE' },
      select: { id: true, parentId: true },
    });

    const targetIds = new Set<string>([rootOrgUnitId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const unit of units) {
        if (unit.parentId && targetIds.has(String(unit.parentId)) && !targetIds.has(String(unit.id))) {
          targetIds.add(String(unit.id));
          changed = true;
        }
      }
    }

    return [...targetIds];
  }

  async getHomeDashboard(currentUser: CurrentUserProfile): Promise<HomeDashboardData> {
    const [pendingApprovals, myApplications, notifications, metricCards, todoSummary] = await Promise.all([
      this.listPendingApprovalItems(currentUser, 5),
      this.listMyApplicationItems(currentUser, 5),
      this.fetchNotificationItems(currentUser.id, 5),
      this.buildMetricCards(currentUser),
      this.buildTodoSummary(currentUser),
    ]);

    return {
      roleCode: currentUser.activeRole.roleCode,
      roleName: currentUser.activeRole.roleName,
      metricCards,
      shortcutGroups: [
        {
          title: '快捷入口',
          entries: currentUser.dashboard.shortcutEntries,
        },
      ],
      todoSummary,
      pendingApprovals,
      myApplications,
      notifications,
    };
  }

  async getPersonalCenter(currentUser: CurrentUserProfile): Promise<PersonalCenterData> {
    const user = await this.loadUserRecord(currentUser.id);
    const [pendingApprovals, myApplications, recentNotifications, stats] = await Promise.all([
      this.listPendingApprovalItems(currentUser, 5),
      this.listMyApplicationItems(currentUser, 5),
      this.fetchNotificationItems(currentUser.id, 5),
      this.buildTodoSummary(currentUser),
    ]);

    return {
      userId: String(user.id),
      username: user.username,
      displayName: user.displayName,
      studentNo: user.studentNo ?? null,
      mobile: user.mobile,
      email: user.email,
      bio: user.bio ?? null,
      avatarUrl: await this.buildAvatarPreviewUrl(currentUser, user.avatarStorageKey),
      statusCode: user.statusCode,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
      orgProfile: currentUser.orgProfile,
      activeRole: currentUser.activeRole,
      roles: currentUser.roleOptions,
      quickLinks: currentUser.dashboard.shortcutEntries,
      stats: {
        unreadNotificationCount: stats.unreadNotificationCount,
        pendingApprovalCount: stats.pendingApprovalCount,
        myApplicationCount: stats.myApplicationCount,
      },
      pendingApprovals,
      myApplications,
      recentNotifications,
    };
  }

  async updatePersonalCenter(currentUser: CurrentUserProfile, payload: UpdatePersonalCenterDto) {
    const displayName = payload.displayName.trim();

    const shouldUpdateAvatar = payload.avatarStorageKey !== undefined || payload.avatarFileName !== undefined;
    const avatarStorageKey = payload.avatarStorageKey?.trim() || null;
    const avatarFileName = payload.avatarFileName?.trim() || null;

    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.SysUserUpdateInput = { displayName };
      if (payload.mobile !== undefined) data.mobile = payload.mobile.trim() || null;
      if (payload.email !== undefined) data.email = payload.email.trim() || null;
      if (payload.studentNo !== undefined) data.studentNo = payload.studentNo.trim() || null;
      if (payload.bio !== undefined) data.bio = payload.bio.trim() || null;
      if (shouldUpdateAvatar) {
        data.avatarStorageKey = avatarStorageKey;
        data.avatarFileName = avatarFileName;
      }

      await tx.sysUser.update({
        where: { id: this.toBigInt(currentUser.id) },
        data,
      });

      if (shouldUpdateAvatar && avatarStorageKey) {
        const file = await tx.sysFile.findFirst({
          where: { storageKey: avatarStorageKey },
          select: { id: true },
          orderBy: { id: 'desc' },
        });

        if (file) {
          await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
            businessType: 'PROFILE_AVATAR',
            businessId: currentUser.id,
            usageType: 'AVATAR',
            fileIds: [String(file.id)],
          });
        }
      }
    });

    return this.getPersonalCenter(currentUser);
  }

  async listMyFunds(currentUser: CurrentUserProfile): Promise<MyFundItem[]> {
    const userId = this.toBigInt(currentUser.id);
    const records = await this.prisma.fundApplication.findMany({
      where: { applicantUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        amount: true,
        statusCode: true,
        submittedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });

    return records.map((item) => ({
      id: String(item.id),
      amount: Number(item.amount.toString()),
      statusCode: item.statusCode,
      appliedAt: (item.submittedAt ?? item.createdAt).toISOString(),
      approvedAt: item.completedAt?.toISOString() ?? null,
    }));
  }

  async listNotifications(
    currentUser: CurrentUserProfile,
    query: NotificationQueryDto,
  ): Promise<NotificationListResult> {
    const pagination = normalizePagination(query);
    const where = {
      userId: this.toBigInt(currentUser.id),
      isDeleted: false,
      ...(query.readStatus === 'READ'
        ? { readAt: { not: null } }
        : query.readStatus === 'UNREAD'
          ? { readAt: null }
          : {}),
    } satisfies Prisma.SysNotificationWhereInput;

    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.sysNotification.findMany({
        where,
        orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.sysNotification.count({ where }),
      this.prisma.sysNotification.count({
        where: {
          userId: this.toBigInt(currentUser.id),
          isDeleted: false,
          readAt: null,
        },
      }),
    ]);

    return {
      items: items.map((item) => this.mapNotification(item)),
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        unreadCount,
      },
    };
  }

  async publishNotification(
    currentUser: CurrentUserProfile,
    payload: {
      title: string;
      content: string;
      categoryCode?: string;
      levelCode?: string;
      scope?: string;
      departmentId?: string;
      routePath?: string;
    },
  ) {
    if (![RoleCode.TEACHER, RoleCode.MINISTER].includes(currentUser.activeRole.roleCode)) {
      throw new ForbiddenException('仅老师、部长可发布通知');
    }

    const title = payload.title.trim();
    const content = payload.content.trim();
    if (!title || !content) {
      throw new BadRequestException('通知标题与内容不能为空');
    }

    const categoryCode = payload.categoryCode?.trim() || 'GENERAL';
    const levelCode = payload.levelCode?.trim() || 'INFO';

    const scope = payload.scope === 'DEPARTMENT' ? 'DEPARTMENT' : 'GLOBAL';
    const routePath = payload.routePath?.trim() || null;

    let targetUserIds: string[] = [];

    if (scope === 'GLOBAL') {
      if (currentUser.activeRole.roleCode !== RoleCode.TEACHER) {
        throw new ForbiddenException('部长仅可发布本部门通知');
      }
      const users = await this.prisma.sysUser.findMany({
        where: { isDeleted: false, statusCode: 'ACTIVE' },
        select: { id: true },
      });
      targetUserIds = users.map((item) => String(item.id));
    } else {
      const departmentId =
        currentUser.activeRole.roleCode === RoleCode.MINISTER
          ? currentUser.orgProfile.departmentId
          : payload.departmentId?.trim() || null;

      if (!departmentId) {
        throw new BadRequestException('请选择部门');
      }

      const descendantIds = await this.collectOrgDescendantIds(departmentId);
      const members = await this.prisma.memberProfile.findMany({
        where: {
          isDeleted: false,
          orgUnitId: { in: descendantIds.map((id) => BigInt(id)) },
          user: { isDeleted: false, statusCode: 'ACTIVE' },
        },
        select: { userId: true },
      });
      targetUserIds = [...new Set(members.map((item) => String(item.userId)))];
    }

    if (!targetUserIds.length) {
      throw new BadRequestException('目标范围内没有可接收通知的成员');
    }

    const now = new Date();
    const batchId = randomUUID();
    const result = await this.prisma.sysNotification.createMany({
      data: targetUserIds.map((userId) => ({
        userId: BigInt(userId),
        title,
        content,
        categoryCode,
        levelCode,
        businessType: 'ANNOUNCEMENT',
        businessId: batchId,
        routePath,
        routeQuery: Prisma.DbNull,
        readAt: null,
        createdAt: now,
        createdBy: BigInt(currentUser.id),
        isDeleted: false,
      })),
    });

    return { createdCount: result.count, batchId };
  }

  async markNotificationAsRead(currentUser: CurrentUserProfile, notificationId: string) {
    const record = await this.prisma.sysNotification.findFirst({
      where: {
        id: this.toBigInt(notificationId),
        userId: this.toBigInt(currentUser.id),
        isDeleted: false,
      },
    });

    if (!record) {
      throw new NotFoundException('通知不存在');
    }

    const updated = await this.prisma.sysNotification.update({
      where: { id: record.id },
      data: {
        readAt: record.readAt ?? new Date(),
      },
    });

    return this.mapNotification(updated);
  }

  async markAllNotificationsAsRead(currentUser: CurrentUserProfile) {
    const result = await this.prisma.sysNotification.updateMany({
      where: {
        userId: this.toBigInt(currentUser.id),
        isDeleted: false,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }

  async getSystemConfiguration(): Promise<SystemConfigPayload> {
    const [dictionaries, configs, approvalTemplates] = await this.prisma.$transaction([
      this.prisma.sysDictType.findMany({
        include: {
          items: {
            orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ systemFlag: 'desc' }, { dictCode: 'asc' }],
      }),
      this.prisma.sysConfigItem.findMany({
        orderBy: [{ configCategory: 'asc' }, { configKey: 'asc' }],
      }),
      this.prisma.wfApprovalTemplate.findMany({
        include: {
          nodes: {
            orderBy: [{ sortNo: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ businessType: 'asc' }],
      }),
    ]);

    return {
      dictionaries: dictionaries.map((item) => ({
        id: String(item.id),
        dictCode: item.dictCode,
        dictName: item.dictName,
        description: item.description,
        statusCode: item.statusCode,
        systemFlag: item.systemFlag,
        items: item.items.map((node) => ({
          id: String(node.id),
          itemCode: node.itemCode,
          itemLabel: node.itemLabel,
          itemValue: node.itemValue,
          sortNo: node.sortNo,
          statusCode: node.statusCode,
          extData: this.toObject(node.extData),
        })),
      })),
      configs: configs.map((item) => ({
        id: String(item.id),
        configCategory: item.configCategory,
        configKey: item.configKey,
        configName: item.configName,
        configValue: item.configValue,
        valueType: item.valueType,
        statusCode: item.statusCode,
        remark: item.remark,
        editable: item.editable,
      })),
      approvalTemplates: approvalTemplates.map((item) => ({
        id: String(item.id),
        templateCode: item.templateCode,
        templateName: item.templateName,
        businessType: item.businessType,
        statusCode: item.statusCode,
        nodes: item.nodes.map((node) => ({
          id: String(node.id),
          nodeKey: node.nodeKey,
          nodeName: node.nodeName,
          sortNo: node.sortNo,
          approverRoleCode: node.approverRoleCode,
        })),
      })),
    };
  }

  async upsertDictionary(payload: UpsertDictionaryDto) {
    await this.prisma.sysDictType.upsert({
      where: { dictCode: payload.dictCode.trim() },
      update: {
        dictName: payload.dictName.trim(),
        description: payload.description?.trim() || null,
        statusCode: payload.statusCode.trim(),
      },
      create: {
        dictCode: payload.dictCode.trim(),
        dictName: payload.dictName.trim(),
        description: payload.description?.trim() || null,
        statusCode: payload.statusCode.trim(),
      },
    });

    return this.getSystemConfiguration();
  }

  async upsertDictionaryItem(dictCode: string, payload: UpsertDictionaryItemDto) {
    const dictType = await this.prisma.sysDictType.findUnique({
      where: { dictCode },
    });

    if (!dictType) {
      throw new NotFoundException('字典类型不存在');
    }

    await this.prisma.sysDictItem.upsert({
      where: {
        dictTypeId_itemCode: {
          dictTypeId: dictType.id,
          itemCode: payload.itemCode.trim(),
        },
      },
      update: {
        itemLabel: payload.itemLabel.trim(),
        itemValue: payload.itemValue.trim(),
        sortNo: Number(payload.sortNo ?? 0),
        statusCode: payload.statusCode.trim(),
        extData:
          payload.extData === undefined
            ? Prisma.JsonNull
            : (payload.extData as Prisma.InputJsonValue),
      },
      create: {
        dictTypeId: dictType.id,
        itemCode: payload.itemCode.trim(),
        itemLabel: payload.itemLabel.trim(),
        itemValue: payload.itemValue.trim(),
        sortNo: Number(payload.sortNo ?? 0),
        statusCode: payload.statusCode.trim(),
        extData:
          payload.extData === undefined
            ? Prisma.JsonNull
            : (payload.extData as Prisma.InputJsonValue),
      },
    });

    return this.getSystemConfiguration();
  }

  async upsertConfigItem(payload: UpsertConfigItemDto) {
    await this.prisma.sysConfigItem.upsert({
      where: { configKey: payload.configKey.trim() },
      update: {
        configCategory: payload.configCategory.trim(),
        configName: payload.configName.trim(),
        configValue: payload.configValue,
        valueType: payload.valueType.trim(),
        statusCode: payload.statusCode.trim(),
        remark: payload.remark?.trim() || null,
        editable: Boolean(payload.editable),
      },
      create: {
        configCategory: payload.configCategory.trim(),
        configKey: payload.configKey.trim(),
        configName: payload.configName.trim(),
        configValue: payload.configValue,
        valueType: payload.valueType.trim(),
        statusCode: payload.statusCode.trim(),
        remark: payload.remark?.trim() || null,
        editable: Boolean(payload.editable),
      },
    });

    return this.getSystemConfiguration();
  }

  async upsertApprovalTemplate(businessType: string, payload: UpsertApprovalTemplateDto) {
    await this.prisma.$transaction(async (tx) => {
      const template = await tx.wfApprovalTemplate.upsert({
        where: { businessType },
        update: {
          templateCode: payload.templateCode.trim(),
          templateName: payload.templateName.trim(),
          statusCode: payload.statusCode.trim(),
        },
        create: {
          businessType,
          templateCode: payload.templateCode.trim(),
          templateName: payload.templateName.trim(),
          statusCode: payload.statusCode.trim(),
        },
      });

      await tx.wfApprovalTemplateNode.deleteMany({
        where: { templateId: template.id },
      });

      if (payload.nodes.length) {
        await tx.wfApprovalTemplateNode.createMany({
          data: payload.nodes
            .slice()
            .sort((left, right) => left.sortNo - right.sortNo)
            .map((node) => ({
              templateId: template.id,
              nodeKey: node.nodeKey.trim(),
              nodeName: node.nodeName.trim(),
              sortNo: Number(node.sortNo),
              approverRoleCode: node.approverRoleCode.trim(),
            })),
        });
      }
    });

    return this.getSystemConfiguration();
  }

  private async buildTodoSummary(currentUser: CurrentUserProfile) {
    const [pendingApprovalCount, unreadNotificationCount, myApplicationCount, qualificationReminderCount] =
      await Promise.all([
        this.countPendingApprovals(currentUser),
        this.prisma.sysNotification.count({
          where: {
            userId: this.toBigInt(currentUser.id),
            isDeleted: false,
            readAt: null,
          },
        }),
        this.prisma.wfApprovalInstance.count({
          where: {
            applicantUserId: this.toBigInt(currentUser.id),
          },
        }),
        this.countQualificationReminders(currentUser),
      ]);

    return {
      pendingApprovalCount,
      unreadNotificationCount,
      myApplicationCount,
      qualificationReminderCount,
    };
  }

  private async buildMetricCards(currentUser: CurrentUserProfile) {
    const [projectCount, achievementCount, inventoryWarningCount, pendingApprovalCount, qualificationReminderCount] =
      await Promise.all([
        this.countProjects(currentUser),
        this.countAchievements(currentUser),
        this.countInventoryWarnings(currentUser),
        this.countPendingApprovals(currentUser),
        this.countQualificationReminders(currentUser),
      ]);

    if ([RoleCode.MEMBER, RoleCode.INTERN].includes(currentUser.activeRole.roleCode)) {
      const myApplicationCount = await this.prisma.wfApprovalInstance.count({
        where: { applicantUserId: this.toBigInt(currentUser.id) },
      });

      return [
        {
          code: 'PROJECT',
          title: '我的项目',
          value: projectCount,
          description: '按当前账号参与或归属的项目线索聚合。',
          path: '/funds/overview',
          variant: 'primary' as const,
        },
        {
          code: 'ACHIEVEMENT',
          title: '我的成果',
          value: achievementCount,
          description: '来源于成果库与认定记录。',
          path: '/achievements',
          variant: 'success' as const,
        },
        {
          code: 'APPLICATION',
          title: '我的申请',
          value: myApplicationCount,
          description: '统一审批中心中的本人申请单据。',
          path: '/workflow/approval-center',
          variant: 'info' as const,
        },
        {
          code: 'TODO',
          title: '待办事项',
          value: pendingApprovalCount,
          description: '需要当前角色处理的审批与转办事项。',
          path: '/workflow/approval-center',
          variant: 'warning' as const,
        },
        {
          code: 'QUALIFICATION',
          title: '资格提醒',
          value: qualificationReminderCount,
          description: '基于考核与岗位规则生成的提醒。',
          path: '/promotion/eligibility',
          variant: 'danger' as const,
        },
      ];
    }

    return [
      {
        code: 'PROJECT',
        title: '项目总览',
        value: projectCount,
        description: '来源于项目经费、竞赛与成果关联项目。',
        path: '/funds/overview',
        variant: 'primary' as const,
      },
      {
        code: 'ACHIEVEMENT',
        title: '成果入库',
        value: achievementCount,
        description: '统计当前数据范围内的成果记录。',
        path: '/achievements',
        variant: 'success' as const,
      },
      {
        code: 'INVENTORY_WARNING',
        title: '库存预警',
        value: inventoryWarningCount,
        description: '统计达到预警阈值的耗材档案。',
        path: '/inventory/ledger',
        variant: 'warning' as const,
      },
      {
        code: 'TODO',
        title: '待审批',
        value: pendingApprovalCount,
        description: '当前角色在审批中心的待办数量。',
        path: '/workflow/approval-center',
        variant: 'info' as const,
      },
      {
        code: 'QUALIFICATION',
        title: '资格提醒',
        value: qualificationReminderCount,
        description: '符合晋升条件或待关注资格的成员数。',
        path: '/promotion/eligibility',
        variant: 'danger' as const,
      },
    ];
  }

  private async countPendingApprovals(currentUser: CurrentUserProfile) {
    return this.prisma.wfApprovalInstance.count({
      where: {
        status: ApprovalStatus.PENDING,
        OR: [
          { currentApproverUserId: this.toBigInt(currentUser.id) },
          {
            currentApproverUserId: null,
            currentApproverRoleCode: currentUser.activeRole.roleCode,
          },
        ],
      },
    });
  }

  private async countProjects(currentUser: CurrentUserProfile) {
    const scope = currentUser.dataScopeContext;
    const userIds = await this.resolveScopedUserIds(scope);
    const orgUnitIds = this.resolveScopedOrgUnitIds(scope);
    const projectIds = new Set<string>();

    const [accounts, applications, achievements, teams, requests] = await Promise.all([
      this.prisma.fundAccount.findMany({
        where: {
          isDeleted: false,
          projectId: { not: null },
          ...(scope.scope === DataScope.ALL
            ? {}
            : {
                OR: [
                  ...(orgUnitIds.length ? [{ ownerOrgUnitId: { in: orgUnitIds.map((id) => this.toBigInt(id)) } }] : []),
                  ...(userIds.length ? [{ managerUserId: { in: userIds.map((id) => this.toBigInt(id)) } }] : []),
                ],
              }),
        },
        select: { projectId: true },
      }),
      this.prisma.fundApplication.findMany({
        where: {
          projectId: { not: null },
          ...(scope.scope === DataScope.ALL
            ? {}
            : {
                applicantUserId: {
                  in: userIds.map((id) => this.toBigInt(id)),
                },
              }),
        },
        select: { projectId: true },
      }),
      this.prisma.achvAchievement.findMany({
        where: {
          isDeleted: false,
          projectId: { not: null },
          ...(scope.scope === DataScope.ALL
            ? {}
            : scope.scope === DataScope.SELF_PARTICIPATE
              ? {
                  OR: [
                    { applicantUserId: this.toBigInt(currentUser.id) },
                    { contributors: { some: { userId: this.toBigInt(currentUser.id) } } },
                  ],
                }
              : {
                  applicantUserId: {
                    in: userIds.map((id) => this.toBigInt(id)),
                  },
                }),
        },
        select: { projectId: true },
      }),
      this.prisma.compTeam.findMany({
        where: {
          isDeleted: false,
          projectId: { not: null },
          ...(scope.scope === DataScope.ALL
            ? {}
            : scope.scope === DataScope.SELF_PARTICIPATE
              ? {
                  OR: [
                    { teamLeaderUserId: this.toBigInt(currentUser.id) },
                    { advisorUserId: this.toBigInt(currentUser.id) },
                    { memberUserIds: { contains: `,${currentUser.id},` } },
                  ],
                }
              : {
                  OR: [
                    { teamLeaderUserId: { in: userIds.map((id) => this.toBigInt(id)) } },
                    { advisorUserId: { in: userIds.map((id) => this.toBigInt(id)) } },
                  ],
                }),
        },
        select: { projectId: true },
      }),
      this.prisma.invConsumableRequest.findMany({
        where: {
          projectId: { not: null },
          ...(scope.scope === DataScope.ALL
            ? {}
            : {
                applicantUserId: {
                  in: userIds.map((id) => this.toBigInt(id)),
                },
              }),
        },
        select: { projectId: true },
      }),
    ]);

    for (const item of [...accounts, ...applications, ...achievements, ...teams, ...requests]) {
      if (item.projectId) {
        projectIds.add(item.projectId);
      }
    }

    return projectIds.size;
  }

  private async countAchievements(currentUser: CurrentUserProfile) {
    const scope = currentUser.dataScopeContext;
    const userIds = await this.resolveScopedUserIds(scope);

    return this.prisma.achvAchievement.count({
      where: {
        isDeleted: false,
        statusCode: AchievementStatus.RECOGNIZED,
        ...(scope.scope === DataScope.ALL
          ? {}
          : scope.scope === DataScope.SELF_PARTICIPATE
            ? {
                OR: [
                  { applicantUserId: this.toBigInt(currentUser.id) },
                  { contributors: { some: { userId: this.toBigInt(currentUser.id) } } },
                ],
              }
            : {
                applicantUserId: {
                  in: userIds.map((id) => this.toBigInt(id)),
                },
              }),
      },
    });
  }

  private async countInventoryWarnings(currentUser: CurrentUserProfile) {
    const scope = currentUser.dataScopeContext;
    const orgUnitIds = this.resolveScopedOrgUnitIds(scope);

    return this.prisma.invConsumable.count({
      where: {
        isDeleted: false,
        warningFlag: true,
        ...(scope.scope === DataScope.ALL
          ? {}
          : scope.scope === DataScope.SELF_PARTICIPATE
            ? {
                requests: {
                  some: {
                    applicantUserId: this.toBigInt(currentUser.id),
                  },
                },
              }
            : orgUnitIds.length
              ? {
                  orgUnitId: {
                    in: orgUnitIds.map((id) => this.toBigInt(id)),
                  },
                }
              : {
                  id: 0n,
                }),
      },
    });
  }

  private async countQualificationReminders(currentUser: CurrentUserProfile) {
    const activeScheme = await this.prisma.evalScheme.findFirst({
      where: { statusCode: 'ACTIVE' },
      orderBy: [{ endDate: 'desc' }, { id: 'desc' }],
    });

    if (!activeScheme) {
      return 0;
    }

    const qualificationConfig = this.toObject(activeScheme.ruleConfig)?.qualification as
      | Record<string, { minimumTotalScore?: number; minimumAchievementCount?: number; minimumProjectCount?: number }>
      | undefined;
    const rule = qualificationConfig?.MEMBER_TO_GROUP_LEADER ?? {};
    const minimumTotalScore = Number(rule.minimumTotalScore ?? 85);
    const minimumAchievementCount = Number(rule.minimumAchievementCount ?? 1);
    const minimumProjectCount = Number(rule.minimumProjectCount ?? 1);
    const scopeWhere = buildMemberProfileWhere(currentUser.dataScopeContext);

    return this.prisma.evalScoreRecord.count({
      where: {
        schemeId: activeScheme.id,
        totalScore: { gte: minimumTotalScore },
        achievementCount: { gte: minimumAchievementCount },
        projectCount: { gte: minimumProjectCount },
        ...(scopeWhere ? { memberProfile: scopeWhere } : {}),
      },
    });
  }

  private async listPendingApprovalItems(currentUser: CurrentUserProfile, take: number) {
    const items = await this.prisma.wfApprovalInstance.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        OR: [
          { currentApproverUserId: this.toBigInt(currentUser.id) },
          {
            currentApproverUserId: null,
            currentApproverRoleCode: currentUser.activeRole.roleCode,
          },
        ],
      },
      include: {
        applicant: true,
        currentApprover: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take,
    });

    return items.map((item) => this.mapApprovalInstance(item));
  }

  private async listMyApplicationItems(currentUser: CurrentUserProfile, take: number) {
    const items = await this.prisma.wfApprovalInstance.findMany({
      where: {
        applicantUserId: this.toBigInt(currentUser.id),
      },
      include: {
        applicant: true,
        currentApprover: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take,
    });

    return items.map((item) => this.mapApprovalInstance(item));
  }

  private async fetchNotificationItems(userId: string, take: number) {
    const items = await this.prisma.sysNotification.findMany({
      where: {
        userId: this.toBigInt(userId),
        isDeleted: false,
      },
      orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }],
      take,
    });

    return items.map((item) => this.mapNotification(item));
  }

  private async resolveScopedUserIds(scope: CurrentUserProfile['dataScopeContext']) {
    if (scope.scope === DataScope.ALL) {
      return [];
    }

    const where = buildMemberProfileWhere(scope);
    const members = await this.prisma.memberProfile.findMany({
      where: {
        isDeleted: false,
        ...(where ?? {}),
      },
      select: {
        userId: true,
      },
    });

    return [...new Set(members.map((item) => String(item.userId)).concat(scope.userId))];
  }

  private resolveScopedOrgUnitIds(scope: CurrentUserProfile['dataScopeContext']) {
    switch (scope.scope) {
      case DataScope.ALL:
        return [];
      case DataScope.DEPT_PROJECT:
        return scope.departmentAndDescendantIds;
      case DataScope.GROUP_PROJECT:
        return scope.groupId ? [scope.groupId] : [];
      case DataScope.SELF_PARTICIPATE:
      default:
        return scope.orgUnitId ? [scope.orgUnitId] : [];
    }
  }

  private async loadUserRecord(userId: string) {
    const user = await this.prisma.sysUser.findUnique({
      where: { id: this.toBigInt(userId) },
      include: {
        userRoles: {
          include: {
            role: true,
          },
          orderBy: {
            role: {
              sortNo: 'asc',
            },
          },
        },
        member: {
          include: {
            orgUnit: {
              include: {
                parent: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  private buildAttachmentPreviewUrl(fileId: string) {
    const apiPrefix = process.env.API_PREFIX ?? 'api';
    return `/${apiPrefix}/attachments/${encodeURIComponent(fileId)}/preview`;
  }

  private async buildAvatarPreviewUrl(currentUser: CurrentUserProfile, storageKey: string | null) {
    const key = storageKey?.trim();
    if (!key) return null;

    const file = await this.prisma.sysFile.findFirst({
      where: { storageKey: key },
      select: { id: true },
      orderBy: { id: 'desc' },
    });
    if (!file) return null;

    await this.prisma.$transaction(async (tx) => {
      await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
        businessType: 'PROFILE_AVATAR',
        businessId: currentUser.id,
        usageType: 'AVATAR',
        fileIds: [String(file.id)],
      });
    });

    return this.buildAttachmentPreviewUrl(String(file.id));
  }


  private mapApprovalInstance(instance: ApprovalInstanceRecord) {
    return {
      id: String(instance.id),
      businessType: instance.businessType as ApprovalBusinessType,
      businessId: instance.businessId,
      title: instance.title,
      status: instance.status as ApprovalStatus,
      applicantUserId: String(instance.applicantUserId),
      applicantName: instance.applicant.displayName,
      applicantRoleCode: instance.applicantRoleCode,
      currentNodeName: instance.currentNodeName,
      currentApproverRoleCode: instance.currentApproverRoleCode,
      currentApproverUserId: instance.currentApproverUserId ? String(instance.currentApproverUserId) : null,
      latestComment: instance.latestComment,
      createdAt: instance.createdAt.toISOString(),
      updatedAt: instance.updatedAt.toISOString(),
    };
  }

  private mapNotification(item: NotificationRecord) {
    return {
      id: String(item.id),
      title: item.title,
      content: item.content,
      categoryCode: item.categoryCode,
      levelCode: item.levelCode,
      businessType: item.businessType,
      businessId: item.businessId,
      routePath: item.routePath,
      routeQuery: this.toObject(item.routeQuery) as Record<string, string> | null,
      read: Boolean(item.readAt),
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    };
  }

  private toBigInt(value: string) {
    return BigInt(value);
  }

  private toObject(value: Prisma.JsonValue | null) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }
}
