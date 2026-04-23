import { ApprovalService } from '@api/modules/approval/approval.service';
import { AttachmentsService } from '@api/modules/attachments/attachments.service';
import { buildMemberProfileWhere } from '@api/modules/auth/data-scope-prisma';
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
  AchievementType,
  ApprovalBusinessType,
  CompetitionRegistrationStatus,
  CompetitionStatus,
  type CurrentUserProfile,
  type DataScopeContext,
  normalizePagination,
  PermissionCodes,
  RoleCode,
} from '@smw/shared';

import { AchievementRecognitionService } from './achievement-recognition.service';
import type { AchievementQueryDto } from './dto/achievement-query.dto';
import type { CompetitionQueryDto } from './dto/competition-query.dto';
import type { RegisterCompetitionTeamDto } from './dto/register-competition-team.dto';
import type { UpsertAchievementDto } from './dto/upsert-achievement.dto';
import type { UpsertCompetitionDto } from './dto/upsert-competition.dto';

type AchievementRecord = Prisma.AchvAchievementGetPayload<{
  include: {
    applicant: true;
    sourceCompetition: true;
    sourceTeam: true;
    paper: true;
    ipAsset: true;
    contributors: {
      orderBy: {
        contributionRank: 'asc';
      };
    };
  };
}>;

type CompetitionStatusLog = {
  actionType: string;
  operatorUserId: string | null;
  operatorName: string | null;
  resultStatus: string | null;
  comment: string | null;
  createdAt: string;
};

@Injectable()
export class CompetitionAchievementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
    private readonly recognitionService: AchievementRecognitionService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  async listCompetitions(query: CompetitionQueryDto) {
    const pagination = normalizePagination(query);
    const clauses: Prisma.CompCompetitionWhereInput[] = [{ isDeleted: false }];

    if (query.competitionLevel) {
      clauses.push({ competitionLevel: query.competitionLevel });
    }
    if (query.involvedField) {
      clauses.push({ involvedField: query.involvedField });
    }
    if (pagination.keyword) {
      clauses.push({
        OR: [
          { name: { contains: pagination.keyword } },
          { location: { contains: pagination.keyword } },
          { involvedField: { contains: pagination.keyword } },
        ],
      });
    }
    const where = { AND: clauses } satisfies Prisma.CompCompetitionWhereInput;

    const items = await this.prisma.compCompetition.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { registrationEndDate: 'asc' }],
    });

    const mapped = items.map((item) => this.mapCompetition(item));
    const filtered = query.statusCode ? mapped.filter((item) => item.statusCode === query.statusCode) : mapped;
    const total = filtered.length;
    const paged = filtered.slice((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize);

    return {
      items: paged,
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    };
  }

  async getCompetitionDetail(id: string, dataScopeContext: DataScopeContext) {
    const record = await this.prisma.compCompetition.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        teams: {
          where: { isDeleted: false },
          include: {
            teamLeader: true,
            advisor: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!record || record.isDeleted) {
      throw new NotFoundException('赛事不存在');
    }
    const visibleUserIds = await this.resolveVisibleUserIds(dataScopeContext);
    const teams = visibleUserIds
      ? record.teams.filter((item) => visibleUserIds.some((userId) => this.isTeamVisibleToUserId(item, userId)))
      : record.teams;

    return {
      ...this.mapCompetition(record),
      teams: teams.map((item) => this.mapCompetitionTeam(item, record.name)),
    };
  }

  async upsertCompetition(currentUser: CurrentUserProfile, id: string | null, payload: UpsertCompetitionDto) {
    const involvedField = payload.involvedField.trim();
    const data = {
      name: payload.name.trim(),
      location: payload.location.trim(),
      competitionLevel: payload.competitionLevel.trim(),
      involvedField,
      // Backward compatibility: keep old column populated but do not expose/use it in API.
      competitionCategory: involvedField,
      registrationStartDate: this.toDateOrNull(payload.registrationStartDate),
      registrationEndDate: this.toDateOrNull(payload.registrationEndDate),
      eventStartDate: this.toDateOrNull(payload.eventStartDate),
      eventEndDate: this.toDateOrNull(payload.eventEndDate),
      description: payload.description?.trim() || null,
    } satisfies Prisma.CompCompetitionUncheckedUpdateInput;

    if (!id) {
      const createdBy = this.toBigInt(currentUser.id);

      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const created = await this.prisma.compCompetition.create({
            data: {
              competitionCode: this.generateCompetitionCode(),
              organizer: 'N/A',
              statusCode: CompetitionStatus.DRAFT,
              publishedAt: null,
              archivedAt: null,
              name: data.name,
              location: data.location,
              competitionLevel: data.competitionLevel,
              involvedField: data.involvedField,
              competitionCategory: data.competitionCategory,
              registrationStartDate: data.registrationStartDate,
              registrationEndDate: data.registrationEndDate,
              eventStartDate: data.eventStartDate,
              eventEndDate: data.eventEndDate,
              description: data.description,
              statusLogs: this.appendCompetitionStatusLog(null, {
                actionType: 'COMPETITION_CREATED',
                operatorUserId: currentUser.id,
                operatorName: currentUser.displayName,
                resultStatus: 'SUCCESS',
                comment: '赛事已创建',
              }),
              createdBy,
            },
          });
          return this.mapCompetition(created);
        } catch (error) {
          const known = error as { code?: string } | null;
          if (known?.code === 'P2002') continue;
          throw error;
        }
      }

      throw new BadRequestException('赛事创建失败，请重试');
    }

    const exists = await this.prisma.compCompetition.findUnique({
      where: { id: this.toBigInt(id) },
      select: { id: true, isDeleted: true, statusLogs: true },
    });

    if (!exists || exists.isDeleted) {
      throw new NotFoundException('赛事不存在');
    }

    const updated = await this.prisma.compCompetition.update({
      where: { id: exists.id },
      data: {
        ...data,
        statusLogs: this.appendCompetitionStatusLog(exists.statusLogs, {
          actionType: 'COMPETITION_UPDATED',
          operatorUserId: currentUser.id,
          operatorName: currentUser.displayName,
          resultStatus: 'SUCCESS',
          comment: '赛事已编辑',
        }),
      },
    });

    return this.mapCompetition(updated);
  }

  async publishCompetition(currentUser: CurrentUserProfile, id: string) {
    void currentUser;

    const record = await this.prisma.compCompetition.findUnique({
      where: { id: this.toBigInt(id) },
      select: {
        id: true,
        isDeleted: true,
        name: true,
        location: true,
        competitionLevel: true,
        involvedField: true,
        registrationStartDate: true,
        registrationEndDate: true,
        eventStartDate: true,
        eventEndDate: true,
        publishedAt: true,
        archivedAt: true,
        statusLogs: true,
      },
    });

    if (!record || record.isDeleted) {
      throw new NotFoundException('赛事不存在');
    }
    if (record.archivedAt) {
      throw new BadRequestException('赛事已归档，无法发布');
    }

    this.assertCompetitionPublishable(record);

    const updated = await this.prisma.compCompetition.update({
      where: { id: record.id },
      data: {
        publishedAt: record.publishedAt ?? new Date(),
        statusLogs: this.appendCompetitionStatusLog(record.statusLogs, {
          actionType: 'COMPETITION_PUBLISHED',
          operatorUserId: currentUser.id,
          operatorName: currentUser.displayName,
          resultStatus: 'SUCCESS',
          comment: '赛事已发布',
        }),
      },
    });

    return this.mapCompetition(updated);
  }

  async deleteCompetition(currentUser: CurrentUserProfile, id: string) {
    const record = await this.prisma.compCompetition.findUnique({
      where: { id: this.toBigInt(id) },
      select: {
        id: true,
        isDeleted: true,
        createdBy: true,
        statusLogs: true,
        teams: {
          where: { isDeleted: false },
          select: { id: true },
        },
      },
    });

    if (!record || record.isDeleted) {
      throw new NotFoundException('赛事不存在');
    }

    const hasTeams = record.teams.length > 0;
    const isOwner = record.createdBy ? String(record.createdBy) === currentUser.id : false;
    const isTeacherOrMinister = [RoleCode.TEACHER, RoleCode.MINISTER].includes(currentUser.activeRole.roleCode);

    if (hasTeams && !isTeacherOrMinister && !isOwner) {
      throw new ForbiddenException('该赛事已有报名记录，仅老师/负责人可删除');
    }

    await this.prisma.compCompetition.update({
      where: { id: record.id },
      data: {
        isDeleted: true,
        statusLogs: this.appendCompetitionStatusLog(record.statusLogs, {
          actionType: 'COMPETITION_DELETED',
          operatorUserId: currentUser.id,
          operatorName: currentUser.displayName,
          resultStatus: 'SUCCESS',
          comment: '赛事已删除',
        }),
      },
    });

    return { ok: true };
  }

  async registerCompetitionTeam(
    currentUser: CurrentUserProfile,
    competitionId: string,
    payload: RegisterCompetitionTeamDto,
  ) {
    const competition = await this.prisma.compCompetition.findUnique({
      where: { id: this.toBigInt(competitionId) },
    });

    if (!competition || competition.isDeleted) {
      throw new NotFoundException('赛事不存在');
    }

    const memberIds = [...new Set(payload.members.map((item) => item.userId.trim()).filter(Boolean))];
    if (!memberIds.length) {
      throw new BadRequestException('至少选择一名队伍成员');
    }
    if (!memberIds.includes(payload.teamLeaderUserId)) {
      memberIds.unshift(payload.teamLeaderUserId);
    }

    const users = await this.prisma.sysUser.findMany({
      where: {
        id: {
          in: [...memberIds, payload.advisorUserId].filter(Boolean).map((item) => this.toBigInt(item!)),
        },
        isDeleted: false,
      },
    });

    const userMap = new Map(users.map((item) => [String(item.id), item]));
    const leader = userMap.get(payload.teamLeaderUserId);
    if (!leader) {
      throw new BadRequestException('队长不存在');
    }

    const advisor = payload.advisorUserId ? userMap.get(payload.advisorUserId) : null;
    if (payload.advisorUserId && !advisor) {
      throw new BadRequestException('指导老师不存在');
    }

    const existingActiveTeam = await this.prisma.compTeam.findFirst({
      where: {
        competitionId: competition.id,
        isDeleted: false,
        OR: [{ teamLeaderUserId: leader.id }, { teamName: payload.teamName.trim() }],
        statusCode: {
          in: [CompetitionRegistrationStatus.DRAFT, CompetitionRegistrationStatus.IN_APPROVAL],
        },
      },
      select: {
        id: true,
      },
    });

    if (existingActiveTeam) {
      throw new BadRequestException('同一赛事下已存在进行中的报名申请，请先完成当前流程');
    }

    const memberNames = memberIds.map((id) => {
      const user = userMap.get(id);
      if (!user) {
        throw new BadRequestException(`成员 ${id} 不存在`);
      }
      return user.displayName;
    });

    return this.prisma.$transaction(async (tx) => {
      const team = await tx.compTeam.create({
        data: {
          competitionId: competition.id,
          teamName: payload.teamName.trim(),
          teamLeaderUserId: leader.id,
          advisorUserId: advisor?.id ?? null,
          memberUserIds: this.serializeIdList(memberIds),
          memberNames: memberNames.join('、'),
          projectId: payload.projectId?.trim() || null,
          projectName: payload.projectName?.trim() || null,
          applicationReason: payload.applicationReason?.trim() || null,
          statusCode: CompetitionRegistrationStatus.DRAFT,
          createdBy: this.toBigInt(currentUser.id),
        },
        include: {
          teamLeader: true,
          advisor: true,
        },
      });

      const approval = await this.approvalService.startBusinessApproval(tx, {
        businessType: ApprovalBusinessType.COMPETITION_REGISTRATION,
        businessId: String(team.id),
        title: `${competition.name} - ${team.teamName} 报名申请`,
        applicantUserId: this.toBigInt(currentUser.id),
        applicantRoleCode: currentUser.activeRole.roleCode,
        formData: {
          competitionName: competition.name,
          teamName: team.teamName,
          teamLeaderName: team.teamLeader.displayName,
          advisorName: team.advisor?.displayName ?? null,
          memberNames,
          projectName: team.projectName,
        },
      });

      const updated = await tx.compTeam.update({
        where: { id: team.id },
        data: {
          statusCode: CompetitionRegistrationStatus.IN_APPROVAL,
          approvalInstanceId: approval.id,
          submittedAt: new Date(),
          latestResult: '报名申请已提交审批',
        },
        include: {
          teamLeader: true,
          advisor: true,
        },
      });

      return this.mapCompetitionTeam(updated, competition.name);
    });
  }

  async updateCompetitionTeam(
    currentUser: CurrentUserProfile,
    competitionId: string,
    teamId: string,
    payload: RegisterCompetitionTeamDto,
  ) {
    const competition = await this.prisma.compCompetition.findUnique({
      where: { id: this.toBigInt(competitionId) },
      select: { id: true, name: true, isDeleted: true },
    });

    if (!competition || competition.isDeleted) {
      throw new NotFoundException('赛事不存在');
    }

    const team = await this.prisma.compTeam.findUnique({
      where: { id: this.toBigInt(teamId) },
      include: { teamLeader: true, advisor: true },
    });

    if (!team || team.isDeleted || team.competitionId !== competition.id) {
      throw new NotFoundException('队伍报名记录不存在');
    }

    if (![CompetitionRegistrationStatus.DRAFT, CompetitionRegistrationStatus.IN_APPROVAL].includes(team.statusCode as never)) {
      throw new BadRequestException('当前报名流程已结束，无法修改队伍信息');
    }

    const userId = this.toBigInt(currentUser.id);
    if (!this.isTeamVisibleToUserId(team, userId)) {
      throw new ForbiddenException('无权修改该队伍信息');
    }

    const memberIds = [...new Set(payload.members.map((item) => item.userId.trim()).filter(Boolean))];
    if (!memberIds.length) {
      throw new BadRequestException('至少选择一名队伍成员');
    }
    if (!memberIds.includes(payload.teamLeaderUserId)) {
      memberIds.unshift(payload.teamLeaderUserId);
    }

    const users = await this.prisma.sysUser.findMany({
      where: {
        id: {
          in: [...memberIds, payload.advisorUserId].filter(Boolean).map((item) => this.toBigInt(item!)),
        },
        isDeleted: false,
      },
    });

    const userMap = new Map(users.map((item) => [String(item.id), item]));
    const leader = userMap.get(payload.teamLeaderUserId);
    if (!leader) {
      throw new BadRequestException('队长不存在');
    }

    const advisor = payload.advisorUserId ? userMap.get(payload.advisorUserId) : null;
    if (payload.advisorUserId && !advisor) {
      throw new BadRequestException('指导老师不存在');
    }

    const existingActiveTeam = await this.prisma.compTeam.findFirst({
      where: {
        competitionId: competition.id,
        isDeleted: false,
        id: { not: team.id },
        OR: [{ teamLeaderUserId: leader.id }, { teamName: payload.teamName.trim() }],
        statusCode: {
          in: [CompetitionRegistrationStatus.DRAFT, CompetitionRegistrationStatus.IN_APPROVAL],
        },
      },
      select: { id: true },
    });

    if (existingActiveTeam) {
      throw new BadRequestException('同一赛事下已存在进行中的报名申请，请先完成当前流程');
    }

    const memberNames = memberIds.map((id) => {
      const user = userMap.get(id);
      if (!user) {
        throw new BadRequestException(`成员 ${id} 不存在`);
      }
      return user.displayName;
    });

    const updated = await this.prisma.compTeam.update({
      where: { id: team.id },
      data: {
        teamName: payload.teamName.trim(),
        teamLeaderUserId: leader.id,
        advisorUserId: advisor?.id ?? null,
        memberUserIds: this.serializeIdList(memberIds),
        memberNames: memberNames.join('、'),
        projectId: payload.projectId?.trim() || null,
        projectName: payload.projectName?.trim() || null,
        applicationReason: payload.applicationReason?.trim() || null,
        latestResult: '队伍信息已更新',
      },
      include: { teamLeader: true, advisor: true },
    });

    return this.mapCompetitionTeam(updated, competition.name);
  }
  async listUserOptions() {
    const items = await this.prisma.sysUser.findMany({
      where: {
        isDeleted: false,
        statusCode: 'ACTIVE',
      },
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
      orderBy: {
        id: 'asc',
      },
    });

    return items.map((item) => ({
      id: String(item.id),
      label: `${item.displayName} / ${item.username}`,
      username: item.username,
      roleCodes: item.userRoles.map((relation) => relation.role.roleCode),
    }));
  }

  async listAchievements(query: AchievementQueryDto, dataScopeContext: DataScopeContext) {
    const pagination = normalizePagination(query);
    const visibleUserIds = await this.resolveVisibleUserIds(dataScopeContext);
    const clauses: Prisma.AchvAchievementWhereInput[] = [{ isDeleted: false }];

    if (query.achievementType) {
      clauses.push({ achievementType: query.achievementType });
    }
    if (query.statusCode) {
      clauses.push({ statusCode: query.statusCode });
    }
    if (query.levelCode) {
      clauses.push({ levelCode: query.levelCode });
    }
    if (query.projectId) {
      clauses.push({ projectId: query.projectId });
    }
    if (query.memberUserId) {
      clauses.push({
        OR: [
          { applicantUserId: this.toBigInt(query.memberUserId) },
          { contributors: { some: { userId: this.toBigInt(query.memberUserId) } } },
        ],
      });
    }
    if (pagination.keyword) {
      clauses.push({
        OR: [
          { title: { contains: pagination.keyword } },
          { projectName: { contains: pagination.keyword } },
          { contributors: { some: { contributorName: { contains: pagination.keyword } } } },
        ],
      });
    }
    if (visibleUserIds) {
      clauses.push({
        OR: [
          { createdBy: { in: visibleUserIds } },
          { applicantUserId: { in: visibleUserIds } },
          { contributors: { some: { userId: { in: visibleUserIds } } } },
          {
            sourceTeam: {
              is: this.buildCompetitionTeamVisibilityWhere(visibleUserIds),
            },
          },
        ],
      });
    }

    const where = { AND: clauses } satisfies Prisma.AchvAchievementWhereInput;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.achvAchievement.findMany({
        where,
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
        orderBy: [{ statusCode: 'asc' }, { updatedAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.achvAchievement.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapAchievement(item)),
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    };
  }

  async getAchievementDetail(id: string, dataScopeContext: DataScopeContext) {
    const record = await this.loadAchievementRecord(id);
    await this.ensureAchievementVisible(record, dataScopeContext);
    return this.mapAchievementDetail(record);
  }

  async createAchievement(
    currentUser: CurrentUserProfile,
    payload: UpsertAchievementDto,
    dataScopeContext: DataScopeContext,
  ) {
    await this.ensureContributorScope(payload, dataScopeContext);

    return this.prisma.$transaction(async (tx) => {
      const recognition = this.recognitionService.generatePlaceholder({
        achievementType: payload.achievementType,
        levelCode: payload.levelCode ?? null,
        projectId: payload.projectId ?? null,
      });

      const created = await tx.achvAchievement.create({
        data: {
          achievementType: payload.achievementType.trim(),
          title: payload.title.trim(),
          levelCode: payload.levelCode?.trim() || null,
          statusCode: AchievementStatus.DRAFT,
          recognizedGrade: recognition.recognizedGrade,
          scoreMapping: recognition.scoreMapping as Prisma.InputJsonValue,
          projectId: payload.projectId?.trim() || null,
          projectName: payload.projectName?.trim() || null,
          sourceCompetitionId: payload.sourceCompetitionId ? this.toBigInt(payload.sourceCompetitionId) : null,
          sourceTeamId: payload.sourceTeamId ? this.toBigInt(payload.sourceTeamId) : null,
          description: payload.description?.trim() || null,
          applicantUserId: this.toBigInt(currentUser.id),
          createdBy: this.toBigInt(currentUser.id),
        },
      });

      await this.replaceAchievementChildren(tx, created.id, payload);

      if (Array.isArray(payload.attachmentFileIds) && payload.attachmentFileIds.length) {
        await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
          businessType: ApprovalBusinessType.ACHIEVEMENT_RECOGNITION,
          businessId: String(created.id),
          usageType: 'ACHIEVEMENT_PROOF',
          fileIds: payload.attachmentFileIds,
        });
      }

      if (payload.submitForApproval) {
        const approval = await this.approvalService.startBusinessApproval(tx, {
          businessType: ApprovalBusinessType.ACHIEVEMENT_RECOGNITION,
          businessId: String(created.id),
          title: `成果认定 - ${created.title}`,
          applicantUserId: this.toBigInt(currentUser.id),
          applicantRoleCode: currentUser.activeRole.roleCode,
          formData: {
            title: created.title,
            achievementType: created.achievementType,
            levelCode: created.levelCode,
            projectName: created.projectName,
          },
        });

        await tx.achvAchievement.update({
          where: { id: created.id },
          data: {
            statusCode: AchievementStatus.IN_APPROVAL,
            approvalInstanceId: approval.id,
            submittedAt: new Date(),
            latestResult: '成果已提交认定审批',
          },
        });
      }

      return this.getAchievementDetail(String(created.id), dataScopeContext);
    });
  }

  async updateAchievement(
    id: string,
    currentUser: CurrentUserProfile,
    payload: UpsertAchievementDto,
    dataScopeContext: DataScopeContext,
  ) {
    const record = await this.loadAchievementRecord(id);
    await this.ensureAchievementVisible(record, dataScopeContext);
    this.ensureAchievementEditable(record, currentUser);
    await this.ensureContributorScope(payload, dataScopeContext);

    return this.prisma.$transaction(async (tx) => {
      const recognition = this.recognitionService.generatePlaceholder({
        achievementType: payload.achievementType,
        levelCode: payload.levelCode ?? null,
        projectId: payload.projectId ?? null,
      });

      await tx.achvAchievement.update({
        where: { id: record.id },
        data: {
          achievementType: payload.achievementType.trim(),
          title: payload.title.trim(),
          levelCode: payload.levelCode?.trim() || null,
          recognizedGrade: recognition.recognizedGrade,
          scoreMapping: recognition.scoreMapping as Prisma.InputJsonValue,
          projectId: payload.projectId?.trim() || null,
          projectName: payload.projectName?.trim() || null,
          sourceCompetitionId: payload.sourceCompetitionId ? this.toBigInt(payload.sourceCompetitionId) : null,
          sourceTeamId: payload.sourceTeamId ? this.toBigInt(payload.sourceTeamId) : null,
          description: payload.description?.trim() || null,
        },
      });

      await this.replaceAchievementChildren(tx, record.id, payload);

      if (Array.isArray(payload.attachmentFileIds) && payload.attachmentFileIds.length) {
        await this.attachmentsService.bindAttachmentsAsSystem(tx, currentUser, {
          businessType: ApprovalBusinessType.ACHIEVEMENT_RECOGNITION,
          businessId: String(record.id),
          usageType: 'ACHIEVEMENT_PROOF',
          fileIds: payload.attachmentFileIds,
        });
      }

      if (payload.submitForApproval && !record.approvalInstanceId) {
        const approval = await this.approvalService.startBusinessApproval(tx, {
          businessType: ApprovalBusinessType.ACHIEVEMENT_RECOGNITION,
          businessId: String(record.id),
          title: `成果认定 - ${payload.title.trim()}`,
          applicantUserId: this.toBigInt(currentUser.id),
          applicantRoleCode: currentUser.activeRole.roleCode,
          formData: {
            title: payload.title.trim(),
            achievementType: payload.achievementType,
            levelCode: payload.levelCode,
            projectName: payload.projectName,
          },
        });

        await tx.achvAchievement.update({
          where: { id: record.id },
          data: {
            statusCode: AchievementStatus.IN_APPROVAL,
            approvalInstanceId: approval.id,
            submittedAt: new Date(),
            latestResult: '成果已提交认定审批',
          },
        });
      }

      return this.getAchievementDetail(String(record.id), dataScopeContext);
    });
  }

  async listCompetitionOptions() {
    const items = await this.prisma.compCompetition.findMany({
      where: {
        isDeleted: false,
      },
      orderBy: [{ statusCode: 'asc' }, { name: 'asc' }],
    });

    return items.map((item) => ({
      id: String(item.id),
      label: `${item.name} / ${item.competitionLevel}`,
    }));
  }

  private async loadAchievementRecord(id: string) {
    const record = await this.prisma.achvAchievement.findUnique({
      where: { id: this.toBigInt(id) },
      include: {
        applicant: true,
        sourceCompetition: true,
        sourceTeam: true,
        paper: true,
        ipAsset: true,
        contributors: {
          orderBy: {
            contributionRank: 'asc',
          },
        },
      },
    });

    if (!record || record.isDeleted) {
      throw new NotFoundException('成果不存在');
    }

    return record;
  }

  private async replaceAchievementChildren(
    tx: Prisma.TransactionClient,
    achievementId: bigint,
    payload: UpsertAchievementDto,
  ) {
    await tx.achvContributor.deleteMany({
      where: { achievementId },
    });

    await tx.achvContributor.createMany({
      data: payload.contributors.map((item) => ({
        achievementId,
        userId: item.userId ? this.toBigInt(item.userId) : null,
        contributorName: item.contributorName.trim(),
        contributorRole: item.contributorRole.trim(),
        contributionRank: item.contributionRank,
        isInternal: item.isInternal,
        contributionDescription: item.contributionDescription?.trim() || null,
      })),
    });

    if (payload.achievementType === AchievementType.PAPER && payload.paper) {
      await tx.achvPaper.upsert({
        where: { achievementId },
        update: {
          journalName: payload.paper.journalName?.trim() || null,
          publishDate: this.toDateOrNull(payload.paper.publishDate),
          doi: payload.paper.doi?.trim() || null,
          indexedBy: payload.paper.indexedBy?.trim() || null,
          authorOrder: payload.paper.authorOrder?.trim() || null,
          correspondingAuthor: payload.paper.correspondingAuthor?.trim() || null,
        },
        create: {
          achievementId,
          journalName: payload.paper.journalName?.trim() || null,
          publishDate: this.toDateOrNull(payload.paper.publishDate),
          doi: payload.paper.doi?.trim() || null,
          indexedBy: payload.paper.indexedBy?.trim() || null,
          authorOrder: payload.paper.authorOrder?.trim() || null,
          correspondingAuthor: payload.paper.correspondingAuthor?.trim() || null,
        },
      });
    } else {
      await tx.achvPaper.deleteMany({
        where: { achievementId },
      });
    }

    if (payload.achievementType === AchievementType.SOFTWARE_COPYRIGHT && payload.ipAsset) {
      await tx.ipAsset.upsert({
        where: { achievementId },
        update: {
          assetType: payload.ipAsset.assetType?.trim() || AchievementType.SOFTWARE_COPYRIGHT,
          certificateNo: payload.ipAsset.certificateNo?.trim() || null,
          registrationNo: payload.ipAsset.registrationNo?.trim() || null,
          authorizedDate: this.toDateOrNull(payload.ipAsset.authorizedDate),
          ownerUnit: payload.ipAsset.ownerUnit?.trim() || null,
          remarks: payload.ipAsset.remarks?.trim() || null,
        },
        create: {
          achievementId,
          assetType: payload.ipAsset.assetType?.trim() || AchievementType.SOFTWARE_COPYRIGHT,
          certificateNo: payload.ipAsset.certificateNo?.trim() || null,
          registrationNo: payload.ipAsset.registrationNo?.trim() || null,
          authorizedDate: this.toDateOrNull(payload.ipAsset.authorizedDate),
          ownerUnit: payload.ipAsset.ownerUnit?.trim() || null,
          remarks: payload.ipAsset.remarks?.trim() || null,
        },
      });
    } else {
      await tx.ipAsset.deleteMany({
        where: { achievementId },
      });
    }
  }

  private async ensureContributorScope(payload: UpsertAchievementDto, dataScopeContext: DataScopeContext) {
    const visibleUserIds = await this.resolveVisibleUserIds(dataScopeContext);
    if (!visibleUserIds) {
      return;
    }

    const contributorIds = payload.contributors.filter((item) => item.userId).map((item) => this.toBigInt(item.userId!));
    if (!contributorIds.every((id) => visibleUserIds.includes(id))) {
      throw new ForbiddenException('存在超出当前数据范围的贡献成员');
    }
  }

  private ensureAchievementEditable(record: AchievementRecord, currentUser: CurrentUserProfile) {
    if (record.statusCode !== AchievementStatus.DRAFT) {
      throw new BadRequestException('当前成果已提交审批或已完成认定，暂不支持编辑');
    }

    if (String(record.applicantUserId) !== currentUser.id && !currentUser.permissions.includes(PermissionCodes.achievementUpdate)) {
      throw new ForbiddenException('仅申请人可编辑成果草稿');
    }
  }

  private async ensureAchievementVisible(record: AchievementRecord, dataScopeContext: DataScopeContext) {
    const visibleUserIds = await this.resolveVisibleUserIds(dataScopeContext);
    if (!visibleUserIds) {
      return;
    }

    const sourceTeamVisible = record.sourceTeam
      ? visibleUserIds.some((id) => this.isTeamVisibleToUserId(record.sourceTeam!, id))
      : false;
    const contributorVisible = record.contributors.some(
      (item) => item.userId && visibleUserIds.some((visibleId) => visibleId === item.userId),
    );

    if (
      !visibleUserIds.includes(record.applicantUserId) &&
      !(record.createdBy && visibleUserIds.includes(record.createdBy)) &&
      !contributorVisible &&
      !sourceTeamVisible
    ) {
      throw new ForbiddenException('当前数据范围不可访问该成果');
    }
  }

  private buildCompetitionTeamVisibilityWhere(visibleUserIds: bigint[]): Prisma.CompTeamWhereInput {
    return {
      isDeleted: false,
      OR: [
        { teamLeaderUserId: { in: visibleUserIds } },
        { advisorUserId: { in: visibleUserIds } },
        ...visibleUserIds.map((id) => ({
          memberUserIds: {
            contains: `,${id.toString()},`,
          },
        })),
      ],
    };
  }

  private isTeamVisibleToUserId(
    team: { teamLeaderUserId: bigint; advisorUserId: bigint | null; memberUserIds: string },
    userId: bigint,
  ) {
    return (
      team.teamLeaderUserId === userId ||
      team.advisorUserId === userId ||
      team.memberUserIds.includes(`,${userId.toString()},`)
    );
  }

  private async resolveVisibleUserIds(dataScopeContext: DataScopeContext) {
    if (dataScopeContext.scope === 'ALL') {
      return null;
    }

    if (dataScopeContext.scope === 'SELF_PARTICIPATE') {
      return [...new Set([...dataScopeContext.selfUserIds, ...dataScopeContext.participatingUserIds])].map((id) =>
        BigInt(id),
      );
    }

    const profiles = await this.prisma.memberProfile.findMany({
      where: {
        isDeleted: false,
        ...(buildMemberProfileWhere(dataScopeContext) ?? {}),
      },
      select: {
        userId: true,
      },
    });

    return [...new Set([dataScopeContext.userId, ...profiles.map((item) => String(item.userId))])].map((id) =>
      BigInt(id),
    );
  }

  private appendCompetitionStatusLog(
    raw: Prisma.JsonValue | null,
    entry: Omit<CompetitionStatusLog, 'createdAt'>,
  ): Prisma.InputJsonValue {
    const list = this.readCompetitionStatusLogs(raw);
    list.push({ ...entry, createdAt: new Date().toISOString() });
    return list as Prisma.InputJsonValue;
  }

  private readCompetitionStatusLogs(raw: Prisma.JsonValue | null) {
    if (!Array.isArray(raw)) {
      return [] as CompetitionStatusLog[];
    }
    return raw.filter((item): item is CompetitionStatusLog => typeof item === 'object' && item !== null);
  }

  private mapCompetition(item: {
    id: bigint;
    name: string;
    location: string | null;
    competitionLevel: string;
    involvedField: string | null;
    statusCode: string;
    publishedAt: Date | null;
    archivedAt: Date | null;
    registrationStartDate: Date | null;
    registrationEndDate: Date | null;
    eventStartDate: Date | null;
    eventEndDate: Date | null;
    description: string | null;
    createdAt: Date;
  }) {
    const statusCode = this.resolveCompetitionStatus(item);
    return {
      id: String(item.id),
      name: item.name,
      location: item.location,
      competitionLevel: item.competitionLevel,
      involvedField: item.involvedField,
      statusCode,
      registrationStartDate: this.toDateTimeString(item.registrationStartDate),
      registrationEndDate: this.toDateTimeString(item.registrationEndDate),
      eventStartDate: this.toDateTimeString(item.eventStartDate),
      eventEndDate: this.toDateTimeString(item.eventEndDate),
      description: item.description,
      createdAt: item.createdAt.toISOString(),
    };
  }

  private mapCompetitionTeam(
    item: Prisma.CompTeamGetPayload<{
      include: {
        teamLeader: true;
        advisor: true;
      };
    }>,
    competitionName: string,
  ) {
    return {
      id: String(item.id),
      competitionId: String(item.competitionId),
      competitionName,
      teamName: item.teamName,
      teamLeaderUserId: String(item.teamLeaderUserId),
      teamLeaderName: item.teamLeader.displayName,
      advisorUserId: item.advisorUserId ? String(item.advisorUserId) : null,
      advisorName: item.advisor?.displayName ?? null,
      memberUserIds: this.deserializeIdList(item.memberUserIds),
      memberNames: item.memberNames ? item.memberNames.split('、') : [],
      projectId: item.projectId,
      projectName: item.projectName,
      applicationReason: item.applicationReason,
      statusCode: item.statusCode,
      latestResult: item.latestResult,
      approvalInstanceId: item.approvalInstanceId ? String(item.approvalInstanceId) : null,
      submittedAt: item.submittedAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    };
  }

  private mapAchievement(
    item: Prisma.AchvAchievementGetPayload<{
      include: {
        applicant: true;
        sourceCompetition: true;
        sourceTeam: true;
        contributors: true;
      };
    }>,
  ) {
    return {
      id: String(item.id),
      title: item.title,
      achievementType: item.achievementType,
      statusCode: item.statusCode,
      levelCode: item.levelCode,
      recognizedGrade: item.recognizedGrade,
      scoreMapping: this.toObject(item.scoreMapping),
      projectId: item.projectId,
      projectName: item.projectName,
      sourceCompetitionId: item.sourceCompetitionId ? String(item.sourceCompetitionId) : null,
      sourceCompetitionName: item.sourceCompetition?.name ?? null,
      sourceTeamId: item.sourceTeamId ? String(item.sourceTeamId) : null,
      sourceTeamName: item.sourceTeam?.teamName ?? null,
      applicantUserId: String(item.applicantUserId),
      applicantName: item.applicant.displayName,
      latestResult: item.latestResult,
      approvalInstanceId: item.approvalInstanceId ? String(item.approvalInstanceId) : null,
      submittedAt: item.submittedAt?.toISOString() ?? null,
      recognizedAt: item.recognizedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      contributorNames: item.contributors.map((contributor) => contributor.contributorName),
    };
  }

  private mapAchievementDetail(item: AchievementRecord) {
    return {
      ...this.mapAchievement(item),
      description: item.description,
      paper: item.paper
        ? {
            journalName: item.paper.journalName,
            publishDate: this.toDateString(item.paper.publishDate),
            doi: item.paper.doi,
            indexedBy: item.paper.indexedBy,
            authorOrder: item.paper.authorOrder,
            correspondingAuthor: item.paper.correspondingAuthor,
          }
        : null,
      ipAsset: item.ipAsset
        ? {
            assetType: item.ipAsset.assetType,
            certificateNo: item.ipAsset.certificateNo,
            registrationNo: item.ipAsset.registrationNo,
            authorizedDate: this.toDateString(item.ipAsset.authorizedDate),
            ownerUnit: item.ipAsset.ownerUnit,
            remarks: item.ipAsset.remarks,
          }
        : null,
      contributors: item.contributors.map((contributor) => ({
        id: String(contributor.id),
        userId: contributor.userId ? String(contributor.userId) : null,
        contributorName: contributor.contributorName,
        contributorRole: contributor.contributorRole,
        contributionRank: contributor.contributionRank,
        isInternal: contributor.isInternal,
        contributionDescription: contributor.contributionDescription,
      })),
    };
  }

  private serializeIdList(ids: string[]) {
    return `,${ids.join(',')},`;
  }

  private deserializeIdList(value: string) {
    return value.split(',').filter(Boolean);
  }

  private toBigInt(value: string) {
    return BigInt(value);
  }

  private toDateOrNull(value?: string | null) {
    return value ? new Date(value) : null;
  }

  private toDateTimeString(value?: Date | null) {
    if (!value) return null;
    return value.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  private toDateString(value?: Date | null) {
    return value ? value.toISOString().slice(0, 10) : null;
  }

  private generateCompetitionCode() {
    const now = Date.now();
    const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
    return `COMP-${now}-${rand}`;
  }

  private isCompetitionPublished(item: { publishedAt: Date | null; statusCode: string }) {
    if (item.publishedAt) return true;
    // Backward compatibility for old data.
    return ['OPEN', 'CLOSED', 'PUBLISHED'].includes(String(item.statusCode));
  }

  private resolveCompetitionStatus(item: {
    statusCode: string;
    publishedAt: Date | null;
    archivedAt: Date | null;
    registrationStartDate: Date | null;
    registrationEndDate: Date | null;
    eventStartDate: Date | null;
    eventEndDate: Date | null;
  }) {
    if (item.archivedAt || String(item.statusCode) === CompetitionStatus.ARCHIVED) {
      return CompetitionStatus.ARCHIVED;
    }

    if (!this.isCompetitionPublished(item)) {
      return CompetitionStatus.DRAFT;
    }

    const registrationStartDate = item.registrationStartDate;
    const registrationEndDate = item.registrationEndDate;
    const eventStartDate = item.eventStartDate;
    const eventEndDate = item.eventEndDate;

    if (!registrationStartDate || !registrationEndDate || !eventStartDate || !eventEndDate) {
      return CompetitionStatus.DRAFT;
    }
    if (registrationStartDate > registrationEndDate || eventStartDate > eventEndDate || registrationEndDate > eventStartDate) {
      return CompetitionStatus.DRAFT;
    }

    const now = new Date();
    if (now < registrationStartDate) return CompetitionStatus.NOT_STARTED;
    if (now <= registrationEndDate) return CompetitionStatus.REGISTRATION_OPEN;
    if (now < eventStartDate) return CompetitionStatus.REGISTRATION_CLOSED;
    if (now <= eventEndDate) return CompetitionStatus.IN_PROGRESS;
    return CompetitionStatus.ENDED;
  }

  private assertCompetitionPublishable(record: {
    name: string;
    location: string | null;
    competitionLevel: string;
    involvedField: string | null;
    registrationStartDate: Date | null;
    registrationEndDate: Date | null;
    eventStartDate: Date | null;
    eventEndDate: Date | null;
  }) {
    if (!record.name?.trim()) throw new BadRequestException('赛事名称不能为空');
    if (!record.competitionLevel?.trim()) throw new BadRequestException('赛事级别不能为空');
    if (!record.location?.trim()) throw new BadRequestException('赛事地点不能为空');
    if (!record.involvedField?.trim()) throw new BadRequestException('涉及领域不能为空');

    const registrationStartDate = record.registrationStartDate;
    const registrationEndDate = record.registrationEndDate;
    const eventStartDate = record.eventStartDate;
    const eventEndDate = record.eventEndDate;

    if (!registrationStartDate || !registrationEndDate || !eventStartDate || !eventEndDate) {
      throw new BadRequestException('时间信息不完整，无法发布');
    }
    if (registrationStartDate > registrationEndDate) throw new BadRequestException('报名开始时间不能晚于报名截止时间');
    if (eventStartDate > eventEndDate) throw new BadRequestException('赛事开始时间不能晚于赛事结束时间');
    if (registrationEndDate > eventStartDate) throw new BadRequestException('报名截止时间不能晚于赛事开始时间');
  }

  private toObject(value: Prisma.JsonValue | null) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }
}

