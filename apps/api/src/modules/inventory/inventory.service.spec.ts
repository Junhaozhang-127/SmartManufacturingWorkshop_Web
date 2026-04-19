import { BadRequestException } from '@nestjs/common';
import {
  ConsumableInventoryStatus,
  ConsumableStatus,
  type CurrentUserProfile,
  DataScope,
  type DataScopeContext,
  InventoryTxnType,
} from '@smw/shared';

import type { ApprovalService } from '../approval/approval.service';
import type { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
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

  function createService() {
    const consumable = {
      id: 11n,
      consumableCode: 'CS-001',
      consumableName: '焊锡丝',
      categoryName: '电子耗材',
      specification: '0.8mm',
      unitName: '卷',
      statusCode: ConsumableStatus.ACTIVE,
      inventoryStatus: ConsumableInventoryStatus.NORMAL,
      currentStock: { toString: () => '6' },
      warningThreshold: { toString: () => '5' },
      warningFlag: false,
      orgUnitId: 30n,
      defaultLocation: null,
      replenishmentTriggeredAt: null,
      lastTxnAt: null,
      createdAt: new Date('2026-04-07T08:00:00Z'),
      updatedAt: new Date('2026-04-07T08:00:00Z'),
      createdBy: 5n,
      isDeleted: false,
      orgUnit: {
        id: 30n,
        unitName: '前端组',
      },
    };

    const prisma = {
      invConsumable: {
        findUnique: jest.fn().mockResolvedValue(consumable),
        update: jest.fn().mockResolvedValue(consumable),
      },
      invConsumableRequest: {
        create: jest.fn(),
      },
      invInventoryTxn: {
        create: jest.fn().mockResolvedValue({ id: 99n }),
      },
      $transaction: jest.fn().mockImplementation(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (client: typeof prisma) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    const approvalService = {
      startBusinessApproval: jest.fn(),
    };

    return {
      service: new InventoryService(prisma as unknown as PrismaService, approvalService as unknown as ApprovalService),
      prisma,
      approvalService,
      consumable,
    };
  }

  it('blocks request creation when quantity exceeds current stock', async () => {
    const { service } = createService();

    await expect(
      service.createRequest(
        currentUser,
        {
          consumableId: '11',
          quantity: 7,
          purpose: '超库存校验',
        },
        dataScopeContext,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates warning state after outbound transaction crosses threshold', async () => {
    const { service, prisma } = createService();

    await service.applyInventoryTxn(prisma as unknown as PrismaService, {
      consumableId: 11n,
      txnType: InventoryTxnType.OUTBOUND,
      quantity: 2,
      operatorUserId: 5n,
      operatorRoleCode: 'MEMBER',
      remark: '测试出库',
    });

    expect(prisma.invInventoryTxn.create).toHaveBeenCalled();
    expect(prisma.invConsumable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inventoryStatus: ConsumableInventoryStatus.LOW_STOCK,
          warningFlag: true,
        }),
      }),
    );
  });
});
