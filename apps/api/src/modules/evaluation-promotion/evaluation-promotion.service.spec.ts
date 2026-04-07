import { BadRequestException } from '@nestjs/common';
import {
  type CurrentUserProfile,
  DataScope,
  type DataScopeContext,
  PermissionCodes,
  PromotionApplicationStatus,
} from '@smw/shared';

import type { ApprovalService } from '../approval/approval.service';
import type { PrismaService } from '../prisma/prisma.service';
import { EvaluationPromotionService } from './evaluation-promotion.service';
import { PromotionQualificationService } from './promotion-qualification.service';

describe('EvaluationPromotionService', () => {
  const currentUser: CurrentUserProfile = {
    id: '4',
    username: 'minister01',
    displayName: '审批人',
    statusCode: 'ACTIVE',
    activeRole: {
      roleCode: 'MINISTER' as never,
      roleName: '部长',
      dataScope: DataScope.DEPT_PROJECT,
    },
    roleOptions: [],
    permissions: [PermissionCodes.promotionApprove],
    forcePasswordChange: false,
    orgProfile: {
      orgUnitId: '20',
      orgUnitName: '研发部',
      departmentId: '20',
      departmentName: '研发部',
      groupId: null,
      groupName: null,
      positionCode: 'MINISTER',
    },
    dataScopeContext: {
      scope: DataScope.DEPT_PROJECT,
      userId: '4',
      orgUnitId: '20',
      departmentId: '20',
      departmentAndDescendantIds: ['20', '30'],
      groupId: null,
      selfUserIds: ['4'],
      participatingUserIds: ['4'],
    },
    dashboard: {
      todoCount: 0,
      shortcutEntries: [],
    },
  };

  const dataScopeContext: DataScopeContext = {
    scope: DataScope.DEPT_PROJECT,
    userId: '4',
    orgUnitId: '20',
    departmentId: '20',
    departmentAndDescendantIds: ['20', '30'],
    groupId: null,
    selfUserIds: ['4'],
    participatingUserIds: ['4'],
  };

  function createService() {
    const prisma = {
      promApplication: {
        findFirst: jest.fn().mockResolvedValue({
          id: 31n,
          memberProfileId: 101n,
          applicantUserId: 5n,
          targetPositionCode: 'GROUP_LEADER',
          targetRoleCode: 'GROUP_LEADER',
          statusCode: PromotionApplicationStatus.PUBLIC_NOTICE,
          scheme: null,
          applicant: { displayName: '成员A' },
          memberProfile: {
            user: { userId: 5n, displayName: '成员A' },
            orgUnit: { unitName: '前端组' },
          },
          appointment: null,
        }),
      },
      $transaction: jest.fn(),
    };

    const approvalService = {
      startBusinessApproval: jest.fn(),
    };

    return new EvaluationPromotionService(
      prisma as unknown as PrismaService,
      approvalService as unknown as ApprovalService,
      new PromotionQualificationService(),
    );
  }

  it('blocks publishing when public notice end date is earlier than start date', async () => {
    const service = createService();

    await expect(
      service.publishPromotionResult(currentUser, '31', dataScopeContext, {
        publicNoticeStartDate: '2026-04-10',
        publicNoticeEndDate: '2026-04-01',
        appointmentPassed: true,
        publicNoticeResult: '日期校验',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
