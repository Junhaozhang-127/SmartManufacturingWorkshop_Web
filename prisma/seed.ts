import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { DataScope, RoleCode } from '@smw/shared';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(process.env.MOCK_LOGIN_PASSWORD ?? '123456', 10);

  const roles = [
    { roleCode: RoleCode.TEACHER, roleName: '老师', dataScope: DataScope.ALL, sortNo: 10 },
    { roleCode: RoleCode.LAB_LEADER, roleName: '实验室负责人', dataScope: DataScope.ALL, sortNo: 20 },
    { roleCode: RoleCode.MINISTER, roleName: '部长', dataScope: DataScope.DEPT_PROJECT, sortNo: 30 },
    { roleCode: RoleCode.GROUP_LEADER, roleName: '组长', dataScope: DataScope.GROUP_PROJECT, sortNo: 40 },
    { roleCode: RoleCode.MEMBER, roleName: '成员', dataScope: DataScope.SELF_PARTICIPATE, sortNo: 50 },
    { roleCode: RoleCode.INTERN, roleName: '实习生', dataScope: DataScope.SELF_PARTICIPATE, sortNo: 60 },
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
      forcePasswordChange: false,
      passwordChangedAt: new Date('2026-04-01T09:00:00Z'),
    },
    create: {
      username: 'teacher01',
      displayName: '王老师',
      passwordHash,
      mobile: '13800000001',
      email: 'teacher01@lab.local',
      forcePasswordChange: false,
      passwordChangedAt: new Date('2026-04-01T09:00:00Z'),
    },
  });

  const leader = await prisma.sysUser.upsert({
    where: { username: 'leader01' },
    update: {
      displayName: '李主任',
      passwordHash,
      forcePasswordChange: false,
      passwordChangedAt: new Date('2026-04-01T09:10:00Z'),
    },
    create: {
      username: 'leader01',
      displayName: '李主任',
      passwordHash,
      mobile: '13800000002',
      email: 'leader01@lab.local',
      forcePasswordChange: false,
      passwordChangedAt: new Date('2026-04-01T09:10:00Z'),
    },
  });

  const minister = await prisma.sysUser.upsert({
    where: { username: 'minister01' },
    update: {
      displayName: '周部长',
      passwordHash,
      forcePasswordChange: false,
      passwordChangedAt: new Date('2026-04-01T09:20:00Z'),
    },
    create: {
      username: 'minister01',
      displayName: '周部长',
      passwordHash,
      mobile: '13800000004',
      email: 'minister01@lab.local',
      forcePasswordChange: false,
      passwordChangedAt: new Date('2026-04-01T09:20:00Z'),
    },
  });

  const member = await prisma.sysUser.upsert({
    where: { username: 'member01' },
    update: {
      displayName: '张成员',
      passwordHash,
      forcePasswordChange: true,
      passwordChangedAt: null,
    },
    create: {
      username: 'member01',
      displayName: '张成员',
      passwordHash,
      mobile: '13800000003',
      email: 'member01@lab.local',
      forcePasswordChange: true,
    },
  });

  const dualRoleUser = await prisma.sysUser.upsert({
    where: { username: 'hybrid01' },
    update: {
      displayName: '钱双角色',
      passwordHash,
      forcePasswordChange: false,
      passwordChangedAt: new Date('2026-04-01T09:30:00Z'),
    },
    create: {
      username: 'hybrid01',
      displayName: '钱双角色',
      passwordHash,
      mobile: '13800000005',
      email: 'hybrid01@lab.local',
      forcePasswordChange: false,
      passwordChangedAt: new Date('2026-04-01T09:30:00Z'),
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

  const department = await prisma.orgUnit.upsert({
    where: { unitCode: 'DEV_DEPT' },
    update: {
      parentId: rootOrg.id,
      unitName: '研发部',
      leaderUserId: minister.id,
    },
    create: {
      parentId: rootOrg.id,
      unitCode: 'DEV_DEPT',
      unitName: '研发部',
      unitType: 'DEPARTMENT',
      leaderUserId: minister.id,
    },
  });

  const group = await prisma.orgUnit.upsert({
    where: { unitCode: 'FE_GROUP' },
    update: {
      parentId: department.id,
      unitName: '前端组',
      leaderUserId: dualRoleUser.id,
    },
    create: {
      parentId: department.id,
      unitCode: 'FE_GROUP',
      unitName: '前端组',
      unitType: 'GROUP',
      leaderUserId: dualRoleUser.id,
    },
  });

  const roleMap = new Map((await prisma.sysRole.findMany()).map((role) => [role.roleCode, role.id]));

  const userRoles = [
    { userId: teacher.id, roleCode: RoleCode.TEACHER },
    { userId: leader.id, roleCode: RoleCode.LAB_LEADER },
    { userId: minister.id, roleCode: RoleCode.MINISTER },
    { userId: member.id, roleCode: RoleCode.MEMBER },
    { userId: dualRoleUser.id, roleCode: RoleCode.MINISTER },
    { userId: dualRoleUser.id, roleCode: RoleCode.GROUP_LEADER },
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

  const memberProfiles = [
    {
      userId: minister.id,
      orgUnitId: department.id,
      positionCode: 'MINISTER',
      mentorUserId: teacher.id,
      joinDate: new Date('2026-03-01'),
      memberStatus: 'ACTIVE',
      skillTags: 'Management,Review',
    },
    {
      userId: dualRoleUser.id,
      orgUnitId: group.id,
      positionCode: 'GROUP_LEADER',
      mentorUserId: minister.id,
      joinDate: new Date('2026-03-05'),
      memberStatus: 'ACTIVE',
      skillTags: 'Vue,Architecture',
    },
    {
      userId: member.id,
      orgUnitId: group.id,
      positionCode: 'MEMBER',
      mentorUserId: dualRoleUser.id,
      joinDate: new Date('2026-03-10'),
      memberStatus: 'ACTIVE',
      skillTags: 'Vue,NestJS,Prisma',
    },
  ];

  for (const profile of memberProfiles) {
    await prisma.memberProfile.upsert({
      where: { userId: profile.userId },
      update: profile,
      create: profile,
    });
  }
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
