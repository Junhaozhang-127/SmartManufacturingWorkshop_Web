import { ApprovalService } from '@api/modules/approval/approval.service';
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
  ApprovalBusinessType,
  type CurrentUserProfile,
  type DataScopeContext,
  type EvalScoreListResult,
  type EvalScoreRecordDetail,
  EvaluationResultCode,
  MemberGrowthRecordType,
  PermissionCodes,
  type PromotionApplicationDetail,
  type PromotionApplicationListResult,
  PromotionApplicationStatus,
  type PromotionEligibilityItem,
} from '@smw/shared';

import type { ApprovalCommentDto } from '../approval/dto/approval-comment.dto';
import type { CreatePromotionApplicationDto } from './dto/create-promotion-application.dto';
import type { EvaluationQueryDto } from './dto/evaluation-query.dto';
import type { PromotionApplicationQueryDto } from './dto/promotion-application-query.dto';
import type { PromotionEligibilityQueryDto } from './dto/promotion-eligibility-query.dto';
import type { PublishPromotionResultDto } from './dto/publish-promotion-result.dto';
import type { UpdateManualScoreDto } from './dto/update-manual-score.dto';
import type { UpdatePromotionReviewDto } from './dto/update-promotion-review.dto';
import { PromotionQualificationService } from './promotion-qualification.service';

type ScopedMemberProfile = Prisma.MemberProfileGetPayload<{
  include: {
    user: true;
    orgUnit: true;
  };
}>;

type EvalRecord = Prisma.EvalScoreRecordGetPayload<{
  include: {
    scheme: true;
    evaluator: true;
    memberProfile: {
      include: {
        user: true;
        orgUnit: true;
      };
    };
  };
}>;

type PromotionRecord = Prisma.PromApplicationGetPayload<{
  include: {
    scheme: true;
    applicant: true;
    memberProfile: {
      include: {
        user: true;
        orgUnit: true;
      };
    };
    appointment: true;
  };
}>;

@Injectable()
export class EvaluationPromotionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
    private readonly qualificationService: PromotionQualificationService,
  ) {}

  async listSchemes() {
    const items = await this.prisma.evalScheme.findMany({
      orderBy: [{ endDate: 'desc' }, { id: 'desc' }],
    });

    return items.map((item) => this.mapScheme(item));
  }

  async listEvaluationScores(query: EvaluationQueryDto, dataScopeContext: DataScopeContext): Promise<EvalScoreListResult> {
    const scheme = await this.resolveScheme(query.schemeId);
    await this.ensureSchemeScores(scheme.id, dataScopeContext);

    const scopeWhere = buildMemberProfileWhere(dataScopeContext);
    const clauses: Prisma.EvalScoreRecordWhereInput[] = [{ schemeId: scheme.id }];

    if (query.resultCode) {
      clauses.push({ resultCode: query.resultCode });
    }
    if (query.keyword) {
      clauses.push({
        OR: [
          { memberProfile: { user: { displayName: { contains: query.keyword } } } },
          { memberProfile: { user: { username: { contains: query.keyword } } } },
          { memberProfile: { orgUnit: { unitName: { contains: query.keyword } } } },
        ],
      });
    }
    if (scopeWhere) {
      clauses.push({ memberProfile: scopeWhere });
    }

    const where = { AND: clauses } satisfies Prisma.EvalScoreRecordWhereInput;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.evalScoreRecord.findMany({
        where,
        include: {
          scheme: true,
          evaluator: true,
          memberProfile: {
            include: {
              user: true,
              orgUnit: true,
            },
          },
        },
        orderBy: [{ totalScore: 'desc' }, { updatedAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.evalScoreRecord.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapEvalRecord(item)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
      },
    };
  }

  async getEvaluationScoreDetail(recordId: string, dataScopeContext: DataScopeContext): Promise<EvalScoreRecordDetail> {
    const record = await this.prisma.evalScoreRecord.findFirst({
      where: {
        id: this.toBigInt(recordId),
        ...(buildMemberProfileWhere(dataScopeContext)
          ? {
              memberProfile: buildMemberProfileWhere(dataScopeContext),
            }
          : {}),
      },
      include: {
        scheme: true,
        evaluator: true,
        memberProfile: {
          include: {
            user: true,
            orgUnit: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Evaluation record not found');
    }

    return {
      ...this.mapEvalRecord(record),
      autoScoreDetail: this.toObject(record.autoScoreDetail),
      manualScoreDetail: this.toObject(record.manualScoreDetail),
      manualComment: record.manualComment,
    };
  }

  async refreshEvaluationScores(schemeId: string, dataScopeContext: DataScopeContext) {
    const scheme = await this.resolveScheme(schemeId);
    const count = await this.ensureSchemeScores(scheme.id, dataScopeContext, true);

    return {
      scheme: this.mapScheme(scheme),
      refreshedCount: count,
    };
  }

  async updateManualScore(
    currentUser: CurrentUserProfile,
    recordId: string,
    dataScopeContext: DataScopeContext,
    payload: UpdateManualScoreDto,
  ) {
    const record = await this.prisma.evalScoreRecord.findFirst({
      where: {
        id: this.toBigInt(recordId),
        ...(buildMemberProfileWhere(dataScopeContext)
          ? {
              memberProfile: buildMemberProfileWhere(dataScopeContext),
            }
          : {}),
      },
      include: {
        scheme: true,
        memberProfile: {
          include: {
            user: true,
            orgUnit: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Evaluation record not found');
    }

    const totalScore = this.roundScore(Number(record.autoScore) + payload.manualScore);
    const updated = await this.prisma.evalScoreRecord.update({
      where: { id: record.id },
      data: {
        evaluatorUserId: this.toBigInt(currentUser.id),
        manualScore: new Prisma.Decimal(payload.manualScore),
        totalScore: new Prisma.Decimal(totalScore),
        manualComment: payload.manualComment?.trim() || null,
        manualScoreDetail: {
          comment: payload.manualComment?.trim() || null,
          updatedBy: currentUser.displayName,
          updatedAt: new Date().toISOString(),
        },
        resultCode: this.resolveResultCode(totalScore),
        latestResult: `Auto ${Number(record.autoScore).toFixed(2)} + manual ${payload.manualScore.toFixed(2)}`,
        evaluatedAt: new Date(),
      },
      include: {
        scheme: true,
        evaluator: true,
        memberProfile: {
          include: {
            user: true,
            orgUnit: true,
          },
        },
      },
    });

    return {
      ...this.mapEvalRecord(updated),
      autoScoreDetail: this.toObject(updated.autoScoreDetail),
      manualScoreDetail: this.toObject(updated.manualScoreDetail),
      manualComment: updated.manualComment,
    };
  }

  async listPromotionEligibility(
    query: PromotionEligibilityQueryDto,
    dataScopeContext: DataScopeContext,
  ) {
    const scheme = await this.resolveScheme(query.schemeId);
    await this.ensureSchemeScores(scheme.id, dataScopeContext);

    const profiles = await this.loadScopedProfiles(dataScopeContext, query.keyword);
    const items: PromotionEligibilityItem[] = [];

    for (const profile of profiles) {
      const scoreRecord = await this.prisma.evalScoreRecord.findUnique({
        where: {
          schemeId_memberProfileId: {
            schemeId: scheme.id,
            memberProfileId: profile.id,
          },
        },
      });

      const targetPositionCode =
        query.targetPositionCode || this.qualificationService.deriveTargetPositionCode(profile.positionCode);
      const qualification = await this.buildQualificationSnapshot(profile, scheme.id, targetPositionCode, scoreRecord);
      const latestApplication = await this.prisma.promApplication.findFirst({
        where: { memberProfileId: profile.id },
        orderBy: { createdAt: 'desc' },
      });

      const item: PromotionEligibilityItem = {
        memberProfileId: String(profile.id),
        userId: String(profile.userId),
        displayName: profile.user.displayName,
        orgUnitName: profile.orgUnit.unitName,
        currentPositionCode: profile.positionCode,
        targetPositionCode,
        schemeId: String(scheme.id),
        schemeName: scheme.schemeName,
        latestEvaluationTotalScore: scoreRecord ? Number(scoreRecord.totalScore) : null,
        latestEvaluationResult: scoreRecord?.resultCode ?? null,
        achievementCount: qualification.metrics.achievementCount,
        projectCount: qualification.metrics.projectCount,
        qualified: qualification.qualified,
        reasons: qualification.reasons,
        latestPromotionStatus: latestApplication?.statusCode ?? null,
      };

      if (query.qualified === undefined || query.qualified === item.qualified) {
        items.push(item);
      }
    }

    const start = (query.page - 1) * query.pageSize;
    const paged = items.slice(start, start + query.pageSize);

    return {
      items: paged,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total: items.length,
      },
      scheme: this.mapScheme(scheme),
    };
  }

  async listPromotionApplications(
    query: PromotionApplicationQueryDto,
    dataScopeContext: DataScopeContext,
  ): Promise<PromotionApplicationListResult> {
    const scopeWhere = buildMemberProfileWhere(dataScopeContext);
    const clauses: Prisma.PromApplicationWhereInput[] = [];

    if (query.schemeId) {
      clauses.push({ schemeId: this.toBigInt(query.schemeId) });
    }
    if (query.statusCode) {
      clauses.push({ statusCode: query.statusCode });
    }
    if (query.targetPositionCode) {
      clauses.push({ targetPositionCode: query.targetPositionCode });
    }
    if (query.keyword) {
      clauses.push({
        OR: [
          { applicationNo: { contains: query.keyword } },
          { memberProfile: { user: { displayName: { contains: query.keyword } } } },
          { memberProfile: { orgUnit: { unitName: { contains: query.keyword } } } },
        ],
      });
    }
    if (scopeWhere) {
      clauses.push({ memberProfile: scopeWhere });
    }

    const where = clauses.length ? ({ AND: clauses } satisfies Prisma.PromApplicationWhereInput) : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.promApplication.findMany({
        where,
        include: {
          scheme: true,
          applicant: true,
          memberProfile: {
            include: {
              user: true,
              orgUnit: true,
            },
          },
          appointment: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.promApplication.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapPromotionRecord(item)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
      },
    };
  }

  async getPromotionApplicationDetail(
    applicationId: string,
    dataScopeContext: DataScopeContext,
  ): Promise<PromotionApplicationDetail> {
    const record = await this.loadScopedPromotionApplication(applicationId, dataScopeContext);

    return {
      ...this.mapPromotionRecord(record),
      qualificationSnapshot: this.toObject(record.qualificationSnapshot),
      appointment: record.appointment ? this.mapAppointment(record.appointment) : null,
    };
  }

  async createPromotionApplication(
    currentUser: CurrentUserProfile,
    dataScopeContext: DataScopeContext,
    payload: CreatePromotionApplicationDto,
  ) {
    const profile = await this.loadScopedProfile(payload.memberProfileId, dataScopeContext);

    if (
      currentUser.id !== String(profile.userId) &&
      !currentUser.permissions.includes(PermissionCodes.promotionUpdate)
    ) {
      throw new ForbiddenException('Only the member or an authorized reviewer can submit a promotion request');
    }

    const scheme = await this.resolveScheme(payload.schemeId);
    await this.ensureSchemeScores(scheme.id, dataScopeContext);

    const scoreRecord = await this.prisma.evalScoreRecord.findUnique({
      where: {
        schemeId_memberProfileId: {
          schemeId: scheme.id,
          memberProfileId: profile.id,
        },
      },
    });

    const targetPositionCode =
      payload.targetPositionCode || this.qualificationService.deriveTargetPositionCode(profile.positionCode);
    const qualification = await this.buildQualificationSnapshot(profile, scheme.id, targetPositionCode, scoreRecord);

    if (!qualification.qualified) {
      throw new BadRequestException(qualification.reasons.join('；'));
    }

    const exists = await this.prisma.promApplication.findFirst({
      where: {
        memberProfileId: profile.id,
        statusCode: {
          in: [PromotionApplicationStatus.IN_APPROVAL, PromotionApplicationStatus.PUBLIC_NOTICE],
        },
      },
    });

    if (exists) {
      throw new BadRequestException('A promotion request is already in progress');
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.promApplication.create({
        data: {
          applicationNo: this.buildPromotionNo(),
          memberProfileId: profile.id,
          applicantUserId: profile.userId,
          schemeId: scheme.id,
          targetPositionCode,
          targetRoleCode: payload.targetRoleCode?.trim() || qualification.rule.targetRoleCode,
          statusCode: PromotionApplicationStatus.IN_APPROVAL,
          qualificationPassed: true,
          qualificationSnapshot: qualification.snapshot as Prisma.InputJsonValue,
          submittedAt: new Date(),
          latestResult: 'Promotion request submitted',
        },
      });

      const approval = await this.approvalService.startBusinessApproval(tx, {
        businessType: ApprovalBusinessType.PROMOTION_REQUEST,
        businessId: String(created.id),
        title: `${profile.user.displayName} promotion request`,
        applicantUserId: profile.userId,
        applicantRoleCode: currentUser.activeRole.roleCode,
        formData: {
          applicationNo: created.applicationNo,
          memberProfileId: String(profile.id),
          displayName: profile.user.displayName,
          orgUnitName: profile.orgUnit.unitName,
          currentPositionCode: profile.positionCode,
          targetPositionCode,
          targetRoleCode: payload.targetRoleCode?.trim() || qualification.rule.targetRoleCode,
          schemeName: scheme.schemeName,
          qualification: qualification.snapshot,
        },
      });

      await tx.promApplication.update({
        where: { id: created.id },
        data: {
          approvalInstanceId: approval.id,
        },
      });

      await tx.memberGrowthRecord.create({
        data: {
          memberProfileId: profile.id,
          recordType: MemberGrowthRecordType.ROLE_UPDATED,
          title: 'Promotion request submitted',
          content: `${profile.positionCode} -> ${targetPositionCode}`,
          recordDate: new Date(),
          actorUserId: profile.userId,
        },
      });

      await tx.memberOperationLog.create({
        data: {
          memberProfileId: profile.id,
          actionType: 'PROMOTION_APPLIED',
          fromStatus: profile.positionCode,
          toStatus: targetPositionCode,
          description: 'Promotion request submitted and entered approval flow',
          operatorUserId: this.toBigInt(currentUser.id),
        },
      });

      return this.getPromotionApplicationDetail(String(created.id), dataScopeContext);
    });
  }

  async updatePromotionReview(
    currentUser: CurrentUserProfile,
    applicationId: string,
    dataScopeContext: DataScopeContext,
    payload: UpdatePromotionReviewDto,
  ) {
    if (!currentUser.permissions.includes(PermissionCodes.promotionApprove)) {
      throw new ForbiddenException('Promotion review permission required');
    }

    const record = await this.loadScopedPromotionApplication(applicationId, dataScopeContext);
    await this.prisma.promApplication.update({
      where: { id: record.id },
      data: {
        teamEvaluation: payload.teamEvaluation?.trim() || undefined,
        departmentReview: payload.departmentReview?.trim() || undefined,
      },
    });

    return this.getPromotionApplicationDetail(applicationId, dataScopeContext);
  }

  async publishPromotionResult(
    currentUser: CurrentUserProfile,
    applicationId: string,
    dataScopeContext: DataScopeContext,
    payload: PublishPromotionResultDto,
  ) {
    if (!currentUser.permissions.includes(PermissionCodes.promotionApprove)) {
      throw new ForbiddenException('Promotion publish permission required');
    }

    const record = await this.loadScopedPromotionApplication(applicationId, dataScopeContext);
    if (record.statusCode !== PromotionApplicationStatus.PUBLIC_NOTICE) {
      throw new BadRequestException('Only approved promotion requests can enter public notice publishing');
    }

    const publicNoticeStartDate = new Date(payload.publicNoticeStartDate);
    const publicNoticeEndDate = new Date(payload.publicNoticeEndDate);

    if (publicNoticeEndDate < publicNoticeStartDate) {
      throw new BadRequestException('Public notice end date cannot be earlier than the start date');
    }

    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.promAppointment.upsert({
        where: { applicationId: record.id },
        update: {
          targetPositionCode: record.targetPositionCode,
          targetRoleCode: record.targetRoleCode,
          appointmentStatus: payload.appointmentPassed ? 'APPOINTED' : 'NOT_APPOINTED',
          publicNoticeStatus: 'PUBLISHED',
          publicNoticeStartDate,
          publicNoticeEndDate,
          publicNoticeResult: payload.publicNoticeResult?.trim() || null,
          appointedAt: payload.appointmentPassed ? new Date() : null,
          latestResult: payload.appointmentPassed ? 'Promotion public notice passed' : 'Promotion public notice failed',
        },
        create: {
          applicationId: record.id,
          memberProfileId: record.memberProfileId,
          applicantUserId: record.applicantUserId,
          targetPositionCode: record.targetPositionCode,
          targetRoleCode: record.targetRoleCode,
          appointmentStatus: payload.appointmentPassed ? 'APPOINTED' : 'NOT_APPOINTED',
          publicNoticeStatus: 'PUBLISHED',
          publicNoticeStartDate,
          publicNoticeEndDate,
          publicNoticeResult: payload.publicNoticeResult?.trim() || null,
          appointedAt: payload.appointmentPassed ? new Date() : null,
          latestResult: payload.appointmentPassed ? 'Promotion public notice passed' : 'Promotion public notice failed',
        },
      });

      await tx.promApplication.update({
        where: { id: record.id },
        data: {
          statusCode: payload.appointmentPassed
            ? PromotionApplicationStatus.APPOINTED
            : PromotionApplicationStatus.NOT_APPOINTED,
          publicNoticeResult: payload.publicNoticeResult?.trim() || null,
          latestResult: appointment.latestResult,
          completedAt: new Date(),
        },
      });

      if (payload.appointmentPassed) {
        await tx.memberProfile.update({
          where: { id: record.memberProfileId },
          data: {
            positionCode: record.targetPositionCode,
          },
        });

        if (record.targetRoleCode) {
          const role = await tx.sysRole.findUnique({
            where: { roleCode: record.targetRoleCode },
          });

          if (role) {
            await tx.sysUserRole.upsert({
              where: {
                userId_roleId: {
                  userId: record.applicantUserId,
                  roleId: role.id,
                },
              },
              update: {},
              create: {
                userId: record.applicantUserId,
                roleId: role.id,
              },
            });
          }
        }

        await tx.memberGrowthRecord.create({
          data: {
            memberProfileId: record.memberProfileId,
            recordType: MemberGrowthRecordType.ROLE_UPDATED,
            title: 'Promotion appointment completed',
            content: `${record.memberProfile.positionCode} -> ${record.targetPositionCode}`,
            recordDate: new Date(),
            actorUserId: this.toBigInt(currentUser.id),
          },
        });
      }

      await tx.memberOperationLog.create({
        data: {
          memberProfileId: record.memberProfileId,
          actionType: payload.appointmentPassed ? 'PROMOTION_APPOINTED' : 'PROMOTION_NOTICE_FAILED',
          fromStatus: record.memberProfile.positionCode,
          toStatus: payload.appointmentPassed ? record.targetPositionCode : record.memberProfile.positionCode,
          description: appointment.latestResult ?? 'Promotion notice completed',
          operatorUserId: this.toBigInt(currentUser.id),
        },
      });

      return this.getPromotionApplicationDetail(applicationId, dataScopeContext);
    });
  }

  async approvePromotion(
    currentUser: CurrentUserProfile,
    applicationId: string,
    dataScopeContext: DataScopeContext,
    payload: ApprovalCommentDto,
  ) {
    const record = await this.loadScopedPromotionApplication(applicationId, dataScopeContext);
    if (!record.approvalInstanceId) {
      throw new BadRequestException('This promotion request is not linked to approval center');
    }
    return this.approvalService.approve(currentUser, String(record.approvalInstanceId), payload);
  }

  async rejectPromotion(
    currentUser: CurrentUserProfile,
    applicationId: string,
    dataScopeContext: DataScopeContext,
    payload: ApprovalCommentDto,
  ) {
    const record = await this.loadScopedPromotionApplication(applicationId, dataScopeContext);
    if (!record.approvalInstanceId) {
      throw new BadRequestException('This promotion request is not linked to approval center');
    }
    return this.approvalService.reject(currentUser, String(record.approvalInstanceId), payload);
  }

  async withdrawPromotion(
    currentUser: CurrentUserProfile,
    applicationId: string,
    dataScopeContext: DataScopeContext,
    payload: ApprovalCommentDto,
  ) {
    const record = await this.loadScopedPromotionApplication(applicationId, dataScopeContext);
    if (!record.approvalInstanceId) {
      throw new BadRequestException('This promotion request is not linked to approval center');
    }
    return this.approvalService.withdraw(currentUser, String(record.approvalInstanceId), payload);
  }

  async buildMemberPromotionSnapshot(memberProfileId: bigint) {
    const latestEvaluation = await this.prisma.evalScoreRecord.findFirst({
      where: { memberProfileId },
      include: {
        scheme: true,
      },
      orderBy: [{ scheme: { endDate: 'desc' } }, { updatedAt: 'desc' }],
    });

    const promotionRecords = await this.prisma.promApplication.findMany({
      where: { memberProfileId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    return {
      latestEvaluation: latestEvaluation
        ? {
            id: String(latestEvaluation.id),
            schemeId: String(latestEvaluation.schemeId),
            schemeName: latestEvaluation.scheme.schemeName,
            periodKey: latestEvaluation.scheme.periodKey,
            autoScore: Number(latestEvaluation.autoScore),
            manualScore: Number(latestEvaluation.manualScore),
            totalScore: Number(latestEvaluation.totalScore),
            resultCode: latestEvaluation.resultCode,
            updatedAt: latestEvaluation.updatedAt.toISOString(),
          }
        : null,
      promotionRecords: promotionRecords.map((item) => ({
        id: String(item.id),
        applicationNo: item.applicationNo,
        targetPositionCode: item.targetPositionCode,
        statusCode: item.statusCode,
        qualificationPassed: item.qualificationPassed,
        latestResult: item.latestResult,
        publicNoticeResult: item.publicNoticeResult,
        approvalInstanceId: item.approvalInstanceId ? String(item.approvalInstanceId) : null,
        submittedAt: item.submittedAt?.toISOString() ?? null,
        completedAt: item.completedAt?.toISOString() ?? null,
      })),
    };
  }

  async buildMemberProjectAndRewardSnapshot(memberProfileId: bigint, userId: bigint) {
    const projectMap = await this.collectProjectExperience(userId);
    const rewards = await this.prisma.govRewardPenalty.findMany({
      where: { memberProfileId },
      orderBy: { occurredAt: 'desc' },
      take: 10,
    });

    return {
      projectExperiences: [...projectMap.values()].map((item) => ({
        projectKey: item.projectKey,
        projectName: item.projectName,
        sourceTypes: [...item.sourceTypes],
        lastActivityDate: item.lastActivityDate,
      })),
      rewardsAndPenalties: rewards.map((item) => ({
        id: String(item.id),
        eventType: item.eventType,
        title: item.title,
        levelCode: item.levelCode,
        scoreImpact: Number(item.scoreImpact),
        occurredAt: item.occurredAt.toISOString().slice(0, 10),
        description: item.description,
      })),
    };
  }

  private async ensureSchemeScores(schemeId: bigint, dataScopeContext: DataScopeContext, force = false) {
    const profiles = await this.loadScopedProfiles(dataScopeContext);

    for (const profile of profiles) {
      const existing = await this.prisma.evalScoreRecord.findUnique({
        where: {
          schemeId_memberProfileId: {
            schemeId,
            memberProfileId: profile.id,
          },
        },
      });

      if (existing && !force) {
        continue;
      }

      const autoMetrics = await this.collectAutoMetrics(profile, schemeId);
      const manualScore = existing ? Number(existing.manualScore) : 0;
      const totalScore = this.roundScore(autoMetrics.autoScore + manualScore);

      await this.prisma.evalScoreRecord.upsert({
        where: {
          schemeId_memberProfileId: {
            schemeId,
            memberProfileId: profile.id,
          },
        },
        update: {
          achievementCount: autoMetrics.achievementCount,
          projectCount: autoMetrics.projectCount,
          rewardPenaltyCount: autoMetrics.rewardPenaltyCount,
          autoScore: new Prisma.Decimal(autoMetrics.autoScore),
          totalScore: new Prisma.Decimal(totalScore),
          autoScoreDetail: autoMetrics.detail as Prisma.InputJsonValue,
          resultCode: this.resolveResultCode(totalScore),
          latestResult: autoMetrics.summary,
          evaluatedAt: new Date(),
        },
        create: {
          schemeId,
          memberProfileId: profile.id,
          achievementCount: autoMetrics.achievementCount,
          projectCount: autoMetrics.projectCount,
          rewardPenaltyCount: autoMetrics.rewardPenaltyCount,
          autoScore: new Prisma.Decimal(autoMetrics.autoScore),
          manualScore: new Prisma.Decimal(manualScore),
          totalScore: new Prisma.Decimal(totalScore),
          autoScoreDetail: autoMetrics.detail as Prisma.InputJsonValue,
          manualScoreDetail: existing?.manualScoreDetail as Prisma.InputJsonValue | undefined,
          manualComment: existing?.manualComment ?? null,
          evaluatorUserId: existing?.evaluatorUserId ?? null,
          resultCode: this.resolveResultCode(totalScore),
          latestResult: autoMetrics.summary,
          evaluatedAt: new Date(),
        },
      });
    }

    return profiles.length;
  }

  private async collectAutoMetrics(profile: ScopedMemberProfile, schemeId: bigint) {
    const scheme = await this.prisma.evalScheme.findUnique({
      where: { id: schemeId },
    });

    if (!scheme) {
      throw new NotFoundException('Evaluation scheme not found');
    }

    const achievements = await this.prisma.achvAchievement.findMany({
      where: {
        isDeleted: false,
        statusCode: AchievementStatus.RECOGNIZED,
        AND: [
          {
            OR: [{ applicantUserId: profile.userId }, { contributors: { some: { userId: profile.userId } } }],
          },
          {
            OR: [
              { recognizedAt: { gte: this.startOfDay(scheme.startDate), lte: this.endOfDay(scheme.endDate) } },
              { submittedAt: { gte: this.startOfDay(scheme.startDate), lte: this.endOfDay(scheme.endDate) } },
            ],
          },
        ],
      },
      include: {
        contributors: {
          orderBy: { contributionRank: 'asc' },
        },
      },
    });

    const rewardItems = await this.prisma.govRewardPenalty.findMany({
      where: {
        memberProfileId: profile.id,
        occurredAt: {
          gte: this.startOfDay(scheme.startDate),
          lte: this.endOfDay(scheme.endDate),
        },
      },
      orderBy: { occurredAt: 'desc' },
    });

    const projectMap = await this.collectProjectExperience(
      profile.userId,
      this.startOfDay(scheme.startDate),
      this.endOfDay(scheme.endDate),
    );

    const achievementDetails = achievements.map((item) => {
      const contributor = item.contributors.find((contrib) => contrib.userId === profile.userId) ?? null;
      const baseScore = this.resolveAchievementBaseScore(item.recognizedGrade, item.levelCode);
      const factor = contributor ? this.resolveContributionFactor(contributor.contributionRank) : 1;
      const score = this.roundScore(baseScore * factor);

      return {
        id: String(item.id),
        title: item.title,
        recognizedGrade: item.recognizedGrade,
        contributionRank: contributor?.contributionRank ?? 1,
        score,
      };
    });

    const achievementScore = this.roundScore(achievementDetails.reduce((sum, item) => sum + item.score, 0));
    const projectScore = Math.min(projectMap.size * 10, 20);
    const rewardScore = this.roundScore(rewardItems.reduce((sum, item) => sum + Number(item.scoreImpact), 0));
    const autoScore = this.roundScore(achievementScore + projectScore + rewardScore);

    return {
      achievementCount: achievements.length,
      projectCount: projectMap.size,
      rewardPenaltyCount: rewardItems.length,
      autoScore,
      summary: `Auto summary: achievements ${achievementScore.toFixed(2)}, projects ${projectScore.toFixed(2)}, rewards ${rewardScore.toFixed(2)}`,
      detail: {
        achievementScore,
        projectScore,
        rewardPenaltyScore: rewardScore,
        achievements: achievementDetails,
        projects: [...projectMap.values()].map((item) => ({
          projectKey: item.projectKey,
          projectName: item.projectName,
          sourceTypes: [...item.sourceTypes],
          lastActivityDate: item.lastActivityDate,
        })),
        rewardsAndPenalties: rewardItems.map((item) => ({
          id: String(item.id),
          eventType: item.eventType,
          title: item.title,
          scoreImpact: Number(item.scoreImpact),
        })),
      },
    };
  }

  private async buildQualificationSnapshot(
    profile: ScopedMemberProfile,
    schemeId: bigint,
    targetPositionCode: string,
    scoreRecord: {
      totalScore: Prisma.Decimal;
      resultCode: string;
    } | null,
  ) {
    const autoMetrics = await this.collectAutoMetrics(profile, schemeId);
    const rule = this.qualificationService.getRule(profile.positionCode, targetPositionCode);
    const totalScore = scoreRecord ? Number(scoreRecord.totalScore) : 0;
    const reasons: string[] = [];

    if (!scoreRecord) {
      reasons.push('Missing evaluation score for current period');
    } else if (totalScore < rule.minimumTotalScore) {
      reasons.push(`Total score must be at least ${rule.minimumTotalScore}`);
    }
    if (scoreRecord && !rule.minimumResultCodes.includes(scoreRecord.resultCode)) {
      reasons.push(`Evaluation result must be one of ${rule.minimumResultCodes.join(', ')}`);
    }
    if (autoMetrics.achievementCount < rule.minimumAchievementCount) {
      reasons.push(`At least ${rule.minimumAchievementCount} recognized achievements are required`);
    }
    if (autoMetrics.projectCount < rule.minimumProjectCount) {
      reasons.push(`At least ${rule.minimumProjectCount} project experiences are required`);
    }

    const grades = (
      (autoMetrics.detail as { achievements: Array<{ recognizedGrade?: string | null }> }).achievements ?? []
    )
      .map((item) => item.recognizedGrade)
      .filter(Boolean) as string[];

    if (
      rule.minimumAchievementGrades.length &&
      !grades.some((grade) => rule.minimumAchievementGrades.includes(grade))
    ) {
      reasons.push(`Achievement grade must include one of ${rule.minimumAchievementGrades.join(', ')}`);
    }

    return {
      qualified: reasons.length === 0,
      reasons,
      metrics: {
        achievementCount: autoMetrics.achievementCount,
        projectCount: autoMetrics.projectCount,
      },
      rule,
      snapshot: {
        currentPositionCode: profile.positionCode,
        targetPositionCode,
        totalScore,
        resultCode: scoreRecord?.resultCode ?? null,
        achievementCount: autoMetrics.achievementCount,
        projectCount: autoMetrics.projectCount,
        reasons,
        qualified: reasons.length === 0,
        rule,
      },
    };
  }

  private async loadScopedProfiles(dataScopeContext: DataScopeContext, keyword?: string) {
    const scopeWhere = buildMemberProfileWhere(dataScopeContext);
    const clauses: Prisma.MemberProfileWhereInput[] = [{ isDeleted: false }];

    if (scopeWhere) {
      clauses.push(scopeWhere);
    }
    if (keyword) {
      clauses.push({
        OR: [
          { user: { displayName: { contains: keyword } } },
          { user: { username: { contains: keyword } } },
          { orgUnit: { unitName: { contains: keyword } } },
        ],
      });
    }

    return this.prisma.memberProfile.findMany({
      where: { AND: clauses },
      include: {
        user: true,
        orgUnit: true,
      },
      orderBy: [{ orgUnitId: 'asc' }, { userId: 'asc' }],
    });
  }

  private async loadScopedProfile(memberProfileId: string, dataScopeContext: DataScopeContext) {
    const record = await this.prisma.memberProfile.findFirst({
      where: {
        id: this.toBigInt(memberProfileId),
        isDeleted: false,
        ...(buildMemberProfileWhere(dataScopeContext) ?? {}),
      },
      include: {
        user: true,
        orgUnit: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Member profile not found');
    }

    return record;
  }

  private async loadScopedPromotionApplication(applicationId: string, dataScopeContext: DataScopeContext) {
    const record = await this.prisma.promApplication.findFirst({
      where: {
        id: this.toBigInt(applicationId),
        ...(buildMemberProfileWhere(dataScopeContext)
          ? {
              memberProfile: buildMemberProfileWhere(dataScopeContext),
            }
          : {}),
      },
      include: {
        scheme: true,
        applicant: true,
        memberProfile: {
          include: {
            user: true,
            orgUnit: true,
          },
        },
        appointment: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Promotion application not found');
    }

    return record;
  }

  private async resolveScheme(schemeId?: string) {
    const scheme = schemeId
      ? await this.prisma.evalScheme.findUnique({
          where: { id: this.toBigInt(schemeId) },
        })
      : await this.prisma.evalScheme.findFirst({
          orderBy: [{ endDate: 'desc' }, { id: 'desc' }],
        });

    if (!scheme) {
      throw new NotFoundException('Evaluation scheme not found');
    }

    return scheme;
  }

  private async collectProjectExperience(userId: bigint, startDate?: Date, endDate?: Date) {
    const map = new Map<
      string,
      {
        projectKey: string;
        projectName: string;
        sourceTypes: Set<string>;
        lastActivityDate: string | null;
      }
    >();

    const periodWhere = startDate || endDate
      ? {
          OR: [
            { submittedAt: { gte: startDate, lte: endDate } },
            { completedAt: { gte: startDate, lte: endDate } },
          ],
        }
      : {};

    const achievements = await this.prisma.achvAchievement.findMany({
      where: {
        isDeleted: false,
        OR: [{ applicantUserId: userId }, { contributors: { some: { userId } } }],
        ...(startDate || endDate
          ? {
              OR: [
                { recognizedAt: { gte: startDate, lte: endDate } },
                { submittedAt: { gte: startDate, lte: endDate } },
              ],
            }
          : {}),
      },
      select: {
        projectId: true,
        projectName: true,
        recognizedAt: true,
        submittedAt: true,
      },
    });

    const teams = await this.prisma.compTeam.findMany({
      where: {
        isDeleted: false,
        OR: [{ teamLeaderUserId: userId }, { advisorUserId: userId }, { memberUserIds: { contains: `,${userId},` } }],
        ...periodWhere,
      },
      select: {
        projectId: true,
        projectName: true,
        submittedAt: true,
        completedAt: true,
      },
    });

    const fundApplications = await this.prisma.fundApplication.findMany({
      where: {
        applicantUserId: userId,
        ...periodWhere,
      },
      select: {
        projectId: true,
        projectName: true,
        submittedAt: true,
        completedAt: true,
      },
    });

    for (const item of achievements) {
      this.appendProjectExperience(map, item.projectId, item.projectName, 'ACHIEVEMENT', item.recognizedAt ?? item.submittedAt);
    }
    for (const item of teams) {
      this.appendProjectExperience(map, item.projectId, item.projectName, 'COMPETITION_TEAM', item.completedAt ?? item.submittedAt);
    }
    for (const item of fundApplications) {
      this.appendProjectExperience(map, item.projectId, item.projectName, 'FUND_APPLICATION', item.completedAt ?? item.submittedAt);
    }

    return map;
  }

  private appendProjectExperience(
    map: Map<string, { projectKey: string; projectName: string; sourceTypes: Set<string>; lastActivityDate: string | null }>,
    projectId: string | null,
    projectName: string | null,
    sourceType: string,
    activityDate: Date | null,
  ) {
    const key = projectId || projectName;
    if (!key) {
      return;
    }

    const existing = map.get(key) ?? {
      projectKey: key,
      projectName: projectName || projectId || key,
      sourceTypes: new Set<string>(),
      lastActivityDate: null,
    };

    existing.sourceTypes.add(sourceType);
    if (activityDate) {
      const value = activityDate.toISOString().slice(0, 10);
      if (!existing.lastActivityDate || value > existing.lastActivityDate) {
        existing.lastActivityDate = value;
      }
    }
    map.set(key, existing);
  }

  private mapScheme(item: {
    id: bigint;
    schemeCode: string;
    schemeName: string;
    periodKey: string;
    startDate: Date;
    endDate: Date;
    statusCode: string;
  }) {
    return {
      id: String(item.id),
      schemeCode: item.schemeCode,
      schemeName: item.schemeName,
      periodKey: item.periodKey,
      startDate: item.startDate.toISOString().slice(0, 10),
      endDate: item.endDate.toISOString().slice(0, 10),
      statusCode: item.statusCode,
    };
  }

  private mapEvalRecord(item: EvalRecord) {
    return {
      id: String(item.id),
      schemeId: String(item.schemeId),
      schemeName: item.scheme.schemeName,
      periodKey: item.scheme.periodKey,
      memberProfileId: String(item.memberProfileId),
      userId: String(item.memberProfile.userId),
      displayName: item.memberProfile.user.displayName,
      orgUnitName: item.memberProfile.orgUnit.unitName,
      positionCode: item.memberProfile.positionCode,
      achievementCount: item.achievementCount,
      projectCount: item.projectCount,
      rewardPenaltyCount: item.rewardPenaltyCount,
      autoScore: Number(item.autoScore),
      manualScore: Number(item.manualScore),
      totalScore: Number(item.totalScore),
      resultCode: item.resultCode,
      latestResult: item.latestResult,
      evaluatorName: item.evaluator?.displayName ?? null,
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private mapPromotionRecord(item: PromotionRecord) {
    return {
      id: String(item.id),
      applicationNo: item.applicationNo,
      memberProfileId: String(item.memberProfileId),
      userId: String(item.memberProfile.userId),
      displayName: item.memberProfile.user.displayName,
      orgUnitName: item.memberProfile.orgUnit.unitName,
      currentPositionCode: item.memberProfile.positionCode,
      targetPositionCode: item.targetPositionCode,
      targetRoleCode: item.targetRoleCode,
      schemeId: item.schemeId ? String(item.schemeId) : null,
      schemeName: item.scheme?.schemeName ?? null,
      qualificationPassed: item.qualificationPassed,
      statusCode: item.statusCode,
      latestResult: item.latestResult,
      teamEvaluation: item.teamEvaluation,
      departmentReview: item.departmentReview,
      publicNoticeResult: item.publicNoticeResult,
      approvalInstanceId: item.approvalInstanceId ? String(item.approvalInstanceId) : null,
      submittedAt: item.submittedAt?.toISOString() ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    };
  }

  private mapAppointment(item: {
    id: bigint;
    appointmentStatus: string;
    publicNoticeStatus: string;
    publicNoticeStartDate: Date | null;
    publicNoticeEndDate: Date | null;
    publicNoticeResult: string | null;
    appointedAt: Date | null;
    latestResult: string | null;
  }) {
    return {
      id: String(item.id),
      appointmentStatus: item.appointmentStatus,
      publicNoticeStatus: item.publicNoticeStatus,
      publicNoticeStartDate: item.publicNoticeStartDate?.toISOString().slice(0, 10) ?? null,
      publicNoticeEndDate: item.publicNoticeEndDate?.toISOString().slice(0, 10) ?? null,
      publicNoticeResult: item.publicNoticeResult,
      appointedAt: item.appointedAt?.toISOString() ?? null,
      latestResult: item.latestResult,
    };
  }

  private resolveAchievementBaseScore(recognizedGrade: string | null, levelCode: string | null) {
    const gradeMap: Record<string, number> = {
      A: 35,
      B: 25,
      C: 15,
      NATIONAL: 30,
      PROVINCIAL: 20,
      CITY: 12,
      SCHOOL: 8,
      INTERNATIONAL: 40,
    };

    if (recognizedGrade && gradeMap[recognizedGrade]) {
      return gradeMap[recognizedGrade];
    }
    if (levelCode && gradeMap[levelCode]) {
      return gradeMap[levelCode];
    }

    return 10;
  }

  private resolveContributionFactor(rank: number) {
    if (rank <= 1) return 1;
    if (rank <= 3) return 0.7;
    return 0.4;
  }

  private resolveResultCode(totalScore: number) {
    if (totalScore >= 90) return EvaluationResultCode.EXCELLENT;
    if (totalScore >= 80) return EvaluationResultCode.GOOD;
    if (totalScore >= 60) return EvaluationResultCode.PASS;
    return EvaluationResultCode.FAIL;
  }

  private buildPromotionNo() {
    const now = new Date();
    const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    return `PROM-${stamp}`;
  }

  private startOfDay(value: Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private endOfDay(value: Date) {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  private roundScore(value: number) {
    return Number(value.toFixed(2));
  }

  private toObject(value: Prisma.JsonValue | null) {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  }

  private toBigInt(value: string) {
    return BigInt(value);
  }
}
