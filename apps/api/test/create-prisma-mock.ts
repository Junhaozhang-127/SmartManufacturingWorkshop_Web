export function createPrismaMock() {
  return {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    sysFile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    sysFileLink: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    sysUser: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    sysNotification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    sysDictType: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    sysDictItem: {
      upsert: jest.fn(),
    },
    sysConfigItem: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    orgUnit: {
      findMany: jest.fn(),
    },
    memberProfile: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    wfApprovalTemplate: {
      findUnique: jest.fn(),
    },
    wfApprovalInstance: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    wfApprovalNodeLog: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    demoApprovalForm: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
}
