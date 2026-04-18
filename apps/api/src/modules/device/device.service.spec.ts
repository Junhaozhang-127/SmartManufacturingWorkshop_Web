import { BadRequestException } from '@nestjs/common';
import {
  type CurrentUserProfile,
  DataScope,
  type DataScopeContext,
  DeviceRepairStatus,
  DeviceStatus,
} from '@smw/shared';

import type { ApprovalService } from '../approval/approval.service';
import type { AttachmentsService } from '../attachments/attachments.service';
import type { PrismaService } from '../prisma/prisma.service';
import { DeviceService } from './device.service';

describe('DeviceService', () => {
  const currentUser: CurrentUserProfile = {
    id: '5',
    username: 'member01',
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

  const dataScopeContext: DataScopeContext = {
    scope: DataScope.SELF_PARTICIPATE,
    userId: '5',
    orgUnitId: '30',
    departmentId: '20',
    departmentAndDescendantIds: ['20', '30'],
    groupId: '30',
    selfUserIds: ['5'],
    participatingUserIds: ['5'],
  };

  function createService(recordOverrides?: Partial<Record<string, unknown>>) {
    const repairRecord = {
      id: 10n,
      deviceId: 99n,
      repairNo: 'RP-001',
      applicantUserId: 5n,
      applicantRoleCode: 'MEMBER',
      handlerUserId: 8n,
      statusCode: DeviceRepairStatus.RESOLVED,
      severity: 'HIGH',
      faultDescription: '无法启动',
      handlerComment: '已更换电源模块',
      resolutionSummary: '更换电源后恢复',
      latestResult: '待报修人确认',
      requestedAmount: null,
      costEstimate: null,
      actualCost: null,
      fundLinkCode: null,
      deviceStatusBeforeRepair: DeviceStatus.IDLE,
      approvalInstanceId: 88n,
      attachments: null,
      statusLogs: [],
      reportedAt: new Date('2026-04-07T08:00:00Z'),
      approvedAt: new Date('2026-04-07T09:00:00Z'),
      acceptedAt: new Date('2026-04-07T09:10:00Z'),
      resolvedAt: new Date('2026-04-07T10:00:00Z'),
      confirmedAt: null,
      statusChangedAt: new Date('2026-04-07T10:00:00Z'),
      createdAt: new Date('2026-04-07T08:00:00Z'),
      updatedAt: new Date('2026-04-07T10:00:00Z'),
      createdBy: 5n,
      isDeleted: false,
      applicant: {
        id: 5n,
        displayName: '成员A',
      },
      handler: {
        id: 8n,
        displayName: '组长B',
      },
      device: {
        id: 99n,
        deviceCode: 'DEV-001',
        deviceName: '边缘相机',
        categoryName: '视觉设备',
        model: 'CAM-A1',
        statusCode: DeviceStatus.REPAIRING,
        responsibleUserId: 5n,
        locationLabel: 'A01',
        latestRepairId: 10n,
        orgUnitId: 30n,
        statusLogs: [],
        responsibleUser: {
          id: 5n,
          displayName: '成员A',
        },
        orgUnit: null,
      },
      ...recordOverrides,
    };

    const prisma = {
      assetDeviceRepair: {
        findUnique: jest.fn().mockImplementation(() => Promise.resolve(repairRecord)),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
          Object.assign(repairRecord, data);
          return Promise.resolve(repairRecord);
        }),
      },
      assetDevice: {
        findUnique: jest.fn().mockResolvedValue(repairRecord.device),
        update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
          Object.assign(repairRecord.device, data);
          return Promise.resolve(repairRecord.device);
        }),
      },
      sysUser: {
        findUnique: jest.fn().mockResolvedValue({
          id: 8n,
          isDeleted: false,
          statusCode: 'ACTIVE',
          displayName: '组长B',
        }),
      },
      $transaction: jest.fn().mockImplementation(async (input: unknown) => {
        if (typeof input === 'function') {
          return (input as (client: typeof prisma) => unknown)(prisma);
        }
        return Promise.all(input as Promise<unknown>[]);
      }),
    };

    const approvalService = {
      startBusinessApproval: jest.fn(),
    };

    const attachmentsService = {
      bindAttachmentsAsSystem: jest.fn(),
    };

    return {
      service: new DeviceService(
        prisma as unknown as PrismaService,
        approvalService as unknown as ApprovalService,
        attachmentsService as unknown as AttachmentsService,
      ),
      prisma,
      approvalService,
      repairRecord,
    };
  }

  it('confirms a resolved repair and restores device status', async () => {
    const { service, prisma } = createService();

    const result = await service.confirmRepair(currentUser, '10', { comment: '确认恢复正常' }, dataScopeContext);

    expect(prisma.assetDeviceRepair.update).toHaveBeenCalled();
    expect(prisma.assetDevice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statusCode: DeviceStatus.IDLE,
        }),
      }),
    );
    expect(result.statusCode).toBe(DeviceRepairStatus.CONFIRMED);
    expect(result.device.statusCode).toBe(DeviceStatus.IDLE);
  });

  it('blocks duplicate active repairs for the same device', async () => {
    const { service, prisma } = createService();
    prisma.assetDeviceRepair.findFirst.mockResolvedValueOnce({ id: 100n });

    await expect(
      service.createRepair(
        currentUser,
        {
          deviceId: '99',
          faultDescription: '重复报修校验',
          severity: 'HIGH',
        },
        dataScopeContext,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
