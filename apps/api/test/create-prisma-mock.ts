export function createPrismaMock() {
  return {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    sysUser: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
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
