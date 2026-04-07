import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/modules/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/shared/http-exception.filter';
import { ResponseTransformInterceptor } from '../src/shared/response-transform.interceptor';
import { createPrismaMock } from './create-prisma-mock';

describe('App e2e', () => {
  let app: INestApplication;
  const prismaMock = createPrismaMock();

  beforeAll(async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ result: 1 }]);
    prismaMock.$transaction.mockImplementation(async (operations: unknown[]) => Promise.all(operations));
    prismaMock.memberProfile.findMany.mockResolvedValue([
      {
        id: 1n,
        positionCode: 'MEMBER',
        memberStatus: 'ACTIVE',
        joinDate: new Date('2026-03-10'),
        skillTags: 'Vue,NestJS',
        orgUnit: { unitName: '开发方向组' },
        mentor: { displayName: '王老师' },
        user: {
          displayName: '张成员',
          username: 'member01',
          userRoles: [{ role: { roleName: '成员' } }],
        },
      },
    ]);
    prismaMock.memberProfile.count.mockResolvedValue(1);
    prismaMock.sysUser.findUnique.mockResolvedValue({
      id: 1n,
      username: 'teacher01',
      passwordHash: '$2b$10$v1nRJG2ZWSIk4zR6K7mI7e1HTid3e8DqRLVQjaxAg/P6MqxsVXniS',
      displayName: '王老师',
      userRoles: [{ role: { roleCode: 'TEACHER', sortNo: 10, roleName: '老师' } }],
      member: null,
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseTransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.data.app.status).toBe('up');
  });

  it('/api/examples/members (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/api/examples/members');

    expect(response.status).toBe(200);
    expect(response.body.data.meta.total).toBe(1);
    expect(response.body.data.items[0].displayName).toBe('张成员');
  });
});
