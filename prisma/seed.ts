import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(process.env.MOCK_LOGIN_PASSWORD ?? '123456', 10);

  const roles = [
    { roleCode: 'TEACHER', roleName: '老师', dataScope: 'ALL', sortNo: 10 },
    { roleCode: 'LAB_LEADER', roleName: '实验室负责人', dataScope: 'ALL', sortNo: 20 },
    { roleCode: 'MINISTER', roleName: '部长', dataScope: 'DEPT', sortNo: 30 },
    { roleCode: 'GROUP_LEADER', roleName: '组长', dataScope: 'GROUP', sortNo: 40 },
    { roleCode: 'MEMBER', roleName: '成员', dataScope: 'SELF', sortNo: 50 },
    { roleCode: 'INTERN', roleName: '实习生', dataScope: 'SELF', sortNo: 60 },
  ];

  for (const role of roles) {
    await prisma.sysRole.upsert({
      where: { roleCode: role.roleCode },
      update: role,
      create: role,
    });
  }

  const teacher = await prisma.sysUser.upsert({
    where: { username: 'teacher01' },
    update: {
      displayName: '王老师',
      passwordHash,
    },
    create: {
      username: 'teacher01',
      displayName: '王老师',
      passwordHash,
      mobile: '13800000001',
      email: 'teacher01@lab.local',
    },
  });

  const leader = await prisma.sysUser.upsert({
    where: { username: 'leader01' },
    update: {
      displayName: '李主任',
      passwordHash,
    },
    create: {
      username: 'leader01',
      displayName: '李主任',
      passwordHash,
      mobile: '13800000002',
      email: 'leader01@lab.local',
    },
  });

  const member = await prisma.sysUser.upsert({
    where: { username: 'member01' },
    update: {
      displayName: '张成员',
      passwordHash,
    },
    create: {
      username: 'member01',
      displayName: '张成员',
      passwordHash,
      mobile: '13800000003',
      email: 'member01@lab.local',
    },
  });

  const rootOrg = await prisma.orgUnit.upsert({
    where: { unitCode: 'LAB_ROOT' },
    update: {
      unitName: '智能制造实验室',
      leaderUserId: leader.id,
    },
    create: {
      unitCode: 'LAB_ROOT',
      unitName: '智能制造实验室',
      unitType: 'LAB',
      leaderUserId: leader.id,
    },
  });

  const dept = await prisma.orgUnit.upsert({
    where: { unitCode: 'DEV_DEPT' },
    update: {
      parentId: rootOrg.id,
      unitName: '开发方向组',
      leaderUserId: member.id,
    },
    create: {
      parentId: rootOrg.id,
      unitCode: 'DEV_DEPT',
      unitName: '开发方向组',
      unitType: 'DEPARTMENT',
      leaderUserId: member.id,
    },
  });

  const roleMap = new Map((await prisma.sysRole.findMany()).map((role) => [role.roleCode, role.id]));

  const userRoles = [
    { userId: teacher.id, roleCode: 'TEACHER' },
    { userId: leader.id, roleCode: 'LAB_LEADER' },
    { userId: member.id, roleCode: 'MEMBER' },
  ];

  for (const relation of userRoles) {
    await prisma.sysUserRole.upsert({
      where: {
        userId_roleId: {
          userId: relation.userId,
          roleId: roleMap.get(relation.roleCode)!,
        },
      },
      update: {},
      create: {
        userId: relation.userId,
        roleId: roleMap.get(relation.roleCode)!,
      },
    });
  }

  await prisma.memberProfile.upsert({
    where: { userId: member.id },
    update: {
      orgUnitId: dept.id,
      positionCode: 'MEMBER',
      mentorUserId: teacher.id,
      joinDate: new Date('2026-03-10'),
      memberStatus: 'ACTIVE',
      skillTags: 'Vue,NestJS,Prisma',
    },
    create: {
      userId: member.id,
      orgUnitId: dept.id,
      positionCode: 'MEMBER',
      mentorUserId: teacher.id,
      joinDate: new Date('2026-03-10'),
      memberStatus: 'ACTIVE',
      skillTags: 'Vue,NestJS,Prisma',
    },
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
