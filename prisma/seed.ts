import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  ApprovalBusinessType,
  DataScope,
  MemberGrowthRecordType,
  MemberStatus,
  RegularizationStatus,
  RoleCode,
} from '@smw/shared';

const prisma = new PrismaClient();

async function upsertUser(
  username: string,
  displayName: string,
  passwordHash: string,
  mobile: string,
  email: string,
  forcePasswordChange = false,
) {
  return prisma.sysUser.upsert({
    where: { username },
    update: {
      displayName,
      passwordHash,
      mobile,
      email,
      forcePasswordChange,
      passwordChangedAt: forcePasswordChange ? null : new Date('2026-04-01T09:00:00Z'),
    },
    create: {
      username,
      displayName,
      passwordHash,
      mobile,
      email,
      forcePasswordChange,
      passwordChangedAt: forcePasswordChange ? null : new Date('2026-04-01T09:00:00Z'),
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(process.env.MOCK_LOGIN_PASSWORD ?? '123456', 10);

  const roles = [
    { roleCode: RoleCode.TEACHER, roleName: '老师', dataScope: DataScope.ALL, sortNo: 10 },
    { roleCode: RoleCode.LAB_LEADER, roleName: '实验室负责人', dataScope: DataScope.ALL, sortNo: 20 },
    { roleCode: RoleCode.MINISTER, roleName: '部长', dataScope: DataScope.DEPT_PROJECT, sortNo: 30 },
    { roleCode: RoleCode.GROUP_LEADER, roleName: '组长', dataScope: DataScope.GROUP_PROJECT, sortNo: 40 },
    { roleCode: RoleCode.MEMBER, roleName: '正式成员', dataScope: DataScope.SELF_PARTICIPATE, sortNo: 50 },
    { roleCode: RoleCode.INTERN, roleName: '实习生', dataScope: DataScope.SELF_PARTICIPATE, sortNo: 60 },
  ];

  for (const role of roles) {
    await prisma.sysRole.upsert({
      where: { roleCode: role.roleCode },
      update: role,
      create: role,
    });
  }

  const teacher = await upsertUser(
    'teacher01',
    '王老师',
    passwordHash,
    '13800000001',
    'teacher01@lab.local',
  );
  const leader = await upsertUser(
    'leader01',
    '李负责人',
    passwordHash,
    '13800000002',
    'leader01@lab.local',
  );
  const minister = await upsertUser(
    'minister01',
    '周部长',
    passwordHash,
    '13800000003',
    'minister01@lab.local',
  );
  const groupLeader = await upsertUser(
    'hybrid01',
    '钱组长',
    passwordHash,
    '13800000004',
    'hybrid01@lab.local',
  );
  const member = await upsertUser(
    'member01',
    '张成员',
    passwordHash,
    '13800000005',
    'member01@lab.local',
  );
  const intern = await upsertUser(
    'intern01',
    '林实习',
    passwordHash,
    '13800000006',
    'intern01@lab.local',
    true,
  );

  const rootOrg = await prisma.orgUnit.upsert({
    where: { unitCode: 'LAB_ROOT' },
    update: {
      unitName: '智能制造实验室',
      unitType: 'LAB',
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
      unitType: 'DEPARTMENT',
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
      unitType: 'GROUP',
      leaderUserId: groupLeader.id,
    },
    create: {
      parentId: department.id,
      unitCode: 'FE_GROUP',
      unitName: '前端组',
      unitType: 'GROUP',
      leaderUserId: groupLeader.id,
    },
  });

  const roleMap = new Map((await prisma.sysRole.findMany()).map((role) => [role.roleCode, role.id]));
  const userRoleRelations = [
    { userId: teacher.id, roleCode: RoleCode.TEACHER },
    { userId: leader.id, roleCode: RoleCode.LAB_LEADER },
    { userId: minister.id, roleCode: RoleCode.MINISTER },
    { userId: groupLeader.id, roleCode: RoleCode.GROUP_LEADER },
    { userId: member.id, roleCode: RoleCode.MEMBER },
    { userId: intern.id, roleCode: RoleCode.INTERN },
  ];

  for (const relation of userRoleRelations) {
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

  const profiles = [
    {
      userId: minister.id,
      orgUnitId: department.id,
      positionCode: 'MINISTER',
      mentorUserId: teacher.id,
      joinDate: new Date('2026-03-01'),
      memberStatus: MemberStatus.ACTIVE,
      skillTags: 'Management,Review',
    },
    {
      userId: groupLeader.id,
      orgUnitId: group.id,
      positionCode: 'GROUP_LEADER',
      mentorUserId: minister.id,
      joinDate: new Date('2026-03-05'),
      memberStatus: MemberStatus.ACTIVE,
      skillTags: 'Vue,Architecture',
    },
    {
      userId: member.id,
      orgUnitId: group.id,
      positionCode: 'MEMBER',
      mentorUserId: groupLeader.id,
      joinDate: new Date('2026-03-10'),
      memberStatus: MemberStatus.ACTIVE,
      skillTags: 'Vue,NestJS,Prisma',
    },
    {
      userId: intern.id,
      orgUnitId: group.id,
      positionCode: 'INTERN',
      mentorUserId: groupLeader.id,
      joinDate: new Date('2026-03-18'),
      memberStatus: MemberStatus.INTERN,
      skillTags: 'Vue,TypeScript',
    },
  ];

  for (const profile of profiles) {
    await prisma.memberProfile.upsert({
      where: { userId: profile.userId },
      update: profile,
      create: profile,
    });
  }

  const internProfile = await prisma.memberProfile.findUniqueOrThrow({
    where: { userId: intern.id },
  });

  const growthRecords = [
    {
      memberProfileId: internProfile.id,
      recordType: MemberGrowthRecordType.MENTOR_BOUND,
      title: '带教绑定',
      content: '绑定钱组长为带教人',
      recordDate: new Date('2026-03-18'),
      actorUserId: groupLeader.id,
    },
    {
      memberProfileId: internProfile.id,
      recordType: MemberGrowthRecordType.STAGE_EVALUATED,
      title: '阶段评价：FIRST_MONTH',
      content: '完成前端组上手任务，代码规范良好。',
      recordDate: new Date('2026-04-01'),
      actorUserId: groupLeader.id,
    },
  ];

  for (const item of growthRecords) {
    await prisma.memberGrowthRecord.create({
      data: item,
    });
  }

  await prisma.memberStageEvaluation.create({
    data: {
      memberProfileId: internProfile.id,
      stageCode: 'FIRST_MONTH',
      summary: '已独立完成成员档案页面拆分，具备转正申请条件。',
      score: 92,
      resultCode: 'PASS',
      nextAction: '提交转正申请并进入审批流程',
      evaluatedAt: new Date('2026-04-02T09:00:00Z'),
      evaluatorUserId: groupLeader.id,
    },
  });

  const demoTemplate = await prisma.wfApprovalTemplate.upsert({
    where: { businessType: ApprovalBusinessType.DEMO_REQUEST },
    update: {
      templateCode: 'DEMO_REQUEST_FLOW',
      templateName: '测试审批流程',
      statusCode: 'ACTIVE',
    },
    create: {
      templateCode: 'DEMO_REQUEST_FLOW',
      templateName: '测试审批流程',
      businessType: ApprovalBusinessType.DEMO_REQUEST,
      statusCode: 'ACTIVE',
    },
  });

  const demoNodes = [
    { nodeKey: 'GROUP_LEADER_REVIEW', nodeName: '组长审批', sortNo: 1, approverRoleCode: RoleCode.GROUP_LEADER },
    { nodeKey: 'MINISTER_REVIEW', nodeName: '部长审批', sortNo: 2, approverRoleCode: RoleCode.MINISTER },
  ];

  for (const node of demoNodes) {
    await prisma.wfApprovalTemplateNode.upsert({
      where: {
        templateId_nodeKey: {
          templateId: demoTemplate.id,
          nodeKey: node.nodeKey,
        },
      },
      update: node,
      create: {
        templateId: demoTemplate.id,
        ...node,
      },
    });
  }

  const regularizationTemplate = await prisma.wfApprovalTemplate.upsert({
    where: { businessType: ApprovalBusinessType.MEMBER_REGULARIZATION },
    update: {
      templateCode: 'MEMBER_REGULARIZATION_FLOW',
      templateName: '成员转正流程',
      statusCode: 'ACTIVE',
    },
    create: {
      templateCode: 'MEMBER_REGULARIZATION_FLOW',
      templateName: '成员转正流程',
      businessType: ApprovalBusinessType.MEMBER_REGULARIZATION,
      statusCode: 'ACTIVE',
    },
  });

  const regularizationNodes = [
    { nodeKey: 'GROUP_LEADER_REVIEW', nodeName: '组长评价', sortNo: 1, approverRoleCode: RoleCode.GROUP_LEADER },
    { nodeKey: 'MINISTER_REVIEW', nodeName: '部长审核', sortNo: 2, approverRoleCode: RoleCode.MINISTER },
    { nodeKey: 'LAB_LEADER_CONFIRM', nodeName: '负责人确认', sortNo: 3, approverRoleCode: RoleCode.LAB_LEADER },
  ];

  for (const node of regularizationNodes) {
    await prisma.wfApprovalTemplateNode.upsert({
      where: {
        templateId_nodeKey: {
          templateId: regularizationTemplate.id,
          nodeKey: node.nodeKey,
        },
      },
      update: node,
      create: {
        templateId: regularizationTemplate.id,
        ...node,
      },
    });
  }

  await prisma.memberRegularization.deleteMany({
    where: {
      memberProfileId: internProfile.id,
      statusCode: RegularizationStatus.DRAFT,
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
