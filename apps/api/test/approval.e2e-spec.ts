import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';

import { AppModule } from '../src/modules/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/shared/http-exception.filter';
import { ResponseTransformInterceptor } from '../src/shared/response-transform.interceptor';
import { createPrismaMock } from './create-prisma-mock';

type MockRole = {
  roleCode: string;
  roleName: string;
  dataScope: string;
  sortNo: number;
};

type MockUser = {
  id: bigint;
  username: string;
  passwordHash: string;
  displayName: string;
  statusCode: string;
  forcePasswordChange: boolean;
  isDeleted: boolean;
  userRoles: Array<{ role: MockRole }>;
  member: null | {
    orgUnitId: bigint;
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

type DemoForm = {
  id: bigint;
  title: string;
  reason: string;
  statusCode: string;
  applicantUserId: bigint;
  approvalInstanceId: bigint | null;
  createdAt: Date;
  updatedAt: Date;
};

type TemplateNode = {
  id: bigint;
  templateId: bigint;
  nodeKey: string;
  nodeName: string;
  sortNo: number;
  approverRoleCode: string;
  createdAt: Date;
  updatedAt: Date;
};

type ApprovalInstance = {
  id: bigint;
  templateId: bigint;
  businessType: string;
  businessId: string;
  title: string;
  status: string;
  applicantUserId: bigint;
  applicantRoleCode: string | null;
  currentNodeKey: string | null;
  currentNodeName: string | null;
  currentNodeSort: number | null;
  currentApproverRoleCode: string | null;
  currentApproverUserId: bigint | null;
  latestComment: string | null;
  formData: Record<string, unknown> | null;
  finishedAt: Date | null;
  withdrawnAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ApprovalLog = {
  id: bigint;
  instanceId: bigint;
  nodeKey: string | null;
  nodeName: string | null;
  actionType: string;
  actorUserId: bigint;
  actorRoleCode: string | null;
  targetUserId: bigint | null;
  comment: string | null;
  extraData: Record<string, unknown> | null;
  createdAt: Date;
};

type NotificationItem = {
  id: bigint;
  userId: bigint;
  title: string;
  content: string;
  categoryCode: string;
  levelCode: string;
  businessType: string | null;
  businessId: string | null;
  routePath: string | null;
  routeQuery: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: bigint | null;
  isDeleted: boolean;
};

describe('Approval engine e2e', () => {
  let app: INestApplication;
  const prismaMock = createPrismaMock();
  const passwordHash = bcrypt.hashSync('123456', 10);

  const units = [
    { id: 10n, parentId: null, unitName: '智能制造实验室' },
    { id: 20n, parentId: 10n, unitName: '研发部' },
    { id: 30n, parentId: 20n, unitName: '前端组' },
    { id: 21n, parentId: 10n, unitName: '测试部' },
    { id: 31n, parentId: 21n, unitName: '后端组' },
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
    minister01: {
      id: 2n,
      username: 'minister01',
      passwordHash,
      displayName: '周部长',
      statusCode: 'ACTIVE',
      forcePasswordChange: false,
      isDeleted: false,
      userRoles: [{ role: { roleCode: 'MINISTER', roleName: '部长', dataScope: 'DEPT_PROJECT', sortNo: 30 } }],
      member: {
        orgUnitId: 20n,
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
        orgUnitId: 30n,
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
    member01: {
      id: 4n,
      username: 'member01',
      passwordHash,
      displayName: '成员甲',
      statusCode: 'ACTIVE',
      forcePasswordChange: false,
      isDeleted: false,
      userRoles: [{ role: { roleCode: 'MEMBER', roleName: '成员', dataScope: 'SELF_PARTICIPATE', sortNo: 50 } }],
      member: {
        orgUnitId: 30n,
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
    outsiderLeader01: {
      id: 5n,
      username: 'outsiderLeader01',
      passwordHash,
      displayName: '外部组长',
      statusCode: 'ACTIVE',
      forcePasswordChange: false,
      isDeleted: false,
      userRoles: [{ role: { roleCode: 'GROUP_LEADER', roleName: '组长', dataScope: 'GROUP_PROJECT', sortNo: 40 } }],
      member: {
        orgUnitId: 31n,
        positionCode: 'GROUP_LEADER',
        orgUnit: {
          id: 31n,
          unitName: '后端组',
          unitType: 'GROUP',
          parent: {
            id: 21n,
            unitName: '测试部',
            unitType: 'DEPARTMENT',
          },
        },
      },
    },
    outsiderMinister01: {
      id: 6n,
      username: 'outsiderMinister01',
      passwordHash,
      displayName: '外部部长',
      statusCode: 'ACTIVE',
      forcePasswordChange: false,
      isDeleted: false,
      userRoles: [{ role: { roleCode: 'MINISTER', roleName: '部长', dataScope: 'DEPT_PROJECT', sortNo: 30 } }],
      member: {
        orgUnitId: 21n,
        positionCode: 'MINISTER',
        orgUnit: {
          id: 21n,
          unitName: '测试部',
          unitType: 'DEPARTMENT',
          parent: {
            id: 10n,
            unitName: '智能制造实验室',
            unitType: 'LAB',
          },
        },
      },
    },
  };

  const templateNodes: TemplateNode[] = [
    {
      id: 11n,
      templateId: 1n,
      nodeKey: 'GROUP_LEADER_REVIEW',
      nodeName: '组长审批',
      sortNo: 1,
      approverRoleCode: 'GROUP_LEADER',
      createdAt: new Date('2026-04-07T09:00:00Z'),
      updatedAt: new Date('2026-04-07T09:00:00Z'),
    },
    {
      id: 12n,
      templateId: 1n,
      nodeKey: 'MINISTER_REVIEW',
      nodeName: '部长审批',
      sortNo: 2,
      approverRoleCode: 'MINISTER',
      createdAt: new Date('2026-04-07T09:00:00Z'),
      updatedAt: new Date('2026-04-07T09:00:00Z'),
    },
  ];

  const template = {
    id: 1n,
    templateCode: 'DEMO_REQUEST_FLOW',
    templateName: '通用测试单据审批流程',
    businessType: 'DEMO_REQUEST',
    statusCode: 'ACTIVE',
    createdAt: new Date('2026-04-07T09:00:00Z'),
    updatedAt: new Date('2026-04-07T09:00:00Z'),
    nodes: templateNodes,
  };

  const demoForms: DemoForm[] = [];
  const approvalInstances: ApprovalInstance[] = [];
  const approvalLogs: ApprovalLog[] = [];
  const notifications: NotificationItem[] = [];
  let nextFormId = 100n;
  let nextInstanceId = 200n;
  let nextLogId = 300n;
  let nextNotificationId = 400n;

  function getUserByWhere(where: { username?: string; id?: bigint }) {
    if (where.username) {
      return users[where.username] ?? null;
    }

    if (where.id) {
      return Object.values(users).find((user) => user.id === where.id) ?? null;
    }

    return null;
  }

  function enrichForm(form: DemoForm) {
    return {
      ...form,
      applicant: getUserByWhere({ id: form.applicantUserId }),
    };
  }

  function enrichInstance(instance: ApprovalInstance) {
    return {
      ...instance,
      applicant: getUserByWhere({ id: instance.applicantUserId }),
      currentApprover: instance.currentApproverUserId ? getUserByWhere({ id: instance.currentApproverUserId }) : null,
      template: {
        ...template,
        nodes: templateNodes,
      },
      logs: approvalLogs
        .filter((log) => log.instanceId === instance.id)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
        .map((log) => ({
          ...log,
          actor: getUserByWhere({ id: log.actorUserId }),
          targetUser: log.targetUserId ? getUserByWhere({ id: log.targetUserId }) : null,
          instance: {
            ...instance,
            applicant: getUserByWhere({ id: instance.applicantUserId }),
            currentApprover: instance.currentApproverUserId ? getUserByWhere({ id: instance.currentApproverUserId }) : null,
          },
        })),
    };
  }

  function matchesApprovalWhere(instance: ApprovalInstance, where?: Record<string, unknown>): boolean {
    if (!where) {
      return true;
    }

    if (where.OR && Array.isArray(where.OR)) {
      return where.OR.some((item) => matchesApprovalWhere(instance, item as Record<string, unknown>));
    }

    if (where.AND && Array.isArray(where.AND)) {
      return where.AND.every((item) => matchesApprovalWhere(instance, item as Record<string, unknown>));
    }

    if (where.status && where.status !== instance.status) {
      return false;
    }

    if (where.applicantUserId && where.applicantUserId !== instance.applicantUserId) {
      return false;
    }

    if (
      Object.prototype.hasOwnProperty.call(where, 'currentApproverUserId') &&
      where.currentApproverUserId !== instance.currentApproverUserId
    ) {
      return false;
    }

    if (where.currentApproverRoleCode && where.currentApproverRoleCode !== instance.currentApproverRoleCode) {
      return false;
    }

    if (where.title && typeof where.title === 'object' && 'contains' in where.title) {
      const keyword = String((where.title as { contains: string }).contains).toLowerCase();
      if (!instance.title.toLowerCase().includes(keyword)) {
        return false;
      }
    }

    if (where.applicant && typeof where.applicant === 'object') {
      const applicantWhere = where.applicant as { displayName?: { contains: string } };
      if (applicantWhere.displayName?.contains) {
        const applicant = getUserByWhere({ id: instance.applicantUserId });
        if (!applicant?.displayName.toLowerCase().includes(applicantWhere.displayName.contains.toLowerCase())) {
          return false;
        }
      }
    }

    return true;
  }

  beforeAll(async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ result: 1 }]);
    prismaMock.$transaction.mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (client: typeof prismaMock) => unknown)(prismaMock);
      }

      return Promise.all(arg as Promise<unknown>[]);
    });

    prismaMock.sysUser.findUnique.mockImplementation(({ where }: { where: { username?: string; id?: bigint } }) =>
      Promise.resolve(getUserByWhere(where)),
    );
    prismaMock.sysUser.findMany.mockImplementation(
      ({
        where,
      }: {
        where?: { userRoles?: { some?: { role?: { roleCode?: string } } }; statusCode?: string; isDeleted?: boolean };
      }) =>
        Promise.resolve(
          Object.values(users).filter((user) => {
            if (where?.statusCode && user.statusCode !== where.statusCode) {
              return false;
            }
            if (typeof where?.isDeleted === 'boolean' && user.isDeleted !== where.isDeleted) {
              return false;
            }
            if (where?.userRoles?.some?.role?.roleCode) {
              return user.userRoles.some((relation) => relation.role.roleCode === where.userRoles?.some?.role?.roleCode);
            }
            return true;
          }),
        ),
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
    prismaMock.sysNotification.create.mockImplementation(
      ({ data }: { data: Partial<NotificationItem> }) => {
        const now = new Date();
        const item: NotificationItem = {
          id: nextNotificationId++,
          userId: data.userId as bigint,
          title: String(data.title),
          content: String(data.content),
          categoryCode: String(data.categoryCode ?? 'APPROVAL'),
          levelCode: String(data.levelCode ?? 'INFO'),
          businessType: (data.businessType as string) ?? null,
          businessId: (data.businessId as string) ?? null,
          routePath: (data.routePath as string) ?? null,
          routeQuery: (data.routeQuery as Record<string, unknown>) ?? null,
          readAt: null,
          createdAt: now,
          updatedAt: now,
          createdBy: (data.createdBy as bigint) ?? null,
          isDeleted: false,
        };
        notifications.push(item);
        return Promise.resolve(item);
      },
    );
    prismaMock.sysNotification.findMany.mockResolvedValue([]);
    prismaMock.sysNotification.findFirst.mockResolvedValue(null);
    prismaMock.sysNotification.update.mockImplementation(
      ({ where, data }: { where: { id: bigint }; data: Partial<NotificationItem> }) => {
        const item = notifications.find((notification) => notification.id === where.id);
        if (!item) {
          return Promise.resolve(null);
        }
        Object.assign(item, data, { updatedAt: new Date() });
        return Promise.resolve(item);
      },
    );
    prismaMock.sysNotification.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.sysNotification.count.mockResolvedValue(0);
    prismaMock.orgUnit.findMany.mockResolvedValue(
      units.map((unit) => ({
        id: unit.id,
        parentId: unit.parentId,
        statusCode: 'ACTIVE',
        isDeleted: false,
      })),
    );
    prismaMock.memberProfile.findMany.mockResolvedValue([]);
    prismaMock.memberProfile.count.mockResolvedValue(0);

    prismaMock.wfApprovalTemplate.findUnique.mockImplementation(
      ({ where }: { where: { businessType?: string } }) =>
        Promise.resolve(where.businessType === 'DEMO_REQUEST' ? template : null),
    );

    prismaMock.demoApprovalForm.create.mockImplementation(({ data }: { data: Partial<DemoForm> }) => {
      const now = new Date();
      const item: DemoForm = {
        id: nextFormId++,
        title: String(data.title),
        reason: String(data.reason),
        statusCode: String(data.statusCode),
        applicantUserId: data.applicantUserId as bigint,
        approvalInstanceId: null,
        createdAt: now,
        updatedAt: now,
      };
      demoForms.push(item);
      return Promise.resolve(item);
    });
    prismaMock.demoApprovalForm.update.mockImplementation(
      ({ where, data }: { where: { id: bigint }; data: Partial<DemoForm> }) => {
        const item = demoForms.find((form) => form.id === where.id);
        if (!item) {
          return Promise.resolve(null);
        }
        Object.assign(item, data, { updatedAt: new Date() });
        return Promise.resolve(item);
      },
    );
    prismaMock.demoApprovalForm.findMany.mockImplementation(({ where }: { where?: { applicantUserId?: bigint } }) =>
      Promise.resolve(
        demoForms
          .filter((form) => !where?.applicantUserId || form.applicantUserId === where.applicantUserId)
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
      ),
    );
    prismaMock.demoApprovalForm.findUnique.mockImplementation(({ where }: { where: { id: bigint } }) => {
      const item = demoForms.find((form) => form.id === where.id);
      return Promise.resolve(item ? enrichForm(item) : null);
    });

    prismaMock.wfApprovalInstance.create.mockImplementation(({ data }: { data: Partial<ApprovalInstance> }) => {
      const now = new Date();
      const instance: ApprovalInstance = {
        id: nextInstanceId++,
        templateId: data.templateId as bigint,
        businessType: String(data.businessType),
        businessId: String(data.businessId),
        title: String(data.title),
        status: String(data.status ?? 'PENDING'),
        applicantUserId: data.applicantUserId as bigint,
        applicantRoleCode: (data.applicantRoleCode as string) ?? null,
        currentNodeKey: (data.currentNodeKey as string) ?? null,
        currentNodeName: (data.currentNodeName as string) ?? null,
        currentNodeSort: (data.currentNodeSort as number) ?? null,
        currentApproverRoleCode: (data.currentApproverRoleCode as string) ?? null,
        currentApproverUserId: (data.currentApproverUserId as bigint) ?? null,
        latestComment: (data.latestComment as string) ?? null,
        formData: (data.formData as Record<string, unknown>) ?? null,
        finishedAt: null,
        withdrawnAt: null,
        createdAt: now,
        updatedAt: now,
      };
      approvalInstances.push(instance);
      return Promise.resolve(enrichInstance(instance));
    });
    prismaMock.wfApprovalInstance.update.mockImplementation(
      ({ where, data }: { where: { id: bigint }; data: Partial<ApprovalInstance> }) => {
        const item = approvalInstances.find((instance) => instance.id === where.id);
        if (!item) {
          return Promise.resolve(null);
        }
        Object.assign(item, data, { updatedAt: new Date() });
        return Promise.resolve(enrichInstance(item));
      },
    );
    prismaMock.wfApprovalInstance.findUnique.mockImplementation(
      ({ where }: { where: { id: bigint } }) => {
        const item = approvalInstances.find((instance) => instance.id === where.id);
        return Promise.resolve(item ? enrichInstance(item) : null);
      },
    );
    prismaMock.wfApprovalInstance.findMany.mockImplementation(
      ({ where }: { where?: Record<string, unknown> }) =>
        Promise.resolve(
          approvalInstances
            .filter((item) => matchesApprovalWhere(item, where))
            .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
            .map((item) => enrichInstance(item)),
        ),
    );
    prismaMock.wfApprovalInstance.count.mockImplementation(({ where }: { where?: Record<string, unknown> }) =>
      Promise.resolve(approvalInstances.filter((item) => matchesApprovalWhere(item, where)).length),
    );

    prismaMock.wfApprovalNodeLog.create.mockImplementation(({ data }: { data: Partial<ApprovalLog> }) => {
      const log: ApprovalLog = {
        id: nextLogId++,
        instanceId: data.instanceId as bigint,
        nodeKey: (data.nodeKey as string) ?? null,
        nodeName: (data.nodeName as string) ?? null,
        actionType: String(data.actionType),
        actorUserId: data.actorUserId as bigint,
        actorRoleCode: (data.actorRoleCode as string) ?? null,
        targetUserId: (data.targetUserId as bigint) ?? null,
        comment: (data.comment as string) ?? null,
        extraData: (data.extraData as Record<string, unknown>) ?? null,
        createdAt: new Date(),
      };
      approvalLogs.push(log);
      return Promise.resolve(log);
    });
    prismaMock.wfApprovalNodeLog.findFirst.mockImplementation(
      ({ where }: { where: { instanceId?: bigint; actorUserId?: bigint } }) =>
        Promise.resolve(
          approvalLogs.find(
            (log) =>
              (!where.instanceId || log.instanceId === where.instanceId) &&
              (!where.actorUserId || log.actorUserId === where.actorUserId),
          ) ?? null,
        ),
    );
    prismaMock.wfApprovalNodeLog.findMany.mockImplementation(
      ({
        where,
      }: {
        where?: { actorUserId?: bigint; actionType?: { in?: string[] } };
      }) =>
        Promise.resolve(
          approvalLogs
            .filter((log) => {
              if (where?.actorUserId && log.actorUserId !== where.actorUserId) {
                return false;
              }
              if (where?.actionType?.in && !where.actionType.in.includes(log.actionType)) {
                return false;
              }
              return true;
            })
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
            .map((log) => ({
              ...log,
              actor: getUserByWhere({ id: log.actorUserId }),
              targetUser: log.targetUserId ? getUserByWhere({ id: log.targetUserId }) : null,
              instance: enrichInstance(
                approvalInstances.find((instance) => instance.id === log.instanceId)!,
              ),
            })),
        ),
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

  beforeEach(() => {
    demoForms.length = 0;
    approvalInstances.length = 0;
    approvalLogs.length = 0;
    notifications.length = 0;
    nextFormId = 100n;
    nextInstanceId = 200n;
    nextLogId = 300n;
    nextNotificationId = 400n;
  });

  afterAll(async () => {
    await app.close();
  });
  async function loginAs(username: string) {
    return request(app.getHttpServer()).post('/api/auth/login').send({
      username,
      password: '123456',
    });
  }

  it('blocks out-of-scope approvers from seeing and handling pending approvals', async () => {
    const memberLogin = await loginAs('member01');
    const memberToken = memberLogin.body.data.token as string;

    const createResponse = await request(app.getHttpServer())
      .post('/api/approval-demo-forms')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: '组内审批隔离校验',
        reason: '验证审批中心会按数据范围隔离待办',
      });

    expect(createResponse.status).toBe(201);
    const instanceId = createResponse.body.data.approvalInstanceId as string;

    const outsiderLogin = await loginAs('outsiderLeader01');
    const outsiderToken = outsiderLogin.body.data.token as string;

    const pendingResponse = await request(app.getHttpServer())
      .get('/api/approval-center')
      .query({ tab: 'PENDING' })
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(pendingResponse.status).toBe(200);
    expect(pendingResponse.body.data.items).toHaveLength(0);

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/approval-center/${instanceId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(detailResponse.status).toBe(403);

    const transferCandidatesResponse = await request(app.getHttpServer())
      .get(`/api/approval-center/${instanceId}/transfer-candidates`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(transferCandidatesResponse.status).toBe(403);
  });

  it('requires non-empty approval comments for supplement actions', async () => {
    const memberLogin = await loginAs('member01');
    const memberToken = memberLogin.body.data.token as string;

    const createResponse = await request(app.getHttpServer())
      .post('/api/approval-demo-forms')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: '补充说明必填校验',
        reason: '验证补充说明不允许空内容',
      });

    expect(createResponse.status).toBe(201);
    const instanceId = createResponse.body.data.approvalInstanceId as string;

    const commentResponse = await request(app.getHttpServer())
      .post(`/api/approval-center/${instanceId}/comment`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ comment: '   ' });

    expect(commentResponse.status).toBe(400);
  });

  it('runs the demo workflow end to end through the generic approval center', async () => {
    const memberLogin = await loginAs('member01');
    const memberToken = memberLogin.body.data.token as string;

    const createResponse = await request(app.getHttpServer())
      .post('/api/approval-demo-forms')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: '通用流程联调单',
        reason: '验证审批中心首版可复用能力',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.approvalInstanceId).not.toBeNull();

    const instanceId = createResponse.body.data.approvalInstanceId as string;

    const hybridLogin = await loginAs('hybrid01');
    const hybridToken = hybridLogin.body.data.token as string;

    const switchGroup = await request(app.getHttpServer())
      .post('/api/auth/switch-role')
      .set('Authorization', `Bearer ${hybridToken}`)
      .send({ roleCode: 'GROUP_LEADER' });

    const groupToken = switchGroup.body.data.token as string;

    const pendingResponse = await request(app.getHttpServer())
      .get('/api/approval-center')
      .query({ tab: 'PENDING' })
      .set('Authorization', `Bearer ${groupToken}`);

    expect(pendingResponse.status).toBe(200);
    expect(pendingResponse.body.data.items).toHaveLength(1);
    expect(pendingResponse.body.data.items[0].title).toBe('通用流程联调单');

    const detailBeforeApprove = await request(app.getHttpServer())
      .get(`/api/approval-center/${instanceId}`)
      .set('Authorization', `Bearer ${groupToken}`);

    expect(detailBeforeApprove.status).toBe(200);
    expect(detailBeforeApprove.body.data.logs).toHaveLength(2);

    const approveResponse = await request(app.getHttpServer())
      .post(`/api/approval-center/${instanceId}/approve`)
      .set('Authorization', `Bearer ${groupToken}`)
      .send({ comment: '组长通过，进入部长审批' });

    expect(approveResponse.status).toBe(201);
    expect(approveResponse.body.data.currentNodeName).toBe('部长审批');

    const switchMinister = await request(app.getHttpServer())
      .post('/api/auth/switch-role')
      .set('Authorization', `Bearer ${hybridToken}`)
      .send({ roleCode: 'MINISTER' });

    const ministerRoleToken = switchMinister.body.data.token as string;

    const candidatesResponse = await request(app.getHttpServer())
      .get(`/api/approval-center/${instanceId}/transfer-candidates`)
      .set('Authorization', `Bearer ${ministerRoleToken}`);

    expect(candidatesResponse.status).toBe(200);
    const candidates = candidatesResponse.body.data as Array<{ username: string }>;
    expect(candidates.map((item) => item.username)).toContain('minister01');
    expect(candidates.map((item) => item.username)).not.toContain('outsiderMinister01');

    const transferResponse = await request(app.getHttpServer())
      .post(`/api/approval-center/${instanceId}/transfer`)
      .set('Authorization', `Bearer ${ministerRoleToken}`)
      .send({
        targetUserId: '2',
        comment: '转交给固定部长账号继续处理',
      });

    expect(transferResponse.status).toBe(201);
    expect(transferResponse.body.data.currentApproverUserId).toBe('2');

    const ministerLogin = await loginAs('minister01');
    const ministerToken = ministerLogin.body.data.token as string;

    const rejectResponse = await request(app.getHttpServer())
      .post(`/api/approval-center/${instanceId}/reject`)
      .set('Authorization', `Bearer ${ministerToken}`)
      .send({ comment: '材料不足，请补充说明后重新提交' });

    expect(rejectResponse.status).toBe(201);
    expect(rejectResponse.body.data.status).toBe('REJECTED');
    expect(rejectResponse.body.data.currentNodeName).toBeNull();

    const returnedResponse = await request(app.getHttpServer())
      .get('/api/approval-center')
      .query({ tab: 'RETURNED' })
      .set('Authorization', `Bearer ${memberToken}`);

    expect(returnedResponse.status).toBe(200);
    expect(returnedResponse.body.data.items).toHaveLength(1);
    expect(returnedResponse.body.data.items[0].status).toBe('REJECTED');

    const detailAfterReject = await request(app.getHttpServer())
      .get(`/api/approval-center/${instanceId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(detailAfterReject.status).toBe(200);
    expect(detailAfterReject.body.data.currentNodeName).toBeNull();
    const logItems = detailAfterReject.body.data.logs as Array<{ actionType: string }>;
    expect(logItems.map((log) => log.actionType)).toEqual([
      'SUBMIT',
      'NODE_ENTER',
      'APPROVE',
      'NODE_ENTER',
      'TRANSFER',
      'REJECT',
    ]);
  });
});
