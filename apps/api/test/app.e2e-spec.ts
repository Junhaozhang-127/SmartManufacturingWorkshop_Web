import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';

import { AppModule } from '../src/modules/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/shared/http-exception.filter';
import { ResponseTransformInterceptor } from '../src/shared/response-transform.interceptor';
import { createPrismaMock } from './create-prisma-mock';

process.env.NODE_ENV = process.env.NODE_ENV?.trim() ? process.env.NODE_ENV : 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL?.trim()
  ? process.env.DATABASE_URL
  : 'mysql://test:test@127.0.0.1:3306/test';
process.env.AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET?.trim()
  ? process.env.AUTH_TOKEN_SECRET
  : 'test-auth-token-secret-32-chars-minimum';

type MockUser = {
  id: bigint;
  username: string;
  passwordHash: string;
  displayName: string;
  statusCode: string;
  forcePasswordChange: boolean;
  isDeleted: boolean;
  userRoles: Array<{
    role: {
      roleCode: string;
      roleName: string;
      dataScope: string;
      sortNo: number;
    };
  }>;
  member: null | {
    positionCode: string;
    orgUnit: {
      id: bigint;
      unitName: string;
      unitType: string;
      parent: null | {
        id: bigint;
        unitName: string;
        unitType: string;
      };
    };
  };
};

type MockMember = {
  id: bigint;
  userId: bigint;
  orgUnitId: bigint;
  positionCode: string;
  memberStatus: string;
  joinDate: Date;
  skillTags: string;
  createdAt: Date;
  orgUnit: {
    unitName: string;
  };
  mentor: {
    displayName: string;
  };
  user: {
    displayName: string;
    username: string;
    userRoles: Array<{
      role: {
        roleName: string;
      };
    }>;
  };
};

type MemberWhere = {
  AND?: MemberWhere[];
  OR?: MemberWhere[];
  userId?: bigint | { in: bigint[] };
  orgUnitId?: bigint | { in: bigint[] };
  memberStatus?: string;
  user?: {
    displayName?: { contains: string };
    username?: { contains: string };
  };
  orgUnit?: {
    unitName?: { contains: string };
  };
};

describe('App e2e', () => {
  let app: INestApplication;
  const prismaMock = createPrismaMock();
  const testPassword: string = randomUUID();
  const passwordHash = bcrypt.hashSync(testPassword, 10);

  const attachmentFixture = {
    fileId: '9001',
    storageKey: 'attachments/e2e/hello.txt',
    originalName: 'hello.txt',
    content: 'hello-e2e',
    uploaderUserId: 4n,
  } as const;

  const attachmentFixtureDir = resolve(process.cwd(), 'storage', 'uploads', 'attachments', 'e2e');
  const attachmentFixturePath = resolve(process.cwd(), 'storage', 'uploads', attachmentFixture.storageKey);

  const units = [
    { id: 10n, parentId: null, unitName: '智能制造实验室' },
    { id: 20n, parentId: 10n, unitName: '研发部' },
    { id: 30n, parentId: 20n, unitName: '前端组' },
  ];

  const users: Record<string, MockUser> = {
    teacher: {
      id: 1n,
      username: `user_${randomUUID().slice(0, 8)}`,
      passwordHash,
      displayName: '王老师',
      statusCode: 'ACTIVE',
      forcePasswordChange: false,
      isDeleted: false,
      userRoles: [{ role: { roleCode: 'TEACHER', roleName: '老师', dataScope: 'ALL', sortNo: 10 } }],
      member: null,
    },
    hybrid: {
      id: 2n,
      username: `user_${randomUUID().slice(0, 8)}`,
      passwordHash,
      displayName: '钱双角色',
      statusCode: 'ACTIVE',
      forcePasswordChange: false,
      isDeleted: false,
      userRoles: [
        { role: { roleCode: 'MINISTER', roleName: '部长', dataScope: 'DEPT_PROJECT', sortNo: 30 } },
        { role: { roleCode: 'GROUP_LEADER', roleName: '组长', dataScope: 'GROUP_PROJECT', sortNo: 40 } },
      ],
      member: {
        positionCode: 'GROUP_LEADER',
        orgUnit: {
          id: 30n,
          unitName: '前端组',
          unitType: 'GROUP',
          parent: {
            id: 20n,
            unitName: '研发部',
            unitType: 'DEPARTMENT',
          },
        },
      },
    },
    minister: {
      id: 3n,
      username: `user_${randomUUID().slice(0, 8)}`,
      passwordHash,
      displayName: '周部长',
      statusCode: 'ACTIVE',
      forcePasswordChange: false,
      isDeleted: false,
      userRoles: [{ role: { roleCode: 'MINISTER', roleName: '部长', dataScope: 'DEPT_PROJECT', sortNo: 30 } }],
      member: {
        positionCode: 'MINISTER',
        orgUnit: {
          id: 20n,
          unitName: '研发部',
          unitType: 'DEPARTMENT',
          parent: {
            id: 10n,
            unitName: '智能制造实验室',
            unitType: 'LAB',
          },
        },
      },
    },
    member: {
      id: 4n,
      username: `user_${randomUUID().slice(0, 8)}`,
      passwordHash,
      displayName: '张成员',
      statusCode: 'ACTIVE',
      forcePasswordChange: false,
      isDeleted: false,
      userRoles: [{ role: { roleCode: 'MEMBER', roleName: '成员', dataScope: 'SELF_PARTICIPATE', sortNo: 50 } }],
      member: {
        positionCode: 'MEMBER',
        orgUnit: {
          id: 30n,
          unitName: '前端组',
          unitType: 'GROUP',
          parent: {
            id: 20n,
            unitName: '研发部',
            unitType: 'DEPARTMENT',
          },
        },
      },
    },
  };

  const members: MockMember[] = [
    {
      id: 100n,
      userId: 3n,
      orgUnitId: 20n,
      positionCode: 'MINISTER',
      memberStatus: 'ACTIVE',
      joinDate: new Date('2026-03-01'),
      skillTags: 'Management,Review',
      createdAt: new Date('2026-03-01T08:00:00Z'),
      orgUnit: { unitName: '研发部' },
      mentor: { displayName: '王老师' },
      user: {
        displayName: '周部长',
        username: users.minister.username,
        userRoles: [{ role: { roleName: '部长' } }],
      },
    },
    {
      id: 101n,
      userId: 2n,
      orgUnitId: 30n,
      positionCode: 'GROUP_LEADER',
      memberStatus: 'ACTIVE',
      joinDate: new Date('2026-03-05'),
      skillTags: 'Vue,Architecture',
      createdAt: new Date('2026-03-05T08:00:00Z'),
      orgUnit: { unitName: '前端组' },
      mentor: { displayName: '周部长' },
      user: {
        displayName: '钱双角色',
        username: users.hybrid.username,
        userRoles: [{ role: { roleName: '部长' } }, { role: { roleName: '组长' } }],
      },
    },
    {
      id: 102n,
      userId: 4n,
      orgUnitId: 30n,
      positionCode: 'MEMBER',
      memberStatus: 'ACTIVE',
      joinDate: new Date('2026-03-10'),
      skillTags: 'Vue,NestJS,Prisma',
      createdAt: new Date('2026-03-10T08:00:00Z'),
      orgUnit: { unitName: '前端组' },
      mentor: { displayName: '钱双角色' },
      user: {
        displayName: '张成员',
        username: users.member.username,
        userRoles: [{ role: { roleName: '成员' } }],
      },
    },
  ];

  function getUserByWhere(where: { username?: string; id?: bigint }) {
    if (where.username) {
      return Object.values(users).find((user) => user.username === where.username) ?? null;
    }

    if (where.id) {
      return Object.values(users).find((user) => user.id === where.id) ?? null;
    }

    return null;
  }

  function matchesContains(value: string, query: string) {
    return value.toLowerCase().includes(query.toLowerCase());
  }

  function matchesMemberWhere(member: MockMember, where?: MemberWhere): boolean {
    if (!where) {
      return true;
    }

    if (where.AND) {
      return where.AND.every((item) => matchesMemberWhere(member, item));
    }

    if (where.OR) {
      return where.OR.some((item) => matchesMemberWhere(member, item));
    }

    if (where.userId) {
      if (typeof where.userId === 'object' && 'in' in where.userId) {
        return where.userId.in.some((value) => value === member.userId);
      }

      return where.userId === member.userId;
    }

    if (where.orgUnitId) {
      if (typeof where.orgUnitId === 'object' && 'in' in where.orgUnitId) {
        return where.orgUnitId.in.some((value) => value === member.orgUnitId);
      }

      return where.orgUnitId === member.orgUnitId;
    }

    if (where.memberStatus) {
      return where.memberStatus === member.memberStatus;
    }

    if (where.user?.displayName?.contains) {
      return matchesContains(member.user.displayName, where.user.displayName.contains);
    }

    if (where.user?.username?.contains) {
      return matchesContains(member.user.username, where.user.username.contains);
    }

    if (where.orgUnit?.unitName?.contains) {
      return matchesContains(member.orgUnit.unitName, where.orgUnit.unitName.contains);
    }

    return true;
  }

  beforeAll(async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ result: 1 }]);
    prismaMock.$transaction.mockImplementation((operations: unknown[]) => Promise.all(operations));
    prismaMock.sysUser.findUnique.mockImplementation(({ where }: { where: { username?: string; id?: bigint } }) =>
      Promise.resolve(getUserByWhere(where)),
    );
    prismaMock.sysUser.update.mockImplementation(
      ({ where, data }: { where: { id: bigint }; data: Record<string, unknown> }) => {
        const user = getUserByWhere({ id: where.id });

        if (!user) {
          return Promise.resolve(null);
        }

        Object.assign(user, data);
        return Promise.resolve(user);
      },
    );
    prismaMock.orgUnit.findMany.mockResolvedValue(
      units.map((unit) => ({
        id: unit.id,
        parentId: unit.parentId,
        statusCode: 'ACTIVE',
        isDeleted: false,
      })),
    );
    prismaMock.memberProfile.findMany.mockImplementation(({ where }: { where?: MemberWhere }) =>
      Promise.resolve(members.filter((item) => matchesMemberWhere(item, where))),
    );
    prismaMock.memberProfile.count.mockImplementation(({ where }: { where?: MemberWhere }) =>
      Promise.resolve(members.filter((item) => matchesMemberWhere(item, where)).length),
    );

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

    await mkdir(dirname(attachmentFixturePath), { recursive: true });
    await writeFile(attachmentFixturePath, attachmentFixture.content, 'utf8');
  });

  afterAll(async () => {
    try {
      await app.close();
    } finally {
      await rm(attachmentFixtureDir, { recursive: true, force: true });
    }
  });

  async function loginAs(username: string, password = testPassword) {
    return request(app.getHttpServer()).post('/api/auth/login').send({
      username,
      password,
    });
  }

  it('/api/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.data.app.status).toBe('up');
  });

  it('logs in successfully with username and password', async () => {
    const response = await loginAs(users.teacher.username);

    expect(response.status).toBe(201);
    expect(response.body.data.token).toContain('.');
    expect(response.body.data.user.activeRole.roleCode).toBe('TEACHER');
  });

  it('fails login with wrong password', async () => {
    const response = await loginAs(users.teacher.username, 'bad-password');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('账号或密码错误');
  });

  it('blocks first-login users from protected business endpoints before password change', async () => {
    users.member.forcePasswordChange = true;

    const loginResponse = await loginAs(users.member.username);
    const response = await request(app.getHttpServer())
      .get('/api/members')
      .set('Authorization', `Bearer ${loginResponse.body.data.token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('首次登录需先修改密码');

    users.member.forcePasswordChange = false;
  });

  it('returns self-scoped member data for member role', async () => {
    const loginResponse = await loginAs(users.member.username);
    const response = await request(app.getHttpServer())
      .get('/api/members')
      .set('Authorization', `Bearer ${loginResponse.body.data.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.meta.total).toBe(1);
  });

  it('returns different data after switching role for a multi-role user', async () => {
    const loginResponse = await loginAs(users.hybrid.username);
    const ministerToken = loginResponse.body.data.token as string;

    const ministerListResponse = await request(app.getHttpServer())
      .get('/api/members')
      .set('Authorization', `Bearer ${ministerToken}`);

    expect(ministerListResponse.status).toBe(200);
    expect(ministerListResponse.body.data.meta.total).toBe(3);

    const switchRoleResponse = await request(app.getHttpServer())
      .post('/api/auth/switch-role')
      .set('Authorization', `Bearer ${ministerToken}`)
      .send({ roleCode: 'GROUP_LEADER' });

    expect(switchRoleResponse.status).toBe(201);
    expect(switchRoleResponse.body.data.user.activeRole.roleCode).toBe('GROUP_LEADER');

    const groupToken = switchRoleResponse.body.data.token as string;
    const groupListResponse = await request(app.getHttpServer())
      .get('/api/members')
      .set('Authorization', `Bearer ${groupToken}`);

    expect(groupListResponse.status).toBe(200);
    expect(groupListResponse.body.data.meta.total).toBe(2);
  });

  it('accepts memberStatus query alias for member list filtering', async () => {
    const loginResponse = await loginAs(users.hybrid.username);
    const response = await request(app.getHttpServer())
      .get('/api/members')
      .query({ memberStatus: 'ACTIVE' })
      .set('Authorization', `Bearer ${loginResponse.body.data.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.meta.total).toBe(3);
  });

  it('enforces attachment authorization for linked business (PROFILE_AVATAR)', async () => {
    const parseBodyAsBuffer = (
      res: NodeJS.ReadableStream,
      callback: (err: Error | null, body?: Buffer) => void,
    ) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    };

    prismaMock.sysFile.findUnique.mockImplementation(({ where }: { where: { id: bigint } }) => {
      if (where?.id !== BigInt(attachmentFixture.fileId)) return Promise.resolve(null);
      return Promise.resolve({
        id: BigInt(attachmentFixture.fileId),
        storageKey: attachmentFixture.storageKey,
        originalName: attachmentFixture.originalName,
        uploadedBy: attachmentFixture.uploaderUserId,
        isTemporary: false,
        fileExt: 'txt',
        mimeType: 'text/plain',
      });
    });

    prismaMock.sysFileLink.findMany.mockResolvedValue([{ businessType: 'PROFILE_AVATAR', businessId: '4' }]);

    const memberLogin = await loginAs(users.member.username);
    const okDownload = await request(app.getHttpServer())
      .get(`/api/attachments/${attachmentFixture.fileId}/download`)
      .set('Authorization', `Bearer ${memberLogin.body.data.token}`)
      .buffer(true)
      .parse(parseBodyAsBuffer);

    expect(okDownload.status).toBe(200);
    expect(okDownload.headers['content-disposition']).toContain('attachment');
    expect(Buffer.isBuffer(okDownload.body)).toBe(true);
    expect((okDownload.body as Buffer).toString('utf8')).toBe(attachmentFixture.content);

    const okPreview = await request(app.getHttpServer())
      .get(`/api/attachments/${attachmentFixture.fileId}/preview`)
      .set('Authorization', `Bearer ${memberLogin.body.data.token}`)
      .buffer(true)
      .parse(parseBodyAsBuffer);

    expect(okPreview.status).toBe(200);
    expect(okPreview.headers['content-type']).toContain('text/plain');
    expect((okPreview.body as Buffer).toString('utf8')).toBe(attachmentFixture.content);

    const ministerLogin = await loginAs(users.minister.username);
    const denied = await request(app.getHttpServer())
      .get(`/api/attachments/${attachmentFixture.fileId}/download`)
      .set('Authorization', `Bearer ${ministerLogin.body.data.token}`);

    expect(denied.status).toBe(403);
  });

  it('blocks deprecated /api/files/download endpoint', async () => {
    const loginResponse = await loginAs(users.teacher.username);
    const response = await request(app.getHttpServer())
      .get('/api/files/download')
      .query({ key: 'anything' })
      .set('Authorization', `Bearer ${loginResponse.body.data.token}`);

    expect(response.status).toBe(403);
    expect(String(response.body.message || '')).toContain('Deprecated');
  });
});
