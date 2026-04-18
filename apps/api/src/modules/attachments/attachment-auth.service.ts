import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { type CurrentUserProfile,DataScope, PermissionCodes, RoleCode } from '@smw/shared';

import { PrismaService } from '../prisma/prisma.service';

type BusinessContext = { businessType: string; businessId: string };

@Injectable()
export class AttachmentAuthService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(value: string) {
    return BigInt(value);
  }

  private isUserWithinDataScope(currentUser: CurrentUserProfile, targetUserId: string, targetOrgUnitId: bigint | null) {
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

  assertCanViewTempFile(currentUser: CurrentUserProfile, file: { uploadedBy: bigint; isTemporary: boolean }) {
    if (!file.isTemporary) {
      throw new BadRequestException('文件已绑定业务，不能按临时文件访问');
    }
    if (String(file.uploadedBy) !== currentUser.id) {
      throw new ForbiddenException('无权访问该临时文件');
    }
  }

  async assertCanViewBusiness(currentUser: CurrentUserProfile, context: BusinessContext) {
    const ok = await this.canViewBusiness(currentUser, context);
    if (!ok) {
      throw new ForbiddenException('无权访问该业务附件');
    }
  }

  async assertCanEditBusinessAttachments(currentUser: CurrentUserProfile, context: BusinessContext) {
    const ok = await this.canEditBusinessAttachments(currentUser, context);
    if (!ok) {
      throw new ForbiddenException('无权维护该业务附件');
    }
  }

  private async canViewBusiness(currentUser: CurrentUserProfile, context: BusinessContext) {
    if (await this.canViewBusinessByType(currentUser, context)) return true;
    return this.canViewByApprovalFallback(currentUser, context);
  }

  private async canEditBusinessAttachments(currentUser: CurrentUserProfile, context: BusinessContext) {
    return this.canEditBusinessAttachmentsByType(currentUser, context);
  }

  private async canViewBusinessByType(currentUser: CurrentUserProfile, context: BusinessContext) {
    switch (context.businessType) {
      case 'CREATION_CONTENT':
        return this.canViewCreationContent(currentUser, context.businessId);
      case 'KNOWLEDGE_CONTENT':
        return this.canViewKnowledgeContent(context.businessId);
      case 'ANNOUNCEMENT':
        return this.canViewAnnouncement(currentUser, context.businessId);
      case 'FUND_PROJECT':
        return this.canViewFundProject(currentUser, context.businessId);
      case 'FUND_REQUEST':
        return this.canViewFundApplication(currentUser, context.businessId);
      case 'ACHIEVEMENT_RECOGNITION':
        return this.canViewAchievement(currentUser, context.businessId);
      case 'REPAIR_ORDER':
        return this.canViewRepairOrder(currentUser, context.businessId);
      default:
        return false;
    }
  }

  private async canEditBusinessAttachmentsByType(currentUser: CurrentUserProfile, context: BusinessContext) {
    switch (context.businessType) {
      case 'CREATION_CONTENT':
        return this.canEditCreationContentAttachments(currentUser, context.businessId);
      case 'ANNOUNCEMENT':
        return this.canEditAnnouncement(currentUser, context.businessId);
      case 'FUND_PROJECT':
        return this.canEditFundProject(currentUser);
      case 'ACHIEVEMENT_RECOGNITION':
        return this.canEditAchievementAttachments(currentUser, context.businessId);
      case 'FUND_REQUEST':
        return false;
      default:
        return false;
    }
  }

  private async canViewCreationContent(currentUser: CurrentUserProfile, businessId: string) {
    const record = await this.prisma.creationContent.findFirst({
      where: { id: this.toBigInt(businessId), isDeleted: false },
      select: {
        authorUserId: true,
        reviewerUserId: true,
      },
    });
    if (!record) throw new NotFoundException('创作内容不存在');

    if (String(record.authorUserId) === currentUser.id) return true;
    if ([RoleCode.TEACHER, RoleCode.MINISTER].includes(currentUser.activeRole.roleCode)) return true;
    if (record.reviewerUserId && String(record.reviewerUserId) === currentUser.id) return true;
    return false;
  }

  private async canEditCreationContentAttachments(currentUser: CurrentUserProfile, businessId: string) {
    const record = await this.prisma.creationContent.findFirst({
      where: { id: this.toBigInt(businessId), isDeleted: false },
      select: { authorUserId: true, statusCode: true },
    });
    if (!record) throw new NotFoundException('创作内容不存在');
    const status = String(record.statusCode);
    if (!['DRAFT', 'REJECTED'].includes(status)) return false;
    return String(record.authorUserId) === currentUser.id;
  }

  private async canViewKnowledgeContent(businessId: string) {
    const record = await this.prisma.creationContent.findFirst({
      where: {
        id: this.toBigInt(businessId),
        isDeleted: false,
        statusCode: 'APPROVED',
        inKnowledgeBase: true,
      },
      select: { id: true },
    });
    if (!record) {
      throw new NotFoundException('智库内容不存在');
    }
    return true;
  }

  private async canViewAnnouncement(currentUser: CurrentUserProfile, batchId: string) {
    const record = await this.prisma.sysNotification.findFirst({
      where: {
        isDeleted: false,
        businessType: 'ANNOUNCEMENT',
        businessId: batchId,
        userId: this.toBigInt(currentUser.id),
      },
      select: { id: true },
    });
    return Boolean(record);
  }

  private async canEditAnnouncement(currentUser: CurrentUserProfile, batchId: string) {
    if (![RoleCode.TEACHER, RoleCode.MINISTER].includes(currentUser.activeRole.roleCode)) return false;
    const record = await this.prisma.sysNotification.findFirst({
      where: {
        isDeleted: false,
        businessType: 'ANNOUNCEMENT',
        businessId: batchId,
        createdBy: this.toBigInt(currentUser.id),
      },
      select: { id: true },
    });
    return Boolean(record);
  }

  private async canViewFundProject(currentUser: CurrentUserProfile, projectId: string) {
    if ([RoleCode.TEACHER, RoleCode.MINISTER].includes(currentUser.activeRole.roleCode)) {
      const exists = await this.prisma.fundAccount.findFirst({
        where: { isDeleted: false, projectId },
        select: { id: true },
      });
      return Boolean(exists);
    }

    const context = currentUser.dataScopeContext;
    const userId = this.toBigInt(currentUser.id);

    const accountOr: Prisma.FundAccountWhereInput[] = [{ managerUserId: userId }, { createdBy: userId }];

    if (context.scope === DataScope.DEPT_PROJECT && context.departmentAndDescendantIds.length) {
      accountOr.push({
        ownerOrgUnitId: { in: context.departmentAndDescendantIds.map((id) => this.toBigInt(id)) },
      });
    }

    if (context.scope === DataScope.GROUP_PROJECT && context.groupId) {
      accountOr.push({ ownerOrgUnitId: this.toBigInt(context.groupId) });
    }

    const accountWhere: Prisma.FundAccountWhereInput = {
      isDeleted: false,
      projectId,
      OR: accountOr,
    };

    const hasAccount = await this.prisma.fundAccount.findFirst({ where: accountWhere, select: { id: true } });
    if (hasAccount) return true;

    const applicationOr: Prisma.FundApplicationWhereInput[] = [{ applicantUserId: userId }];

    if (context.scope === DataScope.DEPT_PROJECT && context.departmentAndDescendantIds.length) {
      applicationOr.push({
        account: { ownerOrgUnitId: { in: context.departmentAndDescendantIds.map((id) => this.toBigInt(id)) } },
      });
    }

    if (context.scope === DataScope.GROUP_PROJECT && context.groupId) {
      applicationOr.push({
        account: { ownerOrgUnitId: this.toBigInt(context.groupId) },
      });
    }

    const applicationWhere: Prisma.FundApplicationWhereInput = {
      projectId,
      OR: applicationOr,
    };

    const hasApplication = await this.prisma.fundApplication.findFirst({
      where: applicationWhere,
      select: { id: true },
    });
    return Boolean(hasApplication);
  }

  private canEditFundProject(currentUser: CurrentUserProfile) {
    return [RoleCode.TEACHER, RoleCode.MINISTER].includes(currentUser.activeRole.roleCode);
  }

  private async canViewFundApplication(currentUser: CurrentUserProfile, applicationId: string) {
    const record = await this.prisma.fundApplication.findFirst({
      where: { id: this.toBigInt(applicationId) },
      include: {
        account: { select: { ownerOrgUnitId: true, managerUserId: true, createdBy: true } },
      },
    });
    if (!record) throw new NotFoundException('经费申请不存在');

    if (String(record.applicantUserId) === currentUser.id) return true;
    const scope = currentUser.dataScopeContext;

    if (scope.scope === DataScope.ALL) return true;
    if (record.account.managerUserId && String(record.account.managerUserId) === currentUser.id) return true;
    if (record.account.createdBy && String(record.account.createdBy) === currentUser.id) return true;

    if (
      scope.scope === DataScope.DEPT_PROJECT &&
      record.account.ownerOrgUnitId &&
      scope.departmentAndDescendantIds.includes(String(record.account.ownerOrgUnitId))
    ) {
      return true;
    }

    if (scope.scope === DataScope.GROUP_PROJECT && record.account.ownerOrgUnitId && scope.groupId) {
      if (String(record.account.ownerOrgUnitId) === scope.groupId) return true;
    }

    return false;
  }

  private async canViewAchievement(currentUser: CurrentUserProfile, achievementId: string) {
    const record = await this.prisma.achvAchievement.findFirst({
      where: { id: this.toBigInt(achievementId), isDeleted: false },
      select: {
        id: true,
        applicantUserId: true,
        createdBy: true,
        approvalInstanceId: true,
      },
    });
    if (!record) throw new NotFoundException('成果不存在');

    if (String(record.applicantUserId) === currentUser.id) return true;
    if (record.createdBy && String(record.createdBy) === currentUser.id) return true;
    if ([RoleCode.TEACHER, RoleCode.MINISTER].includes(currentUser.activeRole.roleCode)) return true;

    const isContributor = await this.prisma.achvContributor.findFirst({
      where: {
        achievementId: record.id,
        userId: this.toBigInt(currentUser.id),
      },
      select: { id: true },
    });
    if (isContributor) return true;

    return false;
  }

  private async canEditAchievementAttachments(currentUser: CurrentUserProfile, achievementId: string) {
    const record = await this.prisma.achvAchievement.findFirst({
      where: { id: this.toBigInt(achievementId), isDeleted: false },
      select: { applicantUserId: true, statusCode: true },
    });
    if (!record) throw new NotFoundException('成果不存在');
    if (String(record.statusCode) !== 'DRAFT') return false;
    return String(record.applicantUserId) === currentUser.id || currentUser.permissions.includes(PermissionCodes.achievementUpdate);
  }

  private async canViewRepairOrder(currentUser: CurrentUserProfile, repairId: string) {
    const record = await this.prisma.assetDeviceRepair.findFirst({
      where: { id: this.toBigInt(repairId), isDeleted: false },
      select: {
        applicantUserId: true,
        handlerUserId: true,
        device: {
          select: {
            orgUnitId: true,
            responsibleUserId: true,
          },
        },
      },
    });

    if (!record) throw new NotFoundException('维修工单不存在');

    const context = currentUser.dataScopeContext;
    if (context.scope === DataScope.ALL) return true;

    const currentUserId = this.toBigInt(currentUser.id);
    if (record.applicantUserId === currentUserId) return true;
    if (record.handlerUserId && record.handlerUserId === currentUserId) return true;
    if (record.device.responsibleUserId && record.device.responsibleUserId === currentUserId) return true;

    if (context.scope === DataScope.DEPT_PROJECT && record.device.orgUnitId) {
      return context.departmentAndDescendantIds.includes(String(record.device.orgUnitId));
    }

    if (context.scope === DataScope.GROUP_PROJECT && record.device.orgUnitId && context.groupId) {
      return String(record.device.orgUnitId) === context.groupId;
    }

    return false;
  }

  private async canViewByApprovalFallback(currentUser: CurrentUserProfile, context: BusinessContext) {
    const instance = await this.prisma.wfApprovalInstance.findFirst({
      where: { businessType: context.businessType, businessId: context.businessId },
      select: {
        id: true,
        status: true,
        applicantUserId: true,
        currentApproverRoleCode: true,
        currentApproverUserId: true,
        applicant: {
          select: {
            member: { select: { orgUnitId: true } },
          },
        },
      },
    });

    if (!instance) {
      return false;
    }

    const handledLog = await this.prisma.wfApprovalNodeLog.findFirst({
      where: { instanceId: instance.id, actorUserId: this.toBigInt(currentUser.id) },
      select: { id: true },
    });

    const isApplicant = String(instance.applicantUserId) === currentUser.id;
    const hasHandled = Boolean(handledLog);
    const canHandle = this.canHandleApprovalInstance(currentUser, instance);

    return isApplicant || hasHandled || canHandle;
  }

  private canHandleApprovalInstance(
    currentUser: CurrentUserProfile,
    instance: {
      status: string;
      applicantUserId: bigint;
      currentApproverRoleCode: string | null;
      currentApproverUserId: bigint | null;
      applicant: { member: { orgUnitId: bigint | null } | null } | null;
    },
  ) {
    if (instance.status !== 'PENDING') {
      return false;
    }

    const applicantOrgUnitId = instance.applicant?.member?.orgUnitId ?? null;
    if (!this.isUserWithinDataScope(currentUser, String(instance.applicantUserId), applicantOrgUnitId)) {
      return false;
    }

    if (instance.currentApproverUserId) {
      return String(instance.currentApproverUserId) === currentUser.id;
    }

    if (!instance.currentApproverRoleCode) {
      return false;
    }

    return instance.currentApproverRoleCode === currentUser.activeRole.roleCode;
  }
}

