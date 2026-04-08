import { ApprovalService } from '@api/modules/approval/approval.service';
import { buildMemberProfileWhere } from '@api/modules/auth/data-scope-prisma';
import { EvaluationPromotionService } from '@api/modules/evaluation-promotion/evaluation-promotion.service';
import { PrismaService } from '@api/modules/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ApprovalBusinessType,
  type CurrentUserProfile,
  type DataScopeContext,
  MemberGrowthRecordType,
  MemberStatus,
  normalizePagination,
  PermissionCodes,
  RegularizationStatus,
  RoleCode,
} from '@smw/shared';

import type { ApprovalCommentDto } from '../approval/dto/approval-comment.dto';
import type { BindMentorDto } from './dto/bind-mentor.dto';
import type { CreateRegularizationDto } from './dto/create-regularization.dto';
import type { CreateStageEvaluationDto } from './dto/create-stage-evaluation.dto';
import type { MemberQueryDto } from './dto/member-query.dto';
import type { RegularizationQueryDto } from './dto/regularization-query.dto';
import type { UpdateMemberDto } from './dto/update-member.dto';

type MemberProfileDetail = Prisma.MemberProfileGetPayload<{
  include: {
    user: {
      include: {
        userRoles: {
          include: {
            role: true;
          };
          orderBy: {
            role: {
              sortNo: 'asc';
            };
          };
        };
      };
    };
    orgUnit: {
      include: {
        parent: true;
      };
    };
    mentor: true;
    growthRecords: {
      include: {
        actor: true;
      };
      orderBy: {
        recordDate: 'desc';
      };
    };
    stageEvaluations: {
      include: {
        evaluator: true;
      };
      orderBy: {
        evaluatedAt: 'desc';
      };
    };
    operationLogs: {
      include: {
        operator: true;
      };
      orderBy: {
        createdAt: 'desc';
      };
    };
  };
}>;

type MemberRegularizationRecord = Prisma.MemberRegularizationGetPayload<{
  include: {
    memberProfile: {
      include: {
        user: true;
        orgUnit: true;
        mentor: true;
        stageEvaluations: {
          include: {
            evaluator: true;
          };
          orderBy: {
            evaluatedAt: 'desc';
          };
        };
      };
    };
  };
}>;

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
    private readonly evaluationPromotionService: EvaluationPromotionService,
  ) {}

  async getOrgOverview(dataScopeContext: DataScopeContext) {
    const units = await this.prisma.orgUnit.findMany({
      where: {
        isDeleted: false,
        statusCode: 'ACTIVE',
      },
      include: {
        leader: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    const scopeWhere = buildMemberProfileWhere(dataScopeContext);
    const scopedProfiles = await this.prisma.memberProfile.findMany({
      where: {
        isDeleted: false,
        ...(scopeWhere ?? {}),
      },
      select: {
        orgUnitId: true,
        memberStatus: true,
      },
    });

    const parentMap = new Map<string, string | null>(
      units.map((unit) => [String(unit.id), unit.parentId ? String(unit.parentId) : null]),
    );
    const visibleUnitIds = new Set<string>();

    for (const profile of scopedProfiles) {
      let cursor: string | null = String(profile.orgUnitId);
      while (cursor) {
        visibleUnitIds.add(cursor);
        cursor = parentMap.get(cursor) ?? null;
      }
    }

    const counters = new Map<
      string,
      { memberCount: number; activeMemberCount: number; regularizationPendingCount: number }
    >();

    for (const profile of scopedProfiles) {
      let cursor: string | null = String(profile.orgUnitId);
      while (cursor) {
        const current = counters.get(cursor) ?? {
          memberCount: 0,
          activeMemberCount: 0,
          regularizationPendingCount: 0,
        };
        current.memberCount += 1;
        if (profile.memberStatus === MemberStatus.ACTIVE) {
          current.activeMemberCount += 1;
        }
        if (profile.memberStatus === MemberStatus.REGULARIZATION_PENDING) {
          current.regularizationPendingCount += 1;
        }
        counters.set(cursor, current);
        cursor = parentMap.get(cursor) ?? null;
      }
    }

    const nodes = units
      .filter((unit) => visibleUnitIds.size === 0 || visibleUnitIds.has(String(unit.id)))
      .map((unit) => ({
        id: String(unit.id),
        parentId: unit.parentId ? String(unit.parentId) : null,
        unitCode: unit.unitCode,
        unitName: unit.unitName,
        unitType: unit.unitType,
        leaderName: unit.leader?.displayName ?? null,
        memberCount: counters.get(String(unit.id))?.memberCount ?? 0,
        activeMemberCount: counters.get(String(unit.id))?.activeMemberCount ?? 0,
        regularizationPendingCount: counters.get(String(unit.id))?.regularizationPendingCount ?? 0,
      }));

    const childrenMap = new Map<string | null, typeof nodes>();
    for (const node of nodes) {
      const siblings = childrenMap.get(node.parentId) ?? [];
      siblings.push(node);
      childrenMap.set(node.parentId, siblings);
    }

    type OrgNode = (typeof nodes)[number] & { children: OrgNode[] };
    const buildTree = (parentId: string | null): OrgNode[] =>
      (childrenMap.get(parentId) ?? []).map((node) => ({
        ...node,
        children: buildTree(node.id),
      }));

    return {
      summary: {
        orgUnitCount: nodes.length,
        memberCount: scopedProfiles.length,
        internCount: scopedProfiles.filter((item) => item.memberStatus === MemberStatus.INTERN).length,
        regularizationPendingCount: scopedProfiles.filter(
          (item) => item.memberStatus === MemberStatus.REGULARIZATION_PENDING,
        ).length,
      },
      tree: buildTree(null),
    };
  }

  async listMembers(query: MemberQueryDto, dataScopeContext: DataScopeContext) {
    const pagination = normalizePagination(query);
    const scopeWhere = buildMemberProfileWhere(dataScopeContext);
    const clauses: Prisma.MemberProfileWhereInput[] = [{ isDeleted: false }];

    if (scopeWhere) {
      clauses.push(scopeWhere);
    }
    if (query.orgUnitId) {
      clauses.push({ orgUnitId: this.toBigInt(query.orgUnitId) });
    }
    if (query.statusCode) {
      clauses.push({ memberStatus: query.statusCode });
    }
    if (pagination.keyword) {
      clauses.push({
        OR: [
          { user: { displayName: { contains: pagination.keyword } } },
          { user: { username: { contains: pagination.keyword } } },
          { orgUnit: { unitName: { contains: pagination.keyword } } },
          { positionCode: { contains: pagination.keyword } },
        ],
      });
    }

    const where = { AND: clauses } satisfies Prisma.MemberProfileWhereInput;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.memberProfile.findMany({
        where,
        include: {
          user: {
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
            },
          },
          orgUnit: {
            include: {
              parent: true,
            },
          },
          mentor: true,
        },
        orderBy: [{ memberStatus: 'asc' }, { createdAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.memberProfile.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: String(item.id),
        userId: String(item.userId),
        displayName: item.user.displayName,
        username: item.user.username,
        statusCode: item.memberStatus,
        positionCode: item.positionCode,
        orgUnitId: String(item.orgUnitId),
        orgUnitName: item.orgUnit.unitName,
        departmentName: item.orgUnit.unitType === 'GROUP' ? item.orgUnit.parent?.unitName ?? null : item.orgUnit.unitName,
        mentorName: item.mentor?.displayName ?? null,
        roleCodes: item.user.userRoles.map((relation) => relation.role.roleCode),
        skillTags: this.parseSkillTags(item.skillTags),
        joinDate: item.joinDate.toISOString().slice(0, 10),
      })),
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    };
  }

  async getMemberDetail(currentUser: CurrentUserProfile, memberId: string, dataScopeContext: DataScopeContext) {
    const profile = await this.loadScopedMemberProfile(memberId, dataScopeContext);
    const latestRegularization = await this.prisma.memberRegularization.findFirst({
      where: {
        memberProfileId: profile.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const promotionSnapshot = await this.evaluationPromotionService.buildMemberPromotionSnapshot(profile.id);
    const projectAndRewardSnapshot = await this.evaluationPromotionService.buildMemberProjectAndRewardSnapshot(
      profile.id,
      profile.userId,
    );

    return this.mapMemberDetail(
      currentUser,
      profile,
      latestRegularization,
      promotionSnapshot,
      projectAndRewardSnapshot,
    );
  }

  async updateMember(
    currentUser: CurrentUserProfile,
    memberId: string,
    dataScopeContext: DataScopeContext,
    payload: UpdateMemberDto,
  ) {
    const profile = await this.loadScopedMemberProfile(memberId, dataScopeContext);

    return this.prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.memberProfile.update({
        where: { id: profile.id },
        data: {
          orgUnitId: payload.orgUnitId ? this.toBigInt(payload.orgUnitId) : undefined,
          positionCode: payload.positionCode?.trim() || undefined,
          skillTags: payload.skillTags ? payload.skillTags.join(',') : undefined,
        },
      });

      await tx.sysUser.update({
        where: { id: profile.userId },
        data: {
          mobile: payload.mobile?.trim() || undefined,
          email: payload.email?.trim() || undefined,
        },
      });

      await this.appendGrowthRecord(tx, {
        memberProfileId: profile.id,
        recordType: MemberGrowthRecordType.PROFILE_UPDATED,
        title: '成员档案更新',
        content: '基础信息已更新',
        recordDate: new Date(),
        actorUserId: this.toBigInt(currentUser.id),
      });

      await this.appendOperationLog(tx, {
        memberProfileId: profile.id,
        actionType: 'PROFILE_UPDATED',
        fromStatus: profile.memberStatus,
        toStatus: updatedProfile.memberStatus,
        description: '成员档案更新',
        operatorUserId: this.toBigInt(currentUser.id),
      });
    });

    return this.getMemberDetail(currentUser, memberId, dataScopeContext);
  }

  async bindMentor(
    currentUser: CurrentUserProfile,
    memberId: string,
    dataScopeContext: DataScopeContext,
    payload: BindMentorDto,
  ) {
    const profile = await this.loadScopedMemberProfile(memberId, dataScopeContext);

    const mentor = await this.prisma.sysUser.findUnique({
      where: { id: this.toBigInt(payload.mentorUserId) },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!mentor || mentor.isDeleted || mentor.statusCode !== 'ACTIVE') {
      throw new NotFoundException('带教老师不存在或不可用');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.memberProfile.update({
        where: { id: profile.id },
        data: {
          mentorUserId: mentor.id,
        },
      });

      await this.appendGrowthRecord(tx, {
        memberProfileId: profile.id,
        recordType: MemberGrowthRecordType.MENTOR_BOUND,
        title: '带教绑定',
        content: `绑定带教人：${mentor.displayName}`,
        recordDate: new Date(),
        actorUserId: this.toBigInt(currentUser.id),
      });

      await this.appendOperationLog(tx, {
        memberProfileId: profile.id,
        actionType: 'MENTOR_BOUND',
        fromStatus: profile.memberStatus,
        toStatus: profile.memberStatus,
        description: `绑定带教人：${mentor.displayName}`,
        operatorUserId: this.toBigInt(currentUser.id),
      });
    });

    return this.getMemberDetail(currentUser, memberId, dataScopeContext);
  }

  async createStageEvaluation(
    currentUser: CurrentUserProfile,
    memberId: string,
    dataScopeContext: DataScopeContext,
    payload: CreateStageEvaluationDto,
  ) {
    const profile = await this.loadScopedMemberProfile(memberId, dataScopeContext);

    const evaluation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.memberStageEvaluation.create({
        data: {
          memberProfileId: profile.id,
          stageCode: payload.stageCode,
          summary: payload.summary.trim(),
          score: payload.score ?? null,
          resultCode: payload.resultCode,
          nextAction: payload.nextAction?.trim() || null,
          evaluatedAt: new Date(),
          evaluatorUserId: this.toBigInt(currentUser.id),
        },
        include: {
          evaluator: true,
        },
      });

      await this.appendGrowthRecord(tx, {
        memberProfileId: profile.id,
        recordType: MemberGrowthRecordType.STAGE_EVALUATED,
        title: `阶段评价：${payload.stageCode}`,
        content: payload.summary.trim(),
        recordDate: new Date(),
        actorUserId: this.toBigInt(currentUser.id),
      });

      await this.appendOperationLog(tx, {
        memberProfileId: profile.id,
        actionType: 'STAGE_EVALUATED',
        fromStatus: profile.memberStatus,
        toStatus: profile.memberStatus,
        description: `新增阶段评价：${payload.stageCode}`,
        operatorUserId: this.toBigInt(currentUser.id),
      });

      return created;
    });

    return {
      id: String(evaluation.id),
      stageCode: evaluation.stageCode,
      summary: evaluation.summary,
      score: evaluation.score,
      resultCode: evaluation.resultCode,
      nextAction: evaluation.nextAction,
      evaluatorName: evaluation.evaluator.displayName,
      evaluatedAt: evaluation.evaluatedAt.toISOString(),
    };
  }

  async listRegularizations(query: RegularizationQueryDto, dataScopeContext: DataScopeContext) {
    const pagination = normalizePagination(query);
    const scopeWhere = buildMemberProfileWhere(dataScopeContext);
    const clauses: Prisma.MemberRegularizationWhereInput[] = [
      {
        memberProfile: {
          isDeleted: false,
        },
      },
    ];

    if (scopeWhere) {
      clauses.push({ memberProfile: scopeWhere });
    }
    if (query.statusCode) {
      clauses.push({ statusCode: query.statusCode });
    }
    if (pagination.keyword) {
      clauses.push({
        OR: [
          { memberProfile: { user: { displayName: { contains: pagination.keyword } } } },
          { memberProfile: { user: { username: { contains: pagination.keyword } } } },
          { memberProfile: { orgUnit: { unitName: { contains: pagination.keyword } } } },
        ],
      });
    }

    const where = { AND: clauses } satisfies Prisma.MemberRegularizationWhereInput;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.memberRegularization.findMany({
        where,
        include: {
          memberProfile: {
            include: {
              user: true,
              orgUnit: true,
              mentor: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.memberRegularization.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapRegularization(item)),
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    };
  }

  async getRegularizationDetail(regularizationId: string, dataScopeContext: DataScopeContext) {
    const record = await this.loadScopedRegularization(regularizationId, dataScopeContext);

    return {
      ...this.mapRegularization(record),
      applicationReason: record.applicationReason,
      selfAssessment: record.selfAssessment,
      stageEvaluations: record.memberProfile.stageEvaluations.map((evaluation) => ({
        id: String(evaluation.id),
        stageCode: evaluation.stageCode,
        summary: evaluation.summary,
        score: evaluation.score,
        resultCode: evaluation.resultCode,
        nextAction: evaluation.nextAction,
        evaluatorName: evaluation.evaluator.displayName,
        evaluatedAt: evaluation.evaluatedAt.toISOString(),
      })),
    };
  }

  async createRegularization(
    currentUser: CurrentUserProfile,
    dataScopeContext: DataScopeContext,
    payload: CreateRegularizationDto,
  ) {
    const profile = await this.loadScopedMemberProfile(payload.memberProfileId, dataScopeContext);

    if (
      currentUser.id !== String(profile.userId) &&
      !currentUser.permissions.includes(PermissionCodes.memberUpdate)
    ) {
      throw new ForbiddenException('只能为本人或管辖成员发起转正申请');
    }

    if (!profile.mentorUserId) {
      throw new BadRequestException('请先绑定带教人');
    }

    const existingPending = await this.prisma.memberRegularization.findFirst({
      where: {
        memberProfileId: profile.id,
        statusCode: {
          in: [RegularizationStatus.DRAFT, RegularizationStatus.IN_APPROVAL],
        },
      },
    });

    if (existingPending) {
      throw new BadRequestException('已有进行中的转正申请');
    }

    const internshipStartDate = new Date(payload.internshipStartDate);
    const plannedRegularDate = new Date(payload.plannedRegularDate);

    if (plannedRegularDate < internshipStartDate) {
      throw new BadRequestException('计划转正日期不能早于实习开始日期');
    }

    const regularization = await this.prisma.$transaction(async (tx) => {
      const created = await tx.memberRegularization.create({
        data: {
          memberProfileId: profile.id,
          applicantUserId: profile.userId,
          statusCode: RegularizationStatus.IN_APPROVAL,
          internshipStartDate,
          plannedRegularDate,
          applicationReason: payload.applicationReason.trim(),
          selfAssessment: payload.selfAssessment?.trim() || null,
          mentorUserId: profile.mentorUserId,
          submittedAt: new Date(),
        },
      });

      const approval = await this.approvalService.startBusinessApproval(tx, {
        businessType: ApprovalBusinessType.MEMBER_REGULARIZATION,
        businessId: String(created.id),
        title: `${profile.user.displayName} 转正申请`,
        applicantUserId: profile.userId,
        applicantRoleCode: currentUser.activeRole.roleCode,
        formData: {
          memberProfileId: String(profile.id),
          displayName: profile.user.displayName,
          orgUnitName: profile.orgUnit.unitName,
          internshipStartDate: payload.internshipStartDate,
          plannedRegularDate: payload.plannedRegularDate,
          applicationReason: payload.applicationReason.trim(),
          selfAssessment: payload.selfAssessment?.trim() || null,
        },
      });

      await tx.memberRegularization.update({
        where: { id: created.id },
        data: {
          approvalInstanceId: approval.id,
        },
      });

      await tx.memberProfile.update({
        where: { id: profile.id },
        data: {
          memberStatus: MemberStatus.REGULARIZATION_PENDING,
        },
      });

      await this.appendGrowthRecord(tx, {
        memberProfileId: profile.id,
        recordType: MemberGrowthRecordType.REGULARIZATION_APPLIED,
        title: '发起转正申请',
        content: payload.applicationReason.trim(),
        recordDate: new Date(),
        actorUserId: this.toBigInt(currentUser.id),
      });

      await this.appendOperationLog(tx, {
        memberProfileId: profile.id,
        actionType: 'REGULARIZATION_APPLIED',
        fromStatus: profile.memberStatus,
        toStatus: MemberStatus.REGULARIZATION_PENDING,
        description: '发起转正申请并进入审批中心',
        operatorUserId: this.toBigInt(currentUser.id),
      });

      return created;
    });

    return this.getRegularizationDetail(String(regularization.id), dataScopeContext);
  }

  async approveRegularization(
    currentUser: CurrentUserProfile,
    regularizationId: string,
    dataScopeContext: DataScopeContext,
    payload: ApprovalCommentDto,
  ) {
    const record = await this.loadScopedRegularization(regularizationId, dataScopeContext);
    if (!record.approvalInstanceId) {
      throw new BadRequestException('该转正申请未绑定审批中心');
    }
    return this.approvalService.approve(currentUser, String(record.approvalInstanceId), payload);
  }

  async rejectRegularization(
    currentUser: CurrentUserProfile,
    regularizationId: string,
    dataScopeContext: DataScopeContext,
    payload: ApprovalCommentDto,
  ) {
    const record = await this.loadScopedRegularization(regularizationId, dataScopeContext);
    if (!record.approvalInstanceId) {
      throw new BadRequestException('该转正申请未绑定审批中心');
    }
    return this.approvalService.reject(currentUser, String(record.approvalInstanceId), payload);
  }

  async withdrawRegularization(
    currentUser: CurrentUserProfile,
    regularizationId: string,
    dataScopeContext: DataScopeContext,
    payload: ApprovalCommentDto,
  ) {
    const record = await this.loadScopedRegularization(regularizationId, dataScopeContext);
    if (!record.approvalInstanceId) {
      throw new BadRequestException('该转正申请未绑定审批中心');
    }
    return this.approvalService.withdraw(currentUser, String(record.approvalInstanceId), payload);
  }

  getReservedTransferFeature() {
    return {
      feature: 'MEMBER_TRANSFER',
      status: 'RESERVED',
      message: 'P1 调岗流程已预留接口，当前版本仅开放菜单占位。',
    };
  }

  getReservedExitFeature() {
    return {
      feature: 'MEMBER_EXIT',
      status: 'RESERVED',
      message: 'P1 退出流程已预留接口，当前版本仅开放菜单占位。',
    };
  }

  private async loadScopedMemberProfile(memberId: string, dataScopeContext: DataScopeContext) {
    const scopeWhere = buildMemberProfileWhere(dataScopeContext);
    const profile = await this.prisma.memberProfile.findFirst({
      where: {
        AND: [
          {
            id: this.toBigInt(memberId),
            isDeleted: false,
          },
          scopeWhere ?? {},
        ],
      },
      include: {
        user: {
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
          },
        },
        orgUnit: {
          include: {
            parent: true,
          },
        },
        mentor: true,
        growthRecords: {
          include: {
            actor: true,
          },
          orderBy: {
            recordDate: 'desc',
          },
        },
        stageEvaluations: {
          include: {
            evaluator: true,
          },
          orderBy: {
            evaluatedAt: 'desc',
          },
        },
        operationLogs: {
          include: {
            operator: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('成员档案不存在或无权访问');
    }

    return profile;
  }

  private async loadScopedRegularization(regularizationId: string, dataScopeContext: DataScopeContext) {
    const scopeWhere = buildMemberProfileWhere(dataScopeContext);
    const record = await this.prisma.memberRegularization.findFirst({
      where: {
        id: this.toBigInt(regularizationId),
        ...(scopeWhere
          ? {
              memberProfile: scopeWhere,
            }
          : {}),
      },
      include: {
        memberProfile: {
          include: {
            user: true,
            orgUnit: true,
            mentor: true,
            stageEvaluations: {
              include: {
                evaluator: true,
              },
              orderBy: {
                evaluatedAt: 'desc',
              },
            },
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('转正申请不存在或无权访问');
    }

    return record;
  }

  private mapMemberDetail(
    currentUser: CurrentUserProfile,
    profile: MemberProfileDetail,
    latestRegularization: Awaited<ReturnType<typeof this.prisma.memberRegularization.findFirst>>,
    promotionSnapshot: Awaited<ReturnType<EvaluationPromotionService['buildMemberPromotionSnapshot']>>,
    projectAndRewardSnapshot: Awaited<ReturnType<EvaluationPromotionService['buildMemberProjectAndRewardSnapshot']>>,
  ) {
    const canViewFull = this.canViewFullMemberDetail(currentUser);

    return {
      id: String(profile.id),
      userId: String(profile.userId),
      displayName: profile.user.displayName,
      username: profile.user.username,
      mobile: canViewFull ? profile.user.mobile : null,
      email: canViewFull ? profile.user.email : null,
      statusCode: profile.memberStatus,
      positionCode: profile.positionCode,
      orgUnitId: String(profile.orgUnitId),
      orgUnitName: profile.orgUnit.unitName,
      departmentName:
        profile.orgUnit.unitType === 'GROUP' ? profile.orgUnit.parent?.unitName ?? null : profile.orgUnit.unitName,
      mentorUserId: profile.mentorUserId ? String(profile.mentorUserId) : null,
      mentorName: profile.mentor?.displayName ?? null,
      joinDate: profile.joinDate.toISOString().slice(0, 10),
      roleCodes: profile.user.userRoles.map((relation) => relation.role.roleCode),
      skillTags: this.parseSkillTags(profile.skillTags),
      growthRecords: canViewFull
        ? profile.growthRecords.map((record) => ({
            id: String(record.id),
            recordType: record.recordType,
            title: record.title,
            content: record.content,
            recordDate: record.recordDate.toISOString().slice(0, 10),
            actorName: record.actor?.displayName ?? null,
          }))
        : [],
      stageEvaluations: canViewFull
        ? profile.stageEvaluations.map((evaluation) => ({
            id: String(evaluation.id),
            stageCode: evaluation.stageCode,
            summary: evaluation.summary,
            score: evaluation.score,
            resultCode: evaluation.resultCode,
            nextAction: evaluation.nextAction,
            evaluatorName: evaluation.evaluator.displayName,
            evaluatedAt: evaluation.evaluatedAt.toISOString(),
          }))
        : [],
      operationLogs: canViewFull
        ? profile.operationLogs.map((log) => ({
            id: String(log.id),
            actionType: log.actionType,
            fromStatus: log.fromStatus,
            toStatus: log.toStatus,
            description: log.description,
            operatorName: log.operator?.displayName ?? null,
            createdAt: log.createdAt.toISOString(),
          }))
        : [],
      latestRegularization: canViewFull && latestRegularization
        ? {
            id: String(latestRegularization.id),
            statusCode: latestRegularization.statusCode,
            internshipStartDate: latestRegularization.internshipStartDate.toISOString().slice(0, 10),
            plannedRegularDate: latestRegularization.plannedRegularDate.toISOString().slice(0, 10),
            submittedAt: latestRegularization.submittedAt?.toISOString() ?? null,
            completedAt: latestRegularization.completedAt?.toISOString() ?? null,
            latestResult: latestRegularization.latestResult,
            approvalInstanceId: latestRegularization.approvalInstanceId
              ? String(latestRegularization.approvalInstanceId)
              : null,
          }
        : null,
      latestEvaluation: canViewFull ? promotionSnapshot.latestEvaluation : null,
      promotionRecords: canViewFull ? promotionSnapshot.promotionRecords : [],
      projectExperiences: canViewFull ? projectAndRewardSnapshot.projectExperiences : [],
      rewardsAndPenalties: canViewFull ? projectAndRewardSnapshot.rewardsAndPenalties : [],
      canViewFull,
    };
  }

  private canViewFullMemberDetail(currentUser: CurrentUserProfile) {
    return [
      RoleCode.TEACHER,
      RoleCode.LAB_LEADER,
      RoleCode.MINISTER,
    ].includes(currentUser.activeRole.roleCode);
  }

  private mapRegularization(item: MemberRegularizationRecord | Prisma.MemberRegularizationGetPayload<{
    include: {
      memberProfile: {
        include: {
          user: true;
          orgUnit: true;
          mentor: true;
        };
      };
    };
  }>) {
    return {
      id: String(item.id),
      memberProfileId: String(item.memberProfileId),
      displayName: item.memberProfile.user.displayName,
      username: item.memberProfile.user.username,
      orgUnitName: item.memberProfile.orgUnit.unitName,
      mentorName: item.memberProfile.mentor?.displayName ?? null,
      statusCode: item.statusCode,
      memberStatus: item.memberProfile.memberStatus,
      internshipStartDate: item.internshipStartDate.toISOString().slice(0, 10),
      plannedRegularDate: item.plannedRegularDate.toISOString().slice(0, 10),
      submittedAt: item.submittedAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
      latestResult: item.latestResult,
      approvalInstanceId: item.approvalInstanceId ? String(item.approvalInstanceId) : null,
    };
  }

  private parseSkillTags(skillTags: string | null) {
    return skillTags
      ? skillTags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  }

  private async appendGrowthRecord(
    tx: Prisma.TransactionClient,
    payload: {
      memberProfileId: bigint;
      recordType: string;
      title: string;
      content?: string | null;
      recordDate: Date;
      actorUserId?: bigint | null;
      extraData?: Prisma.InputJsonValue;
    },
  ) {
    await tx.memberGrowthRecord.create({
      data: {
        memberProfileId: payload.memberProfileId,
        recordType: payload.recordType,
        title: payload.title,
        content: payload.content ?? null,
        recordDate: payload.recordDate,
        actorUserId: payload.actorUserId ?? null,
        extraData: payload.extraData,
      },
    });
  }

  private async appendOperationLog(
    tx: Prisma.TransactionClient,
    payload: {
      memberProfileId: bigint;
      actionType: string;
      fromStatus?: string | null;
      toStatus?: string | null;
      description: string;
      operatorUserId?: bigint | null;
      extraData?: Prisma.InputJsonValue;
    },
  ) {
    await tx.memberOperationLog.create({
      data: {
        memberProfileId: payload.memberProfileId,
        actionType: payload.actionType,
        fromStatus: payload.fromStatus ?? null,
        toStatus: payload.toStatus ?? null,
        description: payload.description,
        operatorUserId: payload.operatorUserId ?? null,
        extraData: payload.extraData,
      },
    });
  }

  private toBigInt(value: string) {
    return BigInt(value);
  }
}
