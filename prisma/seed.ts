import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { DataScope, RoleCode } from '@smw/shared';

const prisma = new PrismaClient();
(globalThis as typeof globalThis & { __lastFakePrisma?: PrismaClient }).__lastFakePrisma = prisma;

function readEnv(name: string) {
  const value = process.env[name];
  return value ? value.trim() : '';
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertStrongPassword(password: string) {
  assert(password.length >= 12, 'SEED_ADMIN_PASSWORD must be at least 12 characters');
  assert(!/\s/.test(password), 'SEED_ADMIN_PASSWORD must not contain spaces');
}

async function seedRoles() {
  const roles = [
    { roleCode: RoleCode.TEACHER, roleName: '老师', dataScope: DataScope.ALL, sortNo: 10 },
    { roleCode: RoleCode.MINISTER, roleName: '部长', dataScope: DataScope.DEPT_PROJECT, sortNo: 30 },
    { roleCode: RoleCode.GROUP_LEADER, roleName: '组长', dataScope: DataScope.GROUP_PROJECT, sortNo: 40 },
    { roleCode: RoleCode.MEMBER, roleName: '正式成员', dataScope: DataScope.SELF_PARTICIPATE, sortNo: 50 },
    { roleCode: RoleCode.INTERN, roleName: '实习生', dataScope: DataScope.SELF_PARTICIPATE, sortNo: 60 },
  ] as const;

  for (const role of roles) {
    await prisma.sysRole.upsert({
      where: { roleCode: role.roleCode },
      update: role,
      create: role,
    });
  }
}

async function seedAdminUser() {
  const username = readEnv('SEED_ADMIN_USERNAME');
  const password = readEnv('SEED_ADMIN_PASSWORD');
  const displayName = readEnv('SEED_ADMIN_DISPLAY_NAME') || '系统管理员';
  const forcePasswordChange = readEnv('SEED_ADMIN_FORCE_PASSWORD_CHANGE') !== 'false';

  if (!username || !password) {
    return null;
  }

  assertStrongPassword(password);

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.sysUser.upsert({
    where: { username },
    update: {
      displayName,
      passwordHash,
      forcePasswordChange,
      passwordChangedAt: forcePasswordChange ? null : new Date(),
    },
    create: {
      username,
      displayName,
      passwordHash,
      mobile: '',
      email: '',
      statusCode: 'ACTIVE',
      isDeleted: false,
      forcePasswordChange,
      passwordChangedAt: forcePasswordChange ? null : new Date(),
    },
  });

  const rootOrg = await prisma.orgUnit.upsert({
    where: { unitCode: 'LAB_ROOT' },
    update: {
      unitName: '智能制造工坊',
      unitType: 'LAB',
      leaderUserId: admin.id,
    },
    create: {
      unitCode: 'LAB_ROOT',
      unitName: '智能制造工坊',
      unitType: 'LAB',
      leaderUserId: admin.id,
    },
  });

  await prisma.memberProfile.upsert({
    where: { userId: admin.id },
    update: {
      orgUnitId: rootOrg.id,
      positionCode: 'TEACHER',
      mentorUserId: admin.id,
      memberStatus: 'ACTIVE',
      joinDate: new Date(),
      skillTags: '',
    },
    create: {
      userId: admin.id,
      orgUnitId: rootOrg.id,
      positionCode: 'TEACHER',
      mentorUserId: admin.id,
      memberStatus: 'ACTIVE',
      joinDate: new Date(),
      skillTags: '',
    },
  });

  const role = await prisma.sysRole.findUnique({ where: { roleCode: RoleCode.TEACHER } });
  assert(role, 'Role TEACHER is missing');

  await prisma.sysUserRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: role.id,
    },
  });

  return admin;
}

async function main() {
  await seedRoles();
  await seedAdminUser();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

