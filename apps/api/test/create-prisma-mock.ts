export function createPrismaMock() {
  return {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    sysUser: {
      findUnique: jest.fn(),
    },
    memberProfile: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
}
