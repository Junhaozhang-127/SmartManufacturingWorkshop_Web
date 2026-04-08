import { PrismaService } from '@api/modules/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AchievementStatus,
  ApprovalActionType,
  ApprovalBusinessType,
  ApprovalCenterTab,
  type ApprovalDashboardSummary,
  type ApprovalDetail,
  type ApprovalListItem,
  type ApprovalListResult,
  ApprovalStatus,
  CompetitionRegistrationStatus,
  ConsumableInventoryStatus,
  ConsumableRequestStatus,
  ConsumableStatus,
  type CurrentUserProfile,
  DataScope,
  DeviceRepairStatus,
  DeviceStatus,
  FundApplicationStatus,
  FundPaymentStatus,
  InventoryTxnType,
  MemberGrowthRecordType,
  MemberStatus,
  normalizePagination,
  PermissionCodes,
  PromotionApplicationStatus,
  RegularizationStatus,
  RoleCode,
} from '@smw/shared';

import type { ApprovalCenterQueryDto } from './dto/approval-center-query.dto';
import type { ApprovalCommentDto } from './dto/approval-comment.dto';
import type { ApprovalTransferDto } from './dto/approval-transfer.dto';

type ApprovalInstanceRecord = Prisma.WfApprovalInstanceGetPayload<{
  include: {
    applicant: {
      include: {
        member: {
          select: {
            orgUnitId: true;
          };
        };
      };
    };
    currentApprover: true;
  };
}>;

type ApprovalDetailRecord = Prisma.WfApprovalInstanceGetPayload<{
  include: {
    applicant: {
      include: {
        member: {
          select: {
            orgUnitId: true;
          };
        };
      };
    };
    currentApprover: true;
    logs: {
      include: {
        actor: true;
        targetUser: true;
      };
      orderBy: {
        createdAt: 'asc';
      };
    };
  };
}>;

type ApprovalActionRecord = Prisma.WfApprovalInstanceGetPayload<{
  include: {
    applicant: {
      include: {
        member: {
          select: {
            orgUnitId: true;
          };
        };
      };
    };
    template: {
      include: {
        nodes: {
          orderBy: {
            sortNo: 'asc';
          };
        };
      };
    };
  };
}>;

@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  async startBusinessApproval(
    tx: Prisma.TransactionClient,
    payload: {
      businessType: ApprovalBusinessType;
      businessId: string;
      title: string;
      applicantUserId: bigint;
      applicantRoleCode: string;
      formData: Record<string, unknown>;
    },
  ) {
    return this.startApproval(tx, payload);
  }

  async getApprovalList(currentUser: CurrentUserProfile, query: ApprovalCenterQueryDto): Promise<ApprovalListResult> {
    const pagination = normalizePagination(query);
    const tab = query.tab ?? ApprovalCenterTab.PENDING;

    switch (tab) {
      case ApprovalCenterTab.PROCESSED:
        return this.listProcessedApprovals(currentUser, pagination);
      case ApprovalCenterTab.RETURNED:
        return this.listReturnedApprovals(currentUser, pagination);
      case ApprovalCenterTab.PENDING:
      default:
        return this.listPendingApprovals(currentUser, pagination);
    }
  }

  async getApprovalDetail(currentUser: CurrentUserProfile, instanceId: string): Promise<ApprovalDetail> {
    const record = await this.prisma.wfApprovalInstance.findUnique({
      where: { id: this.toBigInt(instanceId) },
      include: {
        applicant: {
          include: {
            member: {
              select: {
                orgUnitId: true,
              },
            },
          },
        },
        currentApprover: true,
        logs: {
          include: {
            actor: true,
            targetUser: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('审批实例不存在');
    }

    await this.ensureCanViewDetail(currentUser, record.id);

    return {
      ...this.mapApprovalInstance(record),
      formData: this.toObject(record.formData),
      businessSnapshot: await this.loadBusinessSnapshot(record.businessType, record.businessId),
      logs: record.logs.map((log) => ({
        id: String(log.id),
        actionType: log.actionType as ApprovalActionType,
        nodeKey: log.nodeKey,
        nodeName: log.nodeName,
        actorUserId: String(log.actorUserId),
        actorName: log.actor.displayName,
        actorRoleCode: log.actorRoleCode,
        targetUserId: log.targetUserId ? String(log.targetUserId) : null,
        targetUserName: log.targetUser?.displayName ?? null,
        comment: log.comment,
        createdAt: log.createdAt.toISOString(),
      })),
      availableActions: await this.resolveAvailableActions(currentUser, record),
    };
  }

  async getTransferCandidates(currentUser: CurrentUserProfile, instanceId: string) {
    const instance = await this.prisma.wfApprovalInstance.findUnique({
      where: { id: this.toBigInt(instanceId) },
      select: {
        id: true,
        status: true,
        currentApproverRoleCode: true,
        currentApproverUserId: true,
      },
    });

    if (!instance) {
      throw new NotFoundException('审批实例不存在');
    }

    if (instance.status !== ApprovalStatus.PENDING || !instance.currentApproverRoleCode) {
      return [];
    }

    const actionRecord = await this.loadActionableInstance(this.prisma, instanceId);
    this.ensureCanHandle(currentUser, actionRecord);

    const users = await this.prisma.sysUser.findMany({
      where: {
        isDeleted: false,
        statusCode: 'ACTIVE',
        userRoles: {
          some: {
            role: {
              roleCode: instance.currentApproverRoleCode,
            },
          },
        },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        member: {
          select: {
            orgUnitId: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    return users
      .filter((user) => this.isUserWithinDataScope(currentUser, String(user.id), user.member?.orgUnitId ?? null))
      .map((user) => ({
        id: String(user.id),
        username: user.username,
        displayName: user.displayName,
      }));
  }

  async approve(currentUser: CurrentUserProfile, instanceId: string, payload: ApprovalCommentDto) {
    return this.prisma.$transaction(async (tx) => {
      const instance = await this.loadActionableInstance(tx, instanceId);
      this.ensurePending(instance);
      this.ensureCanHandle(currentUser, instance);

      const nextNode = instance.template?.nodes.find((node) => node.sortNo === (instance.currentNodeSort ?? 0) + 1);
      const now = new Date();

      if (nextNode) {
        const updated = await tx.wfApprovalInstance.update({
          where: { id: instance.id },
          data: {
            currentNodeKey: nextNode.nodeKey,
            currentNodeName: nextNode.nodeName,
            currentNodeSort: nextNode.sortNo,
            currentApproverRoleCode: nextNode.approverRoleCode,
            currentApproverUserId: null,
            latestComment: payload.comment?.trim() || null,
          },
          include: {
            applicant: {
              include: {
                member: {
                  select: {
                    orgUnitId: true,
                  },
                },
              },
            },
            currentApprover: true,
          },
        });

        await this.appendLog(tx, {
          instanceId: instance.id,
          nodeKey: instance.currentNodeKey,
          nodeName: instance.currentNodeName,
          actionType: ApprovalActionType.APPROVE,
          actorUserId: this.toBigInt(currentUser.id),
          actorRoleCode: currentUser.activeRole.roleCode,
          comment: payload.comment,
        });
        await this.syncBusinessReviewFields(tx, instance.businessType, instance.businessId, instance.currentNodeKey, payload.comment);

        await this.appendLog(tx, {
          instanceId: instance.id,
          nodeKey: nextNode.nodeKey,
          nodeName: nextNode.nodeName,
          actionType: ApprovalActionType.NODE_ENTER,
          actorUserId: this.toBigInt(currentUser.id),
          actorRoleCode: currentUser.activeRole.roleCode,
          comment: `进入节点：${nextNode.nodeName}`,
          extraData: {
            approverRoleCode: nextNode.approverRoleCode,
          },
        });

        await this.notifyRoleUsers(tx, nextNode.approverRoleCode, {
          title: `待审批：${updated.title}`,
          content: `审批流已进入 ${nextNode.nodeName}，请及时处理。`,
          businessType: updated.businessType,
          businessId: updated.businessId,
          createdBy: this.toBigInt(currentUser.id),
        });
        await this.syncBusinessStatus(tx, instance.businessType, instance.businessId, ApprovalStatus.PENDING, currentUser);
        return this.mapApprovalInstance(updated);
      }

      const updated = await tx.wfApprovalInstance.update({
        where: { id: instance.id },
        data: {
          status: ApprovalStatus.APPROVED,
          currentNodeKey: null,
          currentNodeName: null,
          currentNodeSort: null,
          currentApproverRoleCode: null,
          currentApproverUserId: null,
          latestComment: payload.comment?.trim() || null,
          finishedAt: now,
        },
        include: {
          applicant: {
            include: {
              member: {
                select: {
                  orgUnitId: true,
                },
              },
            },
          },
          currentApprover: true,
        },
      });

      await this.appendLog(tx, {
        instanceId: instance.id,
        nodeKey: instance.currentNodeKey,
        nodeName: instance.currentNodeName,
        actionType: ApprovalActionType.APPROVE,
        actorUserId: this.toBigInt(currentUser.id),
        actorRoleCode: currentUser.activeRole.roleCode,
        comment: payload.comment,
      });
      await this.syncBusinessReviewFields(tx, instance.businessType, instance.businessId, instance.currentNodeKey, payload.comment);

      await this.createNotification(tx, {
        userId: updated.applicantUserId,
        title: `审批通过：${updated.title}`,
        content: '您的申请已审批通过。',
        businessType: updated.businessType,
        businessId: updated.businessId,
        createdBy: this.toBigInt(currentUser.id),
      });
      await this.syncBusinessStatus(tx, instance.businessType, instance.businessId, ApprovalStatus.APPROVED, currentUser);
      return this.mapApprovalInstance(updated);
    });
  }

  async reject(currentUser: CurrentUserProfile, instanceId: string, payload: ApprovalCommentDto) {
    const comment = payload.comment?.trim();

    if (!comment) {
      throw new BadRequestException('驳回时必须填写审批意见');
    }

    return this.prisma.$transaction(async (tx) => {
      const instance = await this.loadActionableInstance(tx, instanceId);
      this.ensurePending(instance);
      this.ensureCanHandle(currentUser, instance);

      const updated = await tx.wfApprovalInstance.update({
        where: { id: instance.id },
        data: {
          status: ApprovalStatus.REJECTED,
          currentNodeKey: null,
          currentNodeName: null,
          currentNodeSort: null,
          latestComment: comment,
          currentApproverRoleCode: null,
          currentApproverUserId: null,
          finishedAt: new Date(),
        },
        include: {
          applicant: {
            include: {
              member: {
                select: {
                  orgUnitId: true,
                },
              },
            },
          },
          currentApprover: true,
        },
      });

      await this.appendLog(tx, {
        instanceId: instance.id,
        nodeKey: instance.currentNodeKey,
        nodeName: instance.currentNodeName,
        actionType: ApprovalActionType.REJECT,
        actorUserId: this.toBigInt(currentUser.id),
        actorRoleCode: currentUser.activeRole.roleCode,
        comment,
      });
      await this.syncBusinessReviewFields(tx, instance.businessType, instance.businessId, instance.currentNodeKey, comment);

      await this.createNotification(tx, {
        userId: updated.applicantUserId,
        title: `审批驳回：${updated.title}`,
        content: `您的申请被驳回${comment ? `：${comment}` : '。'}`,
        businessType: updated.businessType,
        businessId: updated.businessId,
        createdBy: this.toBigInt(currentUser.id),
      });
      await this.syncBusinessStatus(tx, instance.businessType, instance.businessId, ApprovalStatus.REJECTED, currentUser);
      return this.mapApprovalInstance(updated);
    });
  }

  async transfer(currentUser: CurrentUserProfile, instanceId: string, payload: ApprovalTransferDto) {
    return this.prisma.$transaction(async (tx) => {
      const instance = await this.loadActionableInstance(tx, instanceId);
      this.ensurePending(instance);
      this.ensureCanHandle(currentUser, instance);

      if (!instance.currentApproverRoleCode) {
        throw new BadRequestException('当前节点不存在可转交角色');
      }

      const targetUser = await tx.sysUser.findUnique({
        where: { id: this.toBigInt(payload.targetUserId) },
        include: {
          member: {
            select: {
              orgUnitId: true,
            },
          },
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!targetUser || targetUser.isDeleted || targetUser.statusCode !== 'ACTIVE') {
        throw new NotFoundException('转交目标用户不存在或不可用');
      }

      const hasRole = targetUser.userRoles.some(
        (relation) => relation.role.roleCode === instance.currentApproverRoleCode,
      );

      if (!hasRole) {
        throw new BadRequestException('转交目标用户不具备当前节点所需角色');
      }

      if (!this.isUserWithinDataScope(currentUser, String(targetUser.id), targetUser.member?.orgUnitId ?? null)) {
        throw new ForbiddenException('转交目标不在当前数据范围内');
      }

      const updated = await tx.wfApprovalInstance.update({
        where: { id: instance.id },
        data: {
          currentApproverUserId: targetUser.id,
          latestComment: payload.comment?.trim() || null,
        },
        include: {
          applicant: {
            include: {
              member: {
                select: {
                  orgUnitId: true,
                },
              },
            },
          },
          currentApprover: true,
        },
      });

      await this.appendLog(tx, {
        instanceId: instance.id,
        nodeKey: instance.currentNodeKey,
        nodeName: instance.currentNodeName,
        actionType: ApprovalActionType.TRANSFER,
        actorUserId: this.toBigInt(currentUser.id),
        actorRoleCode: currentUser.activeRole.roleCode,
        targetUserId: targetUser.id,
        comment: payload.comment,
      });

      await this.createNotification(tx, {
        userId: targetUser.id,
        title: `审批转交：${updated.title}`,
        content: `${currentUser.displayName} 已将审批转交给您处理。`,
        businessType: updated.businessType,
        businessId: updated.businessId,
        createdBy: this.toBigInt(currentUser.id),
      });
      return this.mapApprovalInstance(updated);
    });
  }

  async comment(currentUser: CurrentUserProfile, instanceId: string, payload: ApprovalCommentDto) {
    const comment = payload.comment?.trim();

    if (!comment) {
      throw new BadRequestException('补充说明时必须填写内容');
    }

    const record = await this.prisma.wfApprovalInstance.findUnique({
      where: { id: this.toBigInt(instanceId) },
    });

    if (!record) {
      throw new NotFoundException('审批实例不存在');
    }

    if (record.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('仅待审批单据支持补充说明');
    }

    const canHandle = await this.canHandleInstance(currentUser, record.id);
    const isApplicant = String(record.applicantUserId) === currentUser.id;

    if (!isApplicant && !canHandle) {
      throw new ForbiddenException('当前用户不可补充说明');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const entity = await tx.wfApprovalInstance.update({
        where: { id: record.id },
        data: {
          latestComment: comment,
        },
        include: {
          applicant: {
            include: {
              member: {
                select: {
                  orgUnitId: true,
                },
              },
            },
          },
          currentApprover: true,
        },
      });

      await this.appendLog(tx, {
        instanceId: record.id,
        nodeKey: record.currentNodeKey,
        nodeName: record.currentNodeName,
        actionType: ApprovalActionType.COMMENT,
        actorUserId: this.toBigInt(currentUser.id),
        actorRoleCode: currentUser.activeRole.roleCode,
        comment,
      });

      return entity;
    });

    return this.mapApprovalInstance(updated);
  }

  async withdraw(currentUser: CurrentUserProfile, instanceId: string, payload: ApprovalCommentDto) {
    return this.prisma.$transaction(async (tx) => {
      const instance = await this.loadActionableInstance(tx, instanceId);
      this.ensurePending(instance);

      if (String(instance.applicantUserId) !== currentUser.id) {
        throw new ForbiddenException('仅申请人可撤回单据');
      }

      const updated = await tx.wfApprovalInstance.update({
        where: { id: instance.id },
        data: {
          status: ApprovalStatus.WITHDRAWN,
          currentNodeKey: null,
          currentNodeName: null,
          currentNodeSort: null,
          latestComment: payload.comment?.trim() || null,
          currentApproverRoleCode: null,
          currentApproverUserId: null,
          finishedAt: new Date(),
          withdrawnAt: new Date(),
        },
        include: {
          applicant: {
            include: {
              member: {
                select: {
                  orgUnitId: true,
                },
              },
            },
          },
          currentApprover: true,
        },
      });

      await this.appendLog(tx, {
        instanceId: instance.id,
        nodeKey: instance.currentNodeKey,
        nodeName: instance.currentNodeName,
        actionType: ApprovalActionType.WITHDRAW,
        actorUserId: this.toBigInt(currentUser.id),
        actorRoleCode: currentUser.activeRole.roleCode,
        comment: payload.comment,
      });

      await this.createNotification(tx, {
        userId: updated.applicantUserId,
        title: `申请已撤回：${updated.title}`,
        content: '您发起的申请已撤回。',
        businessType: updated.businessType,
        businessId: updated.businessId,
        createdBy: this.toBigInt(currentUser.id),
      });
      await this.syncBusinessStatus(tx, instance.businessType, instance.businessId, ApprovalStatus.WITHDRAWN, currentUser);
      return this.mapApprovalInstance(updated);
    });
  }

  async getDashboardSummary(currentUser: CurrentUserProfile): Promise<ApprovalDashboardSummary> {
    const pending = await this.getApprovalList(currentUser, {
      tab: ApprovalCenterTab.PENDING,
      page: 1,
      pageSize: 5,
    });
    const processed = await this.getApprovalList(currentUser, {
      tab: ApprovalCenterTab.PROCESSED,
      page: 1,
      pageSize: 5,
    });
    const returned = await this.getApprovalList(currentUser, {
      tab: ApprovalCenterTab.RETURNED,
      page: 1,
      pageSize: 5,
    });

    return {
      pendingCount: pending.meta.total,
      processedCount: processed.meta.total,
      returnedCount: returned.meta.total,
      pendingItems: pending.items,
      processedItems: processed.items,
    };
  }

  private async listPendingApprovals(
    currentUser: CurrentUserProfile,
    pagination: { page: number; pageSize: number; keyword?: string },
  ): Promise<ApprovalListResult> {
    const where = {
      status: ApprovalStatus.PENDING,
      OR: [
        { currentApproverUserId: this.toBigInt(currentUser.id) },
        {
          currentApproverUserId: null,
          currentApproverRoleCode: currentUser.activeRole.roleCode,
        },
      ],
      ...(pagination.keyword
        ? {
            AND: [
              {
                OR: [
                  { title: { contains: pagination.keyword } },
                  { applicant: { displayName: { contains: pagination.keyword } } },
                ],
              },
            ],
          }
        : {}),
    } satisfies Prisma.WfApprovalInstanceWhereInput;

    const items = await this.prisma.wfApprovalInstance.findMany({
      where,
      include: {
        applicant: {
          include: {
            member: {
              select: {
                orgUnitId: true,
              },
            },
          },
        },
        currentApprover: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    const scopedItems = items.filter((item) =>
      this.isUserWithinDataScope(currentUser, String(item.applicantUserId), item.applicant.member?.orgUnitId ?? null),
    );
    const total = scopedItems.length;
    const pagedItems = scopedItems.slice(
      (pagination.page - 1) * pagination.pageSize,
      pagination.page * pagination.pageSize,
    );

    return {
      items: pagedItems.map((item) => this.mapApprovalInstance(item)),
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    };
  }

  private async listReturnedApprovals(
    currentUser: CurrentUserProfile,
    pagination: { page: number; pageSize: number; keyword?: string },
  ): Promise<ApprovalListResult> {
    const where = {
      applicantUserId: this.toBigInt(currentUser.id),
      status: ApprovalStatus.REJECTED,
      ...(pagination.keyword
        ? {
            title: { contains: pagination.keyword },
          }
        : {}),
    } satisfies Prisma.WfApprovalInstanceWhereInput;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.wfApprovalInstance.findMany({
        where,
        include: {
          applicant: {
            include: {
              member: {
                select: {
                  orgUnitId: true,
                },
              },
            },
          },
          currentApprover: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.wfApprovalInstance.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapApprovalInstance(item)),
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    };
  }

  private async listProcessedApprovals(
    currentUser: CurrentUserProfile,
    pagination: { page: number; pageSize: number; keyword?: string },
  ): Promise<ApprovalListResult> {
    const logs = await this.prisma.wfApprovalNodeLog.findMany({
      where: {
        actorUserId: this.toBigInt(currentUser.id),
        actionType: {
          in: [ApprovalActionType.APPROVE, ApprovalActionType.REJECT, ApprovalActionType.TRANSFER],
        },
      },
      include: {
        instance: {
          include: {
            applicant: {
              include: {
                member: {
                  select: {
                    orgUnitId: true,
                  },
                },
              },
            },
            currentApprover: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const deduped = new Map<string, ApprovalInstanceRecord>();

    for (const log of logs) {
      const instance = log.instance;
      if (!instance) {
        continue;
      }

      const keyword = pagination.keyword?.toLowerCase();
      const matched =
        !keyword ||
        instance.title.toLowerCase().includes(keyword) ||
        instance.applicant.displayName.toLowerCase().includes(keyword);

      if (matched && !deduped.has(String(instance.id))) {
        deduped.set(String(instance.id), instance);
      }
    }

    const allItems = [...deduped.values()];
    const total = allItems.length;
    const paged = allItems.slice(
      (pagination.page - 1) * pagination.pageSize,
      pagination.page * pagination.pageSize,
    );

    return {
      items: paged.map((item) => this.mapApprovalInstance(item)),
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    };
  }

  private async startApproval(
    tx: Prisma.TransactionClient,
    payload: {
      businessType: ApprovalBusinessType;
      businessId: string;
      title: string;
      applicantUserId: bigint;
      applicantRoleCode: string;
      formData: Record<string, unknown>;
    },
  ) {
    const template = await tx.wfApprovalTemplate.findUnique({
      where: {
        businessType: payload.businessType,
      },
      include: {
        nodes: {
          orderBy: {
            sortNo: 'asc',
          },
        },
      },
    });

    if (!template || !template.nodes.length) {
      throw new BadRequestException(`业务类型 ${payload.businessType} 未配置审批模板`);
    }

    const firstNode = template.nodes[0];
    const instance = await tx.wfApprovalInstance.create({
      data: {
        templateId: template.id,
        businessType: payload.businessType,
        businessId: payload.businessId,
        title: payload.title,
        applicantUserId: payload.applicantUserId,
        applicantRoleCode: payload.applicantRoleCode,
        currentNodeKey: firstNode.nodeKey,
        currentNodeName: firstNode.nodeName,
        currentNodeSort: firstNode.sortNo,
        currentApproverRoleCode: firstNode.approverRoleCode,
        formData: payload.formData as Prisma.InputJsonValue,
      },
      include: {
        applicant: {
          include: {
            member: {
              select: {
                orgUnitId: true,
              },
            },
          },
        },
        currentApprover: true,
      },
    });

    await this.appendLog(tx, {
      instanceId: instance.id,
      nodeKey: firstNode.nodeKey,
      nodeName: firstNode.nodeName,
      actionType: ApprovalActionType.SUBMIT,
      actorUserId: payload.applicantUserId,
      actorRoleCode: payload.applicantRoleCode,
      comment: '发起审批',
    });

    await this.appendLog(tx, {
      instanceId: instance.id,
      nodeKey: firstNode.nodeKey,
      nodeName: firstNode.nodeName,
      actionType: ApprovalActionType.NODE_ENTER,
      actorUserId: payload.applicantUserId,
      actorRoleCode: payload.applicantRoleCode,
      comment: `进入节点：${firstNode.nodeName}`,
      extraData: {
        approverRoleCode: firstNode.approverRoleCode,
      },
    });

    await this.notifyRoleUsers(tx, firstNode.approverRoleCode, {
      title: `待审批：${instance.title}`,
      content: `收到新的审批申请，当前节点为 ${firstNode.nodeName}。`,
      businessType: instance.businessType,
      businessId: instance.businessId,
      createdBy: payload.applicantUserId,
    });
    await this.createNotification(tx, {
      userId: payload.applicantUserId,
      title: `申请已提交：${instance.title}`,
      content: '您的申请已进入审批中心，可在“我的申请”中查看进度。',
      businessType: instance.businessType,
      businessId: instance.businessId,
      createdBy: payload.applicantUserId,
    });
    return instance;
  }

  private async loadActionableInstance(tx: Prisma.TransactionClient | PrismaService, instanceId: string) {
    const instance = await tx.wfApprovalInstance.findUnique({
      where: { id: this.toBigInt(instanceId) },
      include: {
        applicant: {
          include: {
            member: {
              select: {
                orgUnitId: true,
              },
            },
          },
        },
        template: {
          include: {
            nodes: {
              orderBy: {
                sortNo: 'asc',
              },
            },
          },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException('审批实例不存在');
    }

    return instance;
  }

  private ensurePending(instance: { status: string }) {
    if (instance.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('当前审批单据已结束，无法继续处理');
    }
  }

  private ensureCanHandle(currentUser: CurrentUserProfile, instance: ApprovalActionRecord) {
    if (!currentUser.permissions.includes(PermissionCodes.approvalApprove)) {
      throw new ForbiddenException('当前角色没有审批处理权限');
    }

    if (
      !this.isUserWithinDataScope(
        currentUser,
        String(instance.applicantUserId),
        instance.applicant.member?.orgUnitId ?? null,
      )
    ) {
      throw new ForbiddenException('当前数据范围不允许处理该审批单据');
    }

    if (instance.currentApproverUserId) {
      if (String(instance.currentApproverUserId) !== currentUser.id) {
        throw new ForbiddenException('该审批单据已转交给其他用户处理');
      }
      return;
    }

    if (instance.currentApproverRoleCode !== currentUser.activeRole.roleCode) {
      throw new ForbiddenException('当前角色不匹配审批节点处理人');
    }
  }

  private async ensureCanViewDetail(currentUser: CurrentUserProfile, instanceId: bigint) {
    const canHandle = await this.canHandleInstance(currentUser, instanceId);
    const instance = await this.prisma.wfApprovalInstance.findUnique({
      where: { id: instanceId },
      select: {
        applicantUserId: true,
      },
    });

    const handledLog = await this.prisma.wfApprovalNodeLog.findFirst({
      where: {
        instanceId,
        actorUserId: this.toBigInt(currentUser.id),
      },
      select: {
        id: true,
      },
    });

    if (!instance) {
      throw new NotFoundException('审批实例不存在');
    }

    if (!canHandle && String(instance.applicantUserId) !== currentUser.id && !handledLog) {
      throw new ForbiddenException('当前用户不可查看该审批单据');
    }
  }

  private async canHandleInstance(currentUser: CurrentUserProfile, instanceId: bigint) {
    const instance = await this.prisma.wfApprovalInstance.findUnique({
      where: { id: instanceId },
      select: {
        applicantUserId: true,
        applicant: {
          select: {
            member: {
              select: {
                orgUnitId: true,
              },
            },
          },
        },
        status: true,
        currentApproverRoleCode: true,
        currentApproverUserId: true,
      },
    });

    if (!instance || instance.status !== ApprovalStatus.PENDING) {
      return false;
    }

    if (
      !this.isUserWithinDataScope(
        currentUser,
        String(instance.applicantUserId),
        instance.applicant.member?.orgUnitId ?? null,
      )
    ) {
      return false;
    }

    if (instance.currentApproverUserId) {
      return String(instance.currentApproverUserId) === currentUser.id;
    }

    return instance.currentApproverRoleCode === currentUser.activeRole.roleCode;
  }

  private async resolveAvailableActions(currentUser: CurrentUserProfile, record: ApprovalDetailRecord) {
    if (record.status !== ApprovalStatus.PENDING) {
      return [];
    }

    const actions: Array<'approve' | 'reject' | 'transfer' | 'comment' | 'withdraw'> = [];
    const isApplicant = String(record.applicantUserId) === currentUser.id;
    const canHandle = await this.canHandleInstance(currentUser, record.id);

    if (canHandle && currentUser.permissions.includes(PermissionCodes.approvalApprove)) {
      actions.push('approve', 'reject', 'transfer', 'comment');
    }

    if (isApplicant) {
      actions.push('comment', 'withdraw');
    }

    return [...new Set(actions)];
  }

  private mapApprovalInstance(instance: ApprovalInstanceRecord): ApprovalListItem {
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


  private async appendLog(
    tx: Prisma.TransactionClient,
    payload: {
      instanceId: bigint;
      nodeKey: string | null;
      nodeName: string | null;
      actionType: ApprovalActionType;
      actorUserId: bigint;
      actorRoleCode?: string | null;
      targetUserId?: bigint | null;
      comment?: string;
      extraData?: Record<string, unknown>;
    },
  ) {
    await tx.wfApprovalNodeLog.create({
      data: {
        instanceId: payload.instanceId,
        nodeKey: payload.nodeKey,
        nodeName: payload.nodeName,
        actionType: payload.actionType,
        actorUserId: payload.actorUserId,
        actorRoleCode: payload.actorRoleCode ?? null,
        targetUserId: payload.targetUserId ?? null,
        comment: payload.comment?.trim() || null,
        extraData: payload.extraData as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private async notifyRoleUsers(
    tx: Prisma.TransactionClient,
    roleCode: string,
    payload: {
      title: string;
      content: string;
      businessType: string;
      businessId: string;
      createdBy?: bigint;
    },
  ) {
    const users = await tx.sysUser.findMany({
      where: {
        isDeleted: false,
        statusCode: 'ACTIVE',
        userRoles: {
          some: {
            role: {
              roleCode,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    for (const user of users) {
      await this.createNotification(tx, {
        userId: user.id,
        title: payload.title,
        content: payload.content,
        businessType: payload.businessType,
        businessId: payload.businessId,
        createdBy: payload.createdBy,
      });
    }
  }

  private async createNotification(
    tx: Prisma.TransactionClient,
    payload: {
      userId: bigint;
      title: string;
      content: string;
      businessType: string;
      businessId: string;
      createdBy?: bigint;
    },
  ) {
    const route = this.resolveBusinessRoute(payload.businessType, payload.businessId);
    await tx.sysNotification.create({
      data: {
        userId: payload.userId,
        title: payload.title,
        content: payload.content,
        categoryCode: 'APPROVAL',
        levelCode: 'INFO',
        businessType: payload.businessType,
        businessId: payload.businessId,
        routePath: route.routePath,
        routeQuery: route.routeQuery as Prisma.InputJsonValue | undefined,
        createdBy: payload.createdBy ?? null,
      },
    });
  }

  private resolveBusinessRoute(businessType: string, businessId: string) {
    switch (businessType as ApprovalBusinessType) {
      case ApprovalBusinessType.MEMBER_REGULARIZATION:
        return { routePath: '/members/regularization', routeQuery: { focus: businessId } };
      case ApprovalBusinessType.REPAIR_ORDER:
        return { routePath: '/devices/repairs', routeQuery: { focus: businessId } };
      case ApprovalBusinessType.CONSUMABLE_REQUEST:
        return { routePath: '/inventory/requests', routeQuery: { focus: businessId } };
      case ApprovalBusinessType.FUND_REQUEST:
        return { routePath: '/funds/applications', routeQuery: { focus: businessId } };
      case ApprovalBusinessType.PROMOTION_REQUEST:
        return { routePath: '/promotion/applications', routeQuery: { focus: businessId } };
      case ApprovalBusinessType.COMPETITION_REGISTRATION:
        return { routePath: '/competitions/library', routeQuery: { focus: businessId } };
      case ApprovalBusinessType.ACHIEVEMENT_RECOGNITION:
        return { routePath: '/achievements', routeQuery: { focus: businessId } };
      case ApprovalBusinessType.DEMO_REQUEST:
      default:
        return { routePath: '/workflow/approval-center', routeQuery: { focus: businessId } };
    }
  }

  private async syncBusinessReviewFields(
    tx: Prisma.TransactionClient,
    businessType: string,
    businessId: string,
    nodeKey: string | null,
    comment?: string | null,
  ) {
    if (businessType !== ApprovalBusinessType.PROMOTION_REQUEST || !comment?.trim()) {
      return;
    }

    if (nodeKey === 'GROUP_LEADER_REVIEW') {
      await tx.promApplication.update({
        where: { id: this.toBigInt(businessId) },
        data: {
          teamEvaluation: comment.trim(),
        },
      });
      return;
    }

    if (nodeKey === 'MINISTER_REVIEW' || nodeKey === 'LAB_LEADER_CONFIRM') {
      await tx.promApplication.update({
        where: { id: this.toBigInt(businessId) },
        data: {
          departmentReview: comment.trim(),
        },
      });
    }
  }

  private async syncBusinessStatus(
    tx: Prisma.TransactionClient,
    businessType: string,
    businessId: string,
    status: ApprovalStatus,
    actor?: CurrentUserProfile,
  ) {
    switch (businessType as ApprovalBusinessType) {
      case ApprovalBusinessType.DEMO_REQUEST: {
        const statusCodeMap: Record<ApprovalStatus, string> = {
          [ApprovalStatus.PENDING]: 'IN_APPROVAL',
          [ApprovalStatus.APPROVED]: 'APPROVED',
          [ApprovalStatus.REJECTED]: 'REJECTED',
          [ApprovalStatus.WITHDRAWN]: 'WITHDRAWN',
        };

        await tx.demoApprovalForm.update({
          where: { id: this.toBigInt(businessId) },
          data: {
            statusCode: statusCodeMap[status],
          },
        });
        return;
      }
      case ApprovalBusinessType.MEMBER_REGULARIZATION: {
        const regularization = await tx.memberRegularization.findUnique({
          where: { id: this.toBigInt(businessId) },
          include: {
            memberProfile: true,
          },
        });

        if (!regularization) {
          return;
        }

        const now = new Date();
        const latestResult = status === ApprovalStatus.PENDING ? null : regularization.latestResult;

        if (status === ApprovalStatus.PENDING) {
          await tx.memberRegularization.update({
            where: { id: regularization.id },
            data: {
              statusCode: RegularizationStatus.IN_APPROVAL,
            },
          });
          await tx.memberProfile.update({
            where: { id: regularization.memberProfileId },
            data: {
              memberStatus: MemberStatus.REGULARIZATION_PENDING,
            },
          });
          return;
        }

        if (status === ApprovalStatus.APPROVED) {
          await tx.memberRegularization.update({
            where: { id: regularization.id },
            data: {
              statusCode: RegularizationStatus.APPROVED,
              latestResult: 'Regularization approved',
              completedAt: now,
            },
          });
          await tx.memberProfile.update({
            where: { id: regularization.memberProfileId },
            data: {
              memberStatus: MemberStatus.ACTIVE,
              positionCode: 'MEMBER',
            },
          });

          const memberRole = await tx.sysRole.findUnique({
            where: { roleCode: RoleCode.MEMBER },
          });
          const internRole = await tx.sysRole.findUnique({
            where: { roleCode: RoleCode.INTERN },
          });

          if (memberRole) {
            await tx.sysUserRole.upsert({
              where: {
                userId_roleId: {
                  userId: regularization.applicantUserId,
                  roleId: memberRole.id,
                },
              },
              update: {},
              create: {
                userId: regularization.applicantUserId,
                roleId: memberRole.id,
              },
            });
          }

          if (internRole) {
            await tx.sysUserRole.deleteMany({
              where: {
                userId: regularization.applicantUserId,
                roleId: internRole.id,
              },
            });
          }

          await tx.memberGrowthRecord.create({
            data: {
              memberProfileId: regularization.memberProfileId,
              recordType: MemberGrowthRecordType.REGULARIZATION_APPROVED,
              title: '转正通过',
              content: '审批完成并同步正式成员角色',
              recordDate: now,
              actorUserId: regularization.applicantUserId,
            },
          });
          await tx.memberGrowthRecord.create({
            data: {
              memberProfileId: regularization.memberProfileId,
              recordType: MemberGrowthRecordType.ROLE_UPDATED,
              title: '角色同步',
              content: 'INTERN -> MEMBER',
              recordDate: now,
              actorUserId: regularization.applicantUserId,
            },
          });
          await tx.memberOperationLog.create({
            data: {
              memberProfileId: regularization.memberProfileId,
              actionType: 'REGULARIZATION_APPROVED',
              fromStatus: MemberStatus.REGULARIZATION_PENDING,
              toStatus: MemberStatus.ACTIVE,
              description: '转正通过并同步角色为 MEMBER',
              operatorUserId: regularization.applicantUserId,
            },
          });
          return;
        }

        if (status === ApprovalStatus.REJECTED) {
          await tx.memberRegularization.update({
            where: { id: regularization.id },
            data: {
              statusCode: RegularizationStatus.REJECTED,
              latestResult: 'Regularization rejected',
              completedAt: now,
            },
          });
          await tx.memberProfile.update({
            where: { id: regularization.memberProfileId },
            data: {
              memberStatus: MemberStatus.REGULARIZATION_REJECTED,
            },
          });
          await tx.memberGrowthRecord.create({
            data: {
              memberProfileId: regularization.memberProfileId,
              recordType: MemberGrowthRecordType.REGULARIZATION_REJECTED,
              title: '转正驳回',
              content: '审批驳回，待补充后重新申请',
              recordDate: now,
              actorUserId: regularization.applicantUserId,
            },
          });
          await tx.memberOperationLog.create({
            data: {
              memberProfileId: regularization.memberProfileId,
              actionType: 'REGULARIZATION_REJECTED',
              fromStatus: MemberStatus.REGULARIZATION_PENDING,
              toStatus: MemberStatus.REGULARIZATION_REJECTED,
              description: '转正申请被驳回',
              operatorUserId: regularization.applicantUserId,
            },
          });
          return;
        }

        if (status === ApprovalStatus.WITHDRAWN) {
          await tx.memberRegularization.update({
            where: { id: regularization.id },
            data: {
              statusCode: RegularizationStatus.WITHDRAWN,
              latestResult: latestResult ?? 'Regularization withdrawn',
              completedAt: now,
            },
          });
          await tx.memberProfile.update({
            where: { id: regularization.memberProfileId },
            data: {
              memberStatus: MemberStatus.INTERN,
            },
          });
          await tx.memberOperationLog.create({
            data: {
              memberProfileId: regularization.memberProfileId,
              actionType: 'REGULARIZATION_WITHDRAWN',
              fromStatus: MemberStatus.REGULARIZATION_PENDING,
              toStatus: MemberStatus.INTERN,
              description: '撤回转正申请',
              operatorUserId: regularization.applicantUserId,
            },
          });
        }
        return;
      }
      case ApprovalBusinessType.COMPETITION_REGISTRATION: {
        const team = await tx.compTeam.findUnique({
          where: { id: this.toBigInt(businessId) },
        });

        if (!team) {
          return;
        }

        const now = new Date();
        const statusCodeMap: Record<ApprovalStatus, string> = {
          [ApprovalStatus.PENDING]: CompetitionRegistrationStatus.IN_APPROVAL,
          [ApprovalStatus.APPROVED]: CompetitionRegistrationStatus.APPROVED,
          [ApprovalStatus.REJECTED]: CompetitionRegistrationStatus.REJECTED,
          [ApprovalStatus.WITHDRAWN]: CompetitionRegistrationStatus.WITHDRAWN,
        };

        await tx.compTeam.update({
          where: { id: team.id },
          data: {
            statusCode: statusCodeMap[status],
            latestResult:
              status === ApprovalStatus.APPROVED
                ? '赛事报名审批通过'
                : status === ApprovalStatus.REJECTED
                  ? '赛事报名审批驳回'
                  : status === ApprovalStatus.WITHDRAWN
                    ? '赛事报名申请已撤回'
                    : '赛事报名申请审批中',
            completedAt: status === ApprovalStatus.PENDING ? null : now,
          },
        });
        return;
      }
      case ApprovalBusinessType.ACHIEVEMENT_RECOGNITION: {
        const achievement = await tx.achvAchievement.findUnique({
          where: { id: this.toBigInt(businessId) },
        });

        if (!achievement) {
          return;
        }

        const now = new Date();
        await tx.achvAchievement.update({
          where: { id: achievement.id },
          data: {
            statusCode:
              status === ApprovalStatus.APPROVED
                ? AchievementStatus.RECOGNIZED
                : status === ApprovalStatus.REJECTED
                  ? AchievementStatus.REJECTED
                  : status === ApprovalStatus.WITHDRAWN
                    ? AchievementStatus.WITHDRAWN
                    : AchievementStatus.IN_APPROVAL,
            latestResult:
              status === ApprovalStatus.APPROVED
                ? '成果认定通过'
                : status === ApprovalStatus.REJECTED
                  ? '成果认定驳回'
                  : status === ApprovalStatus.WITHDRAWN
                    ? '成果认定申请已撤回'
                    : '成果认定审批中',
            recognizedAt: status === ApprovalStatus.APPROVED ? now : achievement.recognizedAt,
          },
        });
        return;
      }
      case ApprovalBusinessType.PROMOTION_REQUEST: {
        const application = await tx.promApplication.findUnique({
          where: { id: this.toBigInt(businessId) },
        });

        if (!application) {
          return;
        }

        const now = new Date();

        if (status === ApprovalStatus.PENDING) {
          await tx.promApplication.update({
            where: { id: application.id },
            data: {
              statusCode: PromotionApplicationStatus.IN_APPROVAL,
              latestResult: 'Promotion request is in review',
            },
          });
          return;
        }

        if (status === ApprovalStatus.APPROVED) {
          await tx.promApplication.update({
            where: { id: application.id },
            data: {
              statusCode: PromotionApplicationStatus.PUBLIC_NOTICE,
              latestResult: 'Promotion review passed, pending public notice',
              completedAt: now,
            },
          });

          await tx.promAppointment.upsert({
            where: { applicationId: application.id },
            update: {
              targetPositionCode: application.targetPositionCode,
              targetRoleCode: application.targetRoleCode,
              appointmentStatus: 'NOTICE_PENDING',
              publicNoticeStatus: 'PENDING',
              latestResult: 'Waiting for public notice result',
            },
            create: {
              applicationId: application.id,
              memberProfileId: application.memberProfileId,
              applicantUserId: application.applicantUserId,
              targetPositionCode: application.targetPositionCode,
              targetRoleCode: application.targetRoleCode,
              appointmentStatus: 'NOTICE_PENDING',
              publicNoticeStatus: 'PENDING',
              latestResult: 'Waiting for public notice result',
            },
          });
          return;
        }

        await tx.promApplication.update({
          where: { id: application.id },
          data: {
            statusCode:
              status === ApprovalStatus.REJECTED
                ? PromotionApplicationStatus.REJECTED
                : PromotionApplicationStatus.WITHDRAWN,
            latestResult:
              status === ApprovalStatus.REJECTED
                ? 'Promotion request rejected'
                : 'Promotion request withdrawn',
            completedAt: now,
          },
        });
        return;
      }
      case ApprovalBusinessType.REPAIR_ORDER: {
        const repair = await tx.assetDeviceRepair.findUnique({
          where: { id: this.toBigInt(businessId) },
          include: {
            device: true,
          },
        });

        if (!repair) {
          return;
        }

        const now = new Date();
        const statusCode =
          status === ApprovalStatus.APPROVED
            ? DeviceRepairStatus.PROCESSING
            : status === ApprovalStatus.REJECTED
              ? DeviceRepairStatus.REJECTED
              : status === ApprovalStatus.WITHDRAWN
                ? DeviceRepairStatus.CANCELLED
                : DeviceRepairStatus.IN_APPROVAL;

        await tx.assetDeviceRepair.update({
          where: { id: repair.id },
          data: {
            statusCode,
            latestResult:
              status === ApprovalStatus.APPROVED
                ? '审批通过，进入维修处理'
                : status === ApprovalStatus.REJECTED
                  ? '报修审批已驳回'
                  : status === ApprovalStatus.WITHDRAWN
                    ? '报修申请已撤回'
                    : '报修工单审批中',
            approvedAt: status === ApprovalStatus.APPROVED ? now : repair.approvedAt,
            statusChangedAt: now,
            statusLogs: this.appendStatusHistory(repair.statusLogs, {
              actionType:
                status === ApprovalStatus.APPROVED
                  ? 'APPROVAL_APPROVED'
                  : status === ApprovalStatus.REJECTED
                    ? 'APPROVAL_REJECTED'
                    : status === ApprovalStatus.WITHDRAWN
                      ? 'APPROVAL_WITHDRAWN'
                      : 'APPROVAL_PENDING',
              fromStatus: repair.statusCode,
              toStatus: statusCode,
              operatorUserId: String(repair.applicantUserId),
              operatorName: null,
              comment:
                status === ApprovalStatus.APPROVED
                  ? '审批通过'
                  : status === ApprovalStatus.REJECTED
                    ? '审批驳回'
                    : status === ApprovalStatus.WITHDRAWN
                      ? '审批撤回'
                      : '审批发起',
            }),
          },
        });

        if (status === ApprovalStatus.REJECTED || status === ApprovalStatus.WITHDRAWN) {
          await tx.assetDevice.update({
            where: { id: repair.deviceId },
            data: {
              statusCode:
                repair.deviceStatusBeforeRepair && repair.deviceStatusBeforeRepair !== DeviceStatus.REPAIRING
                  ? repair.deviceStatusBeforeRepair
                  : DeviceStatus.IDLE,
              statusChangedAt: now,
              statusLogs: this.appendStatusHistory(repair.device.statusLogs, {
                actionType: status === ApprovalStatus.REJECTED ? 'REPAIR_REJECTED' : 'REPAIR_WITHDRAWN',
                fromStatus: repair.device.statusCode,
                toStatus:
                  repair.deviceStatusBeforeRepair && repair.deviceStatusBeforeRepair !== DeviceStatus.REPAIRING
                    ? repair.deviceStatusBeforeRepair
                    : DeviceStatus.IDLE,
                operatorUserId: String(repair.applicantUserId),
                operatorName: null,
                comment:
                  status === ApprovalStatus.REJECTED ? '报修审批驳回，设备状态恢复' : '报修撤回，设备状态恢复',
              }),
            },
          });
        }
        return;
      }
      case ApprovalBusinessType.CONSUMABLE_REQUEST: {
        const request = await tx.invConsumableRequest.findUnique({
          where: { id: this.toBigInt(businessId) },
          include: {
            consumable: true,
          },
        });

        if (!request) {
          return;
        }

        const now = new Date();
        const actionType =
          status === ApprovalStatus.APPROVED
            ? 'APPROVAL_APPROVED'
            : status === ApprovalStatus.REJECTED
              ? 'APPROVAL_REJECTED'
              : status === ApprovalStatus.WITHDRAWN
                ? 'APPROVAL_WITHDRAWN'
                : 'APPROVAL_PENDING';

        if (status === ApprovalStatus.PENDING) {
          await tx.invConsumableRequest.update({
            where: { id: request.id },
            data: {
              statusCode: ConsumableRequestStatus.IN_APPROVAL,
              latestResult: '申领单审批中',
              statusLogs: this.appendStatusHistory(request.statusLogs, {
                actionType,
                fromStatus: request.statusCode,
                toStatus: ConsumableRequestStatus.IN_APPROVAL,
                operatorUserId: actor?.id ?? null,
                operatorName: actor?.displayName ?? null,
                comment: '等待审批链路处理',
              }),
            },
          });
          return;
        }

        if (status === ApprovalStatus.APPROVED) {
          const currentStock = Number(request.consumable.currentStock.toString());
          const requestQty = Number(request.quantity.toString());
          const nextStock = Number((currentStock - requestQty).toFixed(2));

          if (nextStock < 0) {
            throw new BadRequestException('审批通过失败：当前库存不足以执行出库');
          }

          const inventoryState = this.resolveConsumableInventoryState(
            request.consumable.statusCode,
            nextStock,
            Number(request.consumable.warningThreshold.toString()),
          );

          const outboundTxn = await tx.invInventoryTxn.create({
            data: {
              consumableId: request.consumableId,
              requestId: request.id,
              txnType: InventoryTxnType.REQUEST_OUTBOUND,
              quantity: request.quantity,
              balanceAfter: new Prisma.Decimal(nextStock),
              projectId: request.projectId,
              projectName: request.projectName,
              operatorUserId: actor ? this.toBigInt(actor.id) : null,
              operatorRoleCode: actor?.activeRole.roleCode ?? null,
              remark: `申领审批通过自动出库 / ${request.requestNo}`,
              txnAt: now,
            },
          });

          await tx.invConsumable.update({
            where: { id: request.consumableId },
            data: {
              currentStock: new Prisma.Decimal(nextStock),
              inventoryStatus: inventoryState.inventoryStatus,
              warningFlag: inventoryState.warningFlag,
              replenishmentTriggeredAt:
                inventoryState.warningFlag && !request.consumable.warningFlag
                  ? now
                  : request.consumable.replenishmentTriggeredAt,
              lastTxnAt: now,
            },
          });

          await tx.invConsumableRequest.update({
            where: { id: request.id },
            data: {
              statusCode: ConsumableRequestStatus.FULFILLED,
              latestResult: '申领审批通过并已自动出库',
              outboundTxnId: outboundTxn.id,
              completedAt: now,
              statusLogs: this.appendStatusHistory(request.statusLogs, {
                actionType,
                fromStatus: request.statusCode,
                toStatus: ConsumableRequestStatus.FULFILLED,
                operatorUserId: actor?.id ?? null,
                operatorName: actor?.displayName ?? null,
                comment: '审批通过并完成库存扣减',
              }),
            },
          });
          return;
        }

        const nextStatus =
          status === ApprovalStatus.REJECTED ? ConsumableRequestStatus.REJECTED : ConsumableRequestStatus.WITHDRAWN;
        const nextResult =
          status === ApprovalStatus.REJECTED ? '申领审批已驳回' : '申领申请已撤回';

        await tx.invConsumableRequest.update({
          where: { id: request.id },
          data: {
            statusCode: nextStatus,
            latestResult: nextResult,
            completedAt: now,
            statusLogs: this.appendStatusHistory(request.statusLogs, {
              actionType,
              fromStatus: request.statusCode,
              toStatus: nextStatus,
              operatorUserId: actor?.id ?? null,
              operatorName: actor?.displayName ?? null,
              comment: nextResult,
            }),
          },
        });
        return;
      }
      case ApprovalBusinessType.FUND_REQUEST: {
        const application = await tx.fundApplication.findUnique({
          where: { id: this.toBigInt(businessId) },
          include: {
            account: true,
          },
        });

        if (!application) {
          return;
        }

        const now = new Date();
        const amount = Number(application.amount.toString());
        const reservedAmount = Number(application.account.reservedAmount.toString());
        const usedAmount = Number(application.account.usedAmount.toString());

        if (status === ApprovalStatus.PENDING) {
          await tx.fundApplication.update({
            where: { id: application.id },
            data: {
              statusCode: FundApplicationStatus.IN_APPROVAL,
              latestResult: '费用申请审批中',
              statusLogs: this.appendStatusHistory(application.statusLogs, {
                actionType: 'APPROVAL_PENDING',
                fromStatus: application.statusCode,
                toStatus: FundApplicationStatus.IN_APPROVAL,
                operatorUserId: actor?.id ?? null,
                operatorName: actor?.displayName ?? null,
                comment: '审批链路继续流转',
              }),
            },
          });
          return;
        }

        if (status === ApprovalStatus.APPROVED) {
          await tx.fundApplication.update({
            where: { id: application.id },
            data: {
              statusCode: FundApplicationStatus.APPROVED,
              paymentStatus: FundPaymentStatus.PENDING,
              latestResult: '审批通过，待支付',
              completedAt: now,
              statusLogs: this.appendStatusHistory(application.statusLogs, {
                actionType: 'APPROVAL_APPROVED',
                fromStatus: application.statusCode,
                toStatus: FundApplicationStatus.APPROVED,
                operatorUserId: actor?.id ?? null,
                operatorName: actor?.displayName ?? null,
                comment: '审批通过，预算已转入已用金额',
              }),
            },
          });

          await tx.fundAccount.update({
            where: { id: application.accountId },
            data: {
              reservedAmount: new Prisma.Decimal(Math.max(0, reservedAmount - amount)),
              usedAmount: new Prisma.Decimal(usedAmount + amount),
              lastExpenseAt: now,
            },
          });
          return;
        }

        const nextStatus =
          status === ApprovalStatus.REJECTED ? FundApplicationStatus.REJECTED : FundApplicationStatus.WITHDRAWN;
        const nextResult = status === ApprovalStatus.REJECTED ? '费用申请已驳回' : '费用申请已撤回';

        await tx.fundApplication.update({
          where: { id: application.id },
          data: {
            statusCode: nextStatus,
            paymentStatus: FundPaymentStatus.UNPAID,
            latestResult: nextResult,
            completedAt: now,
            statusLogs: this.appendStatusHistory(application.statusLogs, {
              actionType: status === ApprovalStatus.REJECTED ? 'APPROVAL_REJECTED' : 'APPROVAL_WITHDRAWN',
              fromStatus: application.statusCode,
              toStatus: nextStatus,
              operatorUserId: actor?.id ?? null,
              operatorName: actor?.displayName ?? null,
              comment: nextResult,
            }),
          },
        });

        await tx.fundAccount.update({
          where: { id: application.accountId },
          data: {
            reservedAmount: new Prisma.Decimal(Math.max(0, reservedAmount - amount)),
          },
        });
        return;
      }
      default:
        return;
    }
  }

  private async loadBusinessSnapshot(businessType: string, businessId: string) {
    switch (businessType as ApprovalBusinessType) {
      case ApprovalBusinessType.DEMO_REQUEST: {
        const form = await this.prisma.demoApprovalForm.findUnique({
          where: { id: this.toBigInt(businessId) },
          include: {
            applicant: true,
          },
        });

        if (!form) {
          return null;
        }

        return {
          title: form.title,
          reason: form.reason,
          statusCode: form.statusCode,
          applicantName: form.applicant.displayName,
        };
      }
      case ApprovalBusinessType.MEMBER_REGULARIZATION: {
        const regularization = await this.prisma.memberRegularization.findUnique({
          where: { id: this.toBigInt(businessId) },
          include: {
            memberProfile: {
              include: {
                user: true,
                orgUnit: true,
                mentor: true,
              },
            },
          },
        });

        if (!regularization) {
          return null;
        }

        return {
          displayName: regularization.memberProfile.user.displayName,
          orgUnitName: regularization.memberProfile.orgUnit.unitName,
          mentorName: regularization.memberProfile.mentor?.displayName ?? null,
          statusCode: regularization.statusCode,
          internshipStartDate: regularization.internshipStartDate.toISOString().slice(0, 10),
          plannedRegularDate: regularization.plannedRegularDate.toISOString().slice(0, 10),
          applicationReason: regularization.applicationReason,
          selfAssessment: regularization.selfAssessment,
        };
      }
      case ApprovalBusinessType.COMPETITION_REGISTRATION: {
        const team = await this.prisma.compTeam.findUnique({
          where: { id: this.toBigInt(businessId) },
          include: {
            competition: true,
            teamLeader: true,
            advisor: true,
          },
        });

        if (!team) {
          return null;
        }

        return {
          competitionName: team.competition.name,
          teamName: team.teamName,
          teamLeaderName: team.teamLeader.displayName,
          advisorName: team.advisor?.displayName ?? null,
          memberNames: team.memberNames ? team.memberNames.split('、') : [],
          projectName: team.projectName,
          statusCode: team.statusCode,
          latestResult: team.latestResult,
        };
      }
      case ApprovalBusinessType.ACHIEVEMENT_RECOGNITION: {
        const achievement = await this.prisma.achvAchievement.findUnique({
          where: { id: this.toBigInt(businessId) },
          include: {
            applicant: true,
            sourceCompetition: true,
            sourceTeam: true,
            contributors: {
              orderBy: {
                contributionRank: 'asc',
              },
            },
          },
        });

        if (!achievement) {
          return null;
        }

        return {
          title: achievement.title,
          achievementType: achievement.achievementType,
          levelCode: achievement.levelCode,
          statusCode: achievement.statusCode,
          recognizedGrade: achievement.recognizedGrade,
          projectName: achievement.projectName,
          sourceCompetitionName: achievement.sourceCompetition?.name ?? null,
          sourceTeamName: achievement.sourceTeam?.teamName ?? null,
          applicantName: achievement.applicant.displayName,
          contributorNames: achievement.contributors.map((item) => item.contributorName),
        };
      }
      case ApprovalBusinessType.PROMOTION_REQUEST: {
        const application = await this.prisma.promApplication.findUnique({
          where: { id: this.toBigInt(businessId) },
          include: {
            scheme: true,
            memberProfile: {
              include: {
                user: true,
                orgUnit: true,
              },
            },
            appointment: true,
          },
        });

        if (!application) {
          return null;
        }

        return {
          applicationNo: application.applicationNo,
          displayName: application.memberProfile.user.displayName,
          orgUnitName: application.memberProfile.orgUnit.unitName,
          currentPositionCode: application.memberProfile.positionCode,
          targetPositionCode: application.targetPositionCode,
          targetRoleCode: application.targetRoleCode,
          schemeName: application.scheme?.schemeName ?? null,
          qualificationPassed: application.qualificationPassed,
          statusCode: application.statusCode,
          teamEvaluation: application.teamEvaluation,
          departmentReview: application.departmentReview,
          publicNoticeResult: application.publicNoticeResult,
          appointmentStatus: application.appointment?.appointmentStatus ?? null,
          latestResult: application.latestResult,
        };
      }
      case ApprovalBusinessType.REPAIR_ORDER: {
        const repair = await this.prisma.assetDeviceRepair.findUnique({
          where: { id: this.toBigInt(businessId) },
          include: {
            applicant: true,
            handler: true,
            device: true,
          },
        });

        if (!repair) {
          return null;
        }

        return {
          repairNo: repair.repairNo,
          deviceCode: repair.device.deviceCode,
          deviceName: repair.device.deviceName,
          statusCode: repair.statusCode,
          severity: repair.severity,
          applicantName: repair.applicant.displayName,
          handlerName: repair.handler?.displayName ?? null,
          faultDescription: repair.faultDescription,
          latestResult: repair.latestResult,
          requestedAmount: repair.requestedAmount ? Number(repair.requestedAmount.toString()) : null,
          costEstimate: repair.costEstimate ? Number(repair.costEstimate.toString()) : null,
        };
      }
      case ApprovalBusinessType.CONSUMABLE_REQUEST: {
        const request = await this.prisma.invConsumableRequest.findUnique({
          where: { id: this.toBigInt(businessId) },
          include: {
            applicant: true,
            consumable: true,
          },
        });

        if (!request) {
          return null;
        }

        return {
          requestNo: request.requestNo,
          consumableCode: request.consumable.consumableCode,
          consumableName: request.consumable.consumableName,
          categoryName: request.consumable.categoryName,
          statusCode: request.statusCode,
          quantity: Number(request.quantity.toString()),
          unitName: request.consumable.unitName,
          projectId: request.projectId,
          projectName: request.projectName,
          purpose: request.purpose,
          applicantName: request.applicant.displayName,
          latestResult: request.latestResult,
          warningFlag: request.consumable.warningFlag,
          currentStock: Number(request.consumable.currentStock.toString()),
        };
      }
      case ApprovalBusinessType.FUND_REQUEST: {
        const application = await this.prisma.fundApplication.findUnique({
          where: { id: this.toBigInt(businessId) },
          include: {
            applicant: true,
            account: true,
          },
        });

        if (!application) {
          return null;
        }

        return {
          applicationNo: application.applicationNo,
          accountCode: application.account.accountCode,
          accountName: application.account.accountName,
          projectId: application.projectId,
          projectName: application.projectName,
          title: application.title,
          applicationType: application.applicationType,
          expenseType: application.expenseType,
          amount: Number(application.amount.toString()),
          reimbursementAmount: application.reimbursementAmount
            ? Number(application.reimbursementAmount.toString())
            : null,
          statusCode: application.statusCode,
          paymentStatus: application.paymentStatus,
          payeeName: application.payeeName,
          applicantName: application.applicant.displayName,
          latestResult: application.latestResult,
        };
      }
      default:
        return null;
    }
  }

  private appendStatusHistory(
    raw: Prisma.JsonValue | null,
    entry: {
      actionType: string;
      fromStatus: string | null;
      toStatus: string | null;
      operatorUserId: string | null;
      operatorName: string | null;
      comment: string | null;
    },
  ) {
    const list = Array.isArray(raw) ? [...raw] : [];
    list.push({
      ...entry,
      createdAt: new Date().toISOString(),
    });
    return list as Prisma.InputJsonValue;
  }

  private toBigInt(value: string) {
    return BigInt(value);
  }

  private toObject(value: Prisma.JsonValue | null): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private resolveConsumableInventoryState(statusCode: string, currentStock: number, warningThreshold: number) {
    if (statusCode === ConsumableStatus.DISABLED) {
      return { inventoryStatus: ConsumableInventoryStatus.DISABLED, warningFlag: false };
    }
    if (currentStock <= 0) {
      return { inventoryStatus: ConsumableInventoryStatus.OUT_OF_STOCK, warningFlag: true };
    }
    if (currentStock <= warningThreshold) {
      return { inventoryStatus: ConsumableInventoryStatus.LOW_STOCK, warningFlag: true };
    }
    return { inventoryStatus: ConsumableInventoryStatus.NORMAL, warningFlag: false };
  }

  private isUserWithinDataScope(
    currentUser: CurrentUserProfile,
    targetUserId: string,
    targetOrgUnitId: bigint | null,
  ) {
    const context = currentUser.dataScopeContext;

    switch (context.scope) {
      case DataScope.ALL:
        return true;
      case DataScope.DEPT_PROJECT:
        return targetOrgUnitId ? context.departmentAndDescendantIds.includes(String(targetOrgUnitId)) : true;
      case DataScope.GROUP_PROJECT:
        return targetOrgUnitId ? String(targetOrgUnitId) === context.groupId : true;
      case DataScope.SELF_PARTICIPATE:
        return [...context.selfUserIds, ...context.participatingUserIds].includes(targetUserId);
      default:
        return targetUserId === currentUser.id;
    }
  }
}
