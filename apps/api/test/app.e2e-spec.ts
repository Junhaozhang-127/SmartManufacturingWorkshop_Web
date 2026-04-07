import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';

import { AppModule } from '../src/modules/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/shared/http-exception.filter';
import { ResponseTransformInterceptor } from '../src/shared/response-transform.interceptor';
import { createPrismaMock } from './create-prisma-mock';

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
  const passwordHash = bcrypt.hashSync('123456', 10);

  const units = [
    { id: 10n, parentId: null, unitName: '智能制造实验室' },
    { id: 20n, parentId: 10n, unitName: '研发部' },
    { id: 30n, parentId: 20n, unitName: '前端组' },
  ];

  const users: Record<string, MockUser> = {
    teacher01: {
      id: 1n,
      username: 'teacher01',
      passwordHash,
      displayName: '王老师',
      statusCode: 'ACTIVE',
      forcePasswordChange: false,
      isDeleted: false,
      userRoles: [{ role: { roleCode: 'TEACHER', roleName: '老师', dataScope: 'ALL', sortNo: 10 } }],
      member: null,
    },
    leader01: {
      id: 2n,
      username: 'leader01',
      passwordHash,
      displayName: '李主任',
      statusCode: 'ACTIVE',
      forcePasswordChange: true,
      isDeleted: false,
      userRoles: [{ role: { roleCode: 'LAB_LEADER', roleName: '实验室负责人', dataScope: 'ALL', sortNo: 20 } }],
      member: null,
    },
    hybrid01: {
      id: 3n,
      username: 'hybrid01',
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
    minister01: {
      id: 4n,
      username: 'minister01',
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
    member01: {
      id: 5n,
      username: 'member01',
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
      userId: 4n,
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
        username: 'minister01',
        userRoles: [{ role: { roleName: '部长' } }],
      },
    },
    {
      id: 101n,
      userId: 3n,
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
        username: 'hybrid01',
        userRoles: [{ role: { roleName: '部长' } }, { role: { roleName: '组长' } }],
      },
    },
    {
      id: 102n,
      userId: 5n,
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
        username: 'member01',
        userRoles: [{ role: { roleName: '成员' } }],
      },
    },
  ];

  function getUserByWhere(where: { username?: string; id?: bigint }) {
    if (where.username) {
      return users[where.username] ?? null;
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
  });

  afterAll(async () => {
    await app.close();
  });

  async function getCaptchaCode() {
    const response = await request(app.getHttpServer()).get('/api/auth/captcha');
    const svg = decodeURIComponent(String(response.body.data.captchaSvg).split(',')[1]);
    const captchaCode = [...svg.matchAll(/<text[^>]*>([A-Z0-9])<\/text>/g)].map((item) => item[1]).join('');

    return {
      captchaId: response.body.data.captchaId as string,
      captchaCode,
    };
  }

  async function loginAs(username: string, password = '123456') {
    const captcha = await getCaptchaCode();

    return request(app.getHttpServer()).post('/api/auth/login').send({
      username,
      password,
      captchaId: captcha.captchaId,
      captchaCode: captcha.captchaCode,
    });
  }

  it('/api/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.data.app.status).toBe('up');
  });

  it('logs in successfully with username, password and captcha', async () => {
    const response = await loginAs('teacher01');

    expect(response.status).toBe(201);
    expect(response.body.data.token).toContain('.');
    expect(response.body.data.user.activeRole.roleCode).toBe('TEACHER');
  });

  it('fails login with wrong password', async () => {
    const response = await loginAs('teacher01', 'bad-password');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('账号或密码错误');
  });

  it('fails login with wrong captcha', async () => {
    const captcha = await getCaptchaCode();
    const response = await request(app.getHttpServer()).post('/api/auth/login').send({
      username: 'teacher01',
      password: '123456',
      captchaId: captcha.captchaId,
      captchaCode: 'ZZZZ',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('验证码错误');
  });

  it('blocks first-login users from protected business endpoints before password change', async () => {
    const loginResponse = await loginAs('leader01');
    const response = await request(app.getHttpServer())
      .get('/api/examples/members')
      .set('Authorization', `Bearer ${loginResponse.body.data.token}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('首次登录需先修改密码');
  });

  it('returns self-scoped member data for member role', async () => {
    const loginResponse = await loginAs('member01');
    const response = await request(app.getHttpServer())
      .get('/api/examples/members')
      .set('Authorization', `Bearer ${loginResponse.body.data.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.meta.total).toBe(1);
  });

  it('returns different data after switching role for a multi-role user', async () => {
    const loginResponse = await loginAs('hybrid01');
    const ministerToken = loginResponse.body.data.token as string;

    const ministerListResponse = await request(app.getHttpServer())
      .get('/api/examples/members')
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
      .get('/api/examples/members')
      .set('Authorization', `Bearer ${groupToken}`);

    expect(groupListResponse.status).toBe(200);
    expect(groupListResponse.body.data.meta.total).toBe(2);
  });
});
