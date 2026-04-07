import { PrismaService } from '@api/modules/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    let databaseStatus: 'up' | 'down' = 'up';
    let databaseMessage = 'Connected';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      databaseStatus = 'down';
      databaseMessage = error instanceof Error ? error.message : 'Unknown error';
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
          host: process.env.REDIS_HOST ?? null,
        },
        minio: {
          configured: Boolean(process.env.MINIO_ENDPOINT),
          endpoint: process.env.MINIO_ENDPOINT ?? null,
          bucket: process.env.MINIO_BUCKET ?? null,
        },
      },
    };
  }
}
