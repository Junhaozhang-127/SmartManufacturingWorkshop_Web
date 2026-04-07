import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns down when database check fails', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('db unavailable')),
    };

    const service = new HealthService(prisma as never);
    const result = await service.getHealth();

    expect(result.dependencies.database.status).toBe('down');
  });
});
