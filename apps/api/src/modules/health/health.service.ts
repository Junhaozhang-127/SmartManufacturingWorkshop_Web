import { PrismaService } from '@api/modules/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    let databaseStatus: 'up' | 'down' = 'up';
    let databaseMessage: string | null = 'Connected';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      databaseStatus = 'down';
      databaseMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    const exposeDetails = process.env.NODE_ENV !== 'production' && process.env.HEALTH_EXPOSE_DETAILS === 'true';
    if (!exposeDetails) {
      databaseMessage = databaseStatus === 'up' ? 'Connected' : 'Unavailable';
    }

    return {
      app: {
        status: 'up',
        name: process.env.APP_NAME ?? 'Smart Manufacturing Workshop Lab System',
        now: new Date().toISOString(),
      },
      dependencies: {
        database: {
          status: databaseStatus,
          message: databaseMessage,
        },
        redis: {
          configured: Boolean(process.env.REDIS_HOST),
        },
        minio: {
          configured: Boolean(process.env.MINIO_ENDPOINT),
        },
      },
    };
  }
}
