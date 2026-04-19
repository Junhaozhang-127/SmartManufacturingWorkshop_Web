import { BadRequestException } from '@nestjs/common';
import { type CurrentUserProfile,DataScope } from '@smw/shared';

import type { ApprovalService } from '../approval/approval.service';
import type { AttachmentsService } from '../attachments/attachments.service';
import type { PrismaService } from '../prisma/prisma.service';
import { AchievementRecognitionService } from './achievement-recognition.service';
import { CompetitionAchievementService } from './competition-achievement.service';

describe('CompetitionAchievementService', () => {
  const currentUser: CurrentUserProfile = {
    id: '5',
    username: 'user',
    displayName: '成员A',
    statusCode: 'ACTIVE',
    activeRole: {
      roleCode: 'MEMBER' as never,
      roleName: '成员',
      dataScope: DataScope.SELF_PARTICIPATE,
    },
    roleOptions: [],
    permissions: [],
    forcePasswordChange: false,
    orgProfile: {
      orgUnitId: '30',
      orgUnitName: '前端组',
      departmentId: '20',
      departmentName: '研发部',
      groupId: '30',
      groupName: '前端组',
      positionCode: 'MEMBER',
    },
    dataScopeContext: {
      scope: DataScope.SELF_PARTICIPATE,
      userId: '5',
      orgUnitId: '30',
      departmentId: '20',
      departmentAndDescendantIds: ['20', '30'],
      groupId: '30',
      selfUserIds: ['5'],
      participatingUserIds: ['5'],
    },
    dashboard: {
      todoCount: 0,
      shortcutEntries: [],
    },
  };

  function createService() {
    const prisma = {
      compCompetition: {
        findUnique: jest.fn().mockResolvedValue({
          id: 11n,
          isDeleted: false,
        }),
      },
      sysUser: {
        findMany: jest.fn().mockResolvedValue([
          { id: 5n, displayName: '成员A' },
          { id: 8n, displayName: '导师B' },
        ]),
      },
      compTeam: {
        findFirst: jest.fn().mockResolvedValue({ id: 21n }),
      },
      $transaction: jest.fn(),
    };

    const approvalService = {
      startBusinessApproval: jest.fn(),
    };

    const attachmentsService = {
      bindAttachmentsAsSystem: jest.fn(),
    };

    return new CompetitionAchievementService(
      prisma as unknown as PrismaService,
      approvalService as unknown as ApprovalService,
      new AchievementRecognitionService(),
      attachmentsService as unknown as AttachmentsService,
    );
  }

  it('blocks duplicate active team registrations within the same competition', async () => {
    const service = createService();

    await expect(
      service.registerCompetitionTeam(currentUser, '11', {
        teamName: 'Alpha Team',
        teamLeaderUserId: '5',
        advisorUserId: '8',
        members: [{ userId: '5' }],
        applicationReason: '重复提交流程保护',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
