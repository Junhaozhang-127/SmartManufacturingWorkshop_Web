import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  AchievementType,
  ApprovalBusinessType,
  ConsumableInventoryStatus,
  ConsumableRequestStatus,
  ConsumableStatus,
  CompetitionRegistrationStatus,
  DataScope,
  DeviceRepairSeverity,
  DeviceRepairStatus,
  DeviceStatus,
  FundApplicationStatus,
  FundPaymentStatus,
  InventoryTxnType,
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

  const competitionTemplate = await prisma.wfApprovalTemplate.upsert({
    where: { businessType: ApprovalBusinessType.COMPETITION_REGISTRATION },
    update: {
      templateCode: 'COMPETITION_REGISTRATION_FLOW',
      templateName: '赛事报名流程',
      statusCode: 'ACTIVE',
    },
    create: {
      templateCode: 'COMPETITION_REGISTRATION_FLOW',
      templateName: '赛事报名流程',
      businessType: ApprovalBusinessType.COMPETITION_REGISTRATION,
      statusCode: 'ACTIVE',
    },
  });

  for (const node of demoNodes) {
    await prisma.wfApprovalTemplateNode.upsert({
      where: {
        templateId_nodeKey: {
          templateId: competitionTemplate.id,
          nodeKey: node.nodeKey,
        },
      },
      update: node,
      create: {
        templateId: competitionTemplate.id,
        ...node,
      },
    });
  }

  const achievementTemplate = await prisma.wfApprovalTemplate.upsert({
    where: { businessType: ApprovalBusinessType.ACHIEVEMENT_RECOGNITION },
    update: {
      templateCode: 'ACHIEVEMENT_RECOGNITION_FLOW',
      templateName: '成果认定流程',
      statusCode: 'ACTIVE',
    },
    create: {
      templateCode: 'ACHIEVEMENT_RECOGNITION_FLOW',
      templateName: '成果认定流程',
      businessType: ApprovalBusinessType.ACHIEVEMENT_RECOGNITION,
      statusCode: 'ACTIVE',
    },
  });

  const achievementNodes = [
    { nodeKey: 'GROUP_LEADER_REVIEW', nodeName: '组长初审', sortNo: 1, approverRoleCode: RoleCode.GROUP_LEADER },
    { nodeKey: 'MINISTER_REVIEW', nodeName: '部长认定', sortNo: 2, approverRoleCode: RoleCode.MINISTER },
  ];

  for (const node of achievementNodes) {
    await prisma.wfApprovalTemplateNode.upsert({
      where: {
        templateId_nodeKey: {
          templateId: achievementTemplate.id,
          nodeKey: node.nodeKey,
        },
      },
      update: node,
      create: {
        templateId: achievementTemplate.id,
        ...node,
      },
    });
  }

  const hackathon = await prisma.compCompetition.upsert({
    where: { competitionCode: 'COMP-2026-SMW-HACK' },
    update: {
      name: '智能制造创新赛',
      organizer: '校创新中心',
      competitionLevel: 'SCHOOL',
      competitionCategory: '创新创业',
      statusCode: 'OPEN',
      registrationStartDate: new Date('2026-04-01'),
      registrationEndDate: new Date('2026-04-20'),
      eventStartDate: new Date('2026-05-01'),
      eventEndDate: new Date('2026-05-10'),
      description: '面向实验室成员的校级创新赛',
      createdBy: minister.id,
    },
    create: {
      competitionCode: 'COMP-2026-SMW-HACK',
      name: '智能制造创新赛',
      organizer: '校创新中心',
      competitionLevel: 'SCHOOL',
      competitionCategory: '创新创业',
      statusCode: 'OPEN',
      registrationStartDate: new Date('2026-04-01'),
      registrationEndDate: new Date('2026-04-20'),
      eventStartDate: new Date('2026-05-01'),
      eventEndDate: new Date('2026-05-10'),
      description: '面向实验室成员的校级创新赛',
      createdBy: minister.id,
    },
  });

  const existingTeam = await prisma.compTeam.findFirst({
    where: {
      competitionId: hackathon.id,
      teamName: '智造先锋队',
      isDeleted: false,
    },
  });

  const teamPayload = {
    competitionId: hackathon.id,
    teamName: '智造先锋队',
    teamLeaderUserId: groupLeader.id,
    advisorUserId: teacher.id,
    memberUserIds: `,${groupLeader.id},${member.id},${intern.id},`,
    memberNames: '钱组长、张成员、林实习',
    projectId: 'PRJ-COMP-001',
    projectName: '产线质量预警看板',
    applicationReason: '围绕产线预警与可视化建设参赛',
    statusCode: CompetitionRegistrationStatus.APPROVED,
    latestResult: '历史演示队伍',
    createdBy: groupLeader.id,
  };

  const demoTeam = existingTeam
    ? await prisma.compTeam.update({
        where: { id: existingTeam.id },
        data: teamPayload,
      })
    : await prisma.compTeam.create({
        data: teamPayload,
      });

  const existingAchievement = await prisma.achvAchievement.findFirst({
    where: {
      title: '基于视觉检测的产线缺陷识别方法',
      applicantUserId: member.id,
      isDeleted: false,
    },
  });

  if (existingAchievement) {
    await prisma.achvContributor.deleteMany({
      where: { achievementId: existingAchievement.id },
    });
    await prisma.achvPaper.deleteMany({
      where: { achievementId: existingAchievement.id },
    });
    await prisma.ipAsset.deleteMany({
      where: { achievementId: existingAchievement.id },
    });
  }

  const achievement = existingAchievement
    ? await prisma.achvAchievement.update({
        where: { id: existingAchievement.id },
        data: {
          achievementType: AchievementType.PAPER,
          title: '基于视觉检测的产线缺陷识别方法',
          levelCode: 'PROVINCIAL',
          statusCode: 'DRAFT',
          recognizedGrade: 'PENDING_RULE_CONFIG',
          scoreMapping: {
            configured: false,
            ruleKey: 'PAPER:PROVINCIAL',
            score: null,
            message: 'seed placeholder',
          },
          projectId: 'PRJ-ACH-001',
          projectName: '缺陷检测算法研究',
          applicantUserId: member.id,
          createdBy: member.id,
          sourceCompetitionId: hackathon.id,
          sourceTeamId: demoTeam.id,
          description: 'P0 种子数据：论文成果草稿',
        },
      })
    : await prisma.achvAchievement.create({
        data: {
          achievementType: AchievementType.PAPER,
          title: '基于视觉检测的产线缺陷识别方法',
          levelCode: 'PROVINCIAL',
          statusCode: 'DRAFT',
          recognizedGrade: 'PENDING_RULE_CONFIG',
          scoreMapping: {
            configured: false,
            ruleKey: 'PAPER:PROVINCIAL',
            score: null,
            message: 'seed placeholder',
          },
          projectId: 'PRJ-ACH-001',
          projectName: '缺陷检测算法研究',
          applicantUserId: member.id,
          createdBy: member.id,
          sourceCompetitionId: hackathon.id,
          sourceTeamId: demoTeam.id,
          description: 'P0 种子数据：论文成果草稿',
        },
      });

  await prisma.achvContributor.createMany({
    data: [
      {
        achievementId: achievement.id,
        userId: member.id,
        contributorName: member.displayName,
        contributorRole: 'AUTHOR',
        contributionRank: 1,
        isInternal: true,
      },
      {
        achievementId: achievement.id,
        userId: teacher.id,
        contributorName: teacher.displayName,
        contributorRole: 'ADVISOR',
        contributionRank: 2,
        isInternal: true,
      },
    ],
  });

  await prisma.achvPaper.create({
    data: {
      achievementId: achievement.id,
      journalName: '智能制造技术',
      publishDate: new Date('2026-03-15'),
      indexedBy: 'CNKI',
      authorOrder: '1/2',
    },
  });

  await prisma.achvAchievement.deleteMany({
    where: {
      id: {
        not: achievement.id,
      },
      statusCode: 'DRAFT',
      title: '基于视觉检测的产线缺陷识别方法',
    },
  });

  const repairTemplate = await prisma.wfApprovalTemplate.upsert({
    where: { businessType: ApprovalBusinessType.REPAIR_ORDER },
    update: {
      templateCode: 'DEVICE_REPAIR_FLOW',
      templateName: '设备报修审批流程',
      statusCode: 'ACTIVE',
    },
    create: {
      templateCode: 'DEVICE_REPAIR_FLOW',
      templateName: '设备报修审批流程',
      businessType: ApprovalBusinessType.REPAIR_ORDER,
      statusCode: 'ACTIVE',
    },
  });

  const repairNodes = [
    { nodeKey: 'GROUP_LEADER_REVIEW', nodeName: '组长审批', sortNo: 1, approverRoleCode: RoleCode.GROUP_LEADER },
    { nodeKey: 'MINISTER_REVIEW', nodeName: '部长审批', sortNo: 2, approverRoleCode: RoleCode.MINISTER },
  ];

  for (const node of repairNodes) {
    await prisma.wfApprovalTemplateNode.upsert({
      where: {
        templateId_nodeKey: {
          templateId: repairTemplate.id,
          nodeKey: node.nodeKey,
        },
      },
      update: node,
      create: {
        templateId: repairTemplate.id,
        ...node,
      },
    });
  }

  const consumableTemplate = await prisma.wfApprovalTemplate.upsert({
    where: { businessType: ApprovalBusinessType.CONSUMABLE_REQUEST },
    update: {
      templateCode: 'CONSUMABLE_REQUEST_FLOW',
      templateName: '耗材申领审批流程',
      statusCode: 'ACTIVE',
    },
    create: {
      templateCode: 'CONSUMABLE_REQUEST_FLOW',
      templateName: '耗材申领审批流程',
      businessType: ApprovalBusinessType.CONSUMABLE_REQUEST,
      statusCode: 'ACTIVE',
    },
  });

  for (const node of repairNodes) {
    await prisma.wfApprovalTemplateNode.upsert({
      where: {
        templateId_nodeKey: {
          templateId: consumableTemplate.id,
          nodeKey: node.nodeKey,
        },
      },
      update: node,
      create: {
        templateId: consumableTemplate.id,
        ...node,
      },
    });
  }

  const fundTemplate = await prisma.wfApprovalTemplate.upsert({
    where: { businessType: ApprovalBusinessType.FUND_REQUEST },
    update: {
      templateCode: 'FUND_REQUEST_FLOW',
      templateName: '经费申请审批流程',
      statusCode: 'ACTIVE',
    },
    create: {
      templateCode: 'FUND_REQUEST_FLOW',
      templateName: '经费申请审批流程',
      businessType: ApprovalBusinessType.FUND_REQUEST,
      statusCode: 'ACTIVE',
    },
  });

  for (const node of repairNodes) {
    await prisma.wfApprovalTemplateNode.upsert({
      where: {
        templateId_nodeKey: {
          templateId: fundTemplate.id,
          nodeKey: node.nodeKey,
        },
      },
      update: node,
      create: {
        templateId: fundTemplate.id,
        ...node,
      },
    });
  }

  const edgeCamera = await prisma.assetDevice.upsert({
    where: { deviceCode: 'DEV-CAM-001' },
    update: {
      deviceName: '产线边缘相机',
      categoryName: '视觉采集',
      model: 'SMW-CAM-A1',
      specification: '5MP / GigE',
      manufacturer: 'Smart Vision',
      serialNo: 'CAM-2026-001',
      assetTag: 'AT-DEV-001',
      statusCode: DeviceStatus.IDLE,
      orgUnitId: group.id,
      responsibleUserId: member.id,
      locationLabel: 'A区产线工位 01',
      purchaseDate: new Date('2026-02-01'),
      warrantyUntil: new Date('2028-02-01'),
      purchaseAmount: 12800,
      remarks: '用于缺陷检测演示线',
      statusChangedAt: new Date('2026-04-01T09:00:00Z'),
      createdBy: leader.id,
      isDeleted: false,
    },
    create: {
      deviceCode: 'DEV-CAM-001',
      deviceName: '产线边缘相机',
      categoryName: '视觉采集',
      model: 'SMW-CAM-A1',
      specification: '5MP / GigE',
      manufacturer: 'Smart Vision',
      serialNo: 'CAM-2026-001',
      assetTag: 'AT-DEV-001',
      statusCode: DeviceStatus.IDLE,
      orgUnitId: group.id,
      responsibleUserId: member.id,
      locationLabel: 'A区产线工位 01',
      purchaseDate: new Date('2026-02-01'),
      warrantyUntil: new Date('2028-02-01'),
      purchaseAmount: 12800,
      remarks: '用于缺陷检测演示线',
      statusChangedAt: new Date('2026-04-01T09:00:00Z'),
      createdBy: leader.id,
    },
  });

  const workstation = await prisma.assetDevice.upsert({
    where: { deviceCode: 'DEV-PLC-002' },
    update: {
      deviceName: 'PLC 调试工位',
      categoryName: '控制设备',
      model: 'SMW-PLC-X2',
      specification: '48 I/O',
      manufacturer: 'Factory Core',
      serialNo: 'PLC-2026-002',
      assetTag: 'AT-DEV-002',
      statusCode: DeviceStatus.REPAIRING,
      orgUnitId: group.id,
      responsibleUserId: groupLeader.id,
      locationLabel: 'B区调试台',
      purchaseDate: new Date('2026-01-15'),
      warrantyUntil: new Date('2027-01-15'),
      purchaseAmount: 18600,
      remarks: '保留一条进行中报修单用于首页聚合',
      statusChangedAt: new Date('2026-04-06T10:00:00Z'),
      createdBy: leader.id,
      isDeleted: false,
    },
    create: {
      deviceCode: 'DEV-PLC-002',
      deviceName: 'PLC 调试工位',
      categoryName: '控制设备',
      model: 'SMW-PLC-X2',
      specification: '48 I/O',
      manufacturer: 'Factory Core',
      serialNo: 'PLC-2026-002',
      assetTag: 'AT-DEV-002',
      statusCode: DeviceStatus.REPAIRING,
      orgUnitId: group.id,
      responsibleUserId: groupLeader.id,
      locationLabel: 'B区调试台',
      purchaseDate: new Date('2026-01-15'),
      warrantyUntil: new Date('2027-01-15'),
      purchaseAmount: 18600,
      remarks: '保留一条进行中报修单用于首页聚合',
      statusChangedAt: new Date('2026-04-06T10:00:00Z'),
      createdBy: leader.id,
    },
  });

  const existingRepair = await prisma.assetDeviceRepair.findFirst({
    where: {
      repairNo: 'RP-20260406-001',
      isDeleted: false,
    },
  });

  const repairPayload = {
    deviceId: workstation.id,
    repairNo: 'RP-20260406-001',
    applicantUserId: member.id,
    applicantRoleCode: RoleCode.MEMBER,
    handlerUserId: groupLeader.id,
    statusCode: DeviceRepairStatus.PROCESSING,
    severity: DeviceRepairSeverity.HIGH,
    faultDescription: '工位上电后 IO 指示异常，无法进入联机调试状态',
    latestResult: '审批通过，处理中',
    requestedAmount: 800,
    costEstimate: 600,
    fundLinkCode: 'FUND-RESERVED-001',
    deviceStatusBeforeRepair: DeviceStatus.IDLE,
    reportedAt: new Date('2026-04-06T10:00:00Z'),
    approvedAt: new Date('2026-04-06T12:00:00Z'),
    acceptedAt: new Date('2026-04-06T13:00:00Z'),
    statusChangedAt: new Date('2026-04-06T13:00:00Z'),
    createdBy: member.id,
  };

  const seededRepair = existingRepair
    ? await prisma.assetDeviceRepair.update({
        where: { id: existingRepair.id },
        data: repairPayload,
      })
    : await prisma.assetDeviceRepair.create({
        data: repairPayload,
      });

  await prisma.assetDevice.update({
    where: { id: workstation.id },
    data: {
      latestRepairId: seededRepair.id,
    },
  });

  await prisma.assetDevice.update({
    where: { id: edgeCamera.id },
    data: {
      latestRepairId: null,
    },
  });

  const workshopAccount = await prisma.fundAccount.upsert({
    where: { accountCode: 'FUND-RESERVED-001' },
    update: {
      accountName: '智能产线调试经费',
      statusCode: 'ACTIVE',
      categoryName: '项目预算',
      projectId: 'PRJ-SMW-001',
      projectName: '智能制造产线调试项目',
      ownerOrgUnitId: group.id,
      managerUserId: groupLeader.id,
      totalBudget: 50000,
      reservedAmount: 1200,
      usedAmount: 5800,
      paidAmount: 5200,
      remarks: '设备维修、差旅与采购共用预算池',
      lastExpenseAt: new Date('2026-04-07T09:30:00Z'),
      createdBy: leader.id,
      isDeleted: false,
    },
    create: {
      accountCode: 'FUND-RESERVED-001',
      accountName: '智能产线调试经费',
      statusCode: 'ACTIVE',
      categoryName: '项目预算',
      projectId: 'PRJ-SMW-001',
      projectName: '智能制造产线调试项目',
      ownerOrgUnitId: group.id,
      managerUserId: groupLeader.id,
      totalBudget: 50000,
      reservedAmount: 1200,
      usedAmount: 5800,
      paidAmount: 5200,
      remarks: '设备维修、差旅与采购共用预算池',
      lastExpenseAt: new Date('2026-04-07T09:30:00Z'),
      createdBy: leader.id,
    },
  });

  await prisma.fundAccount.upsert({
    where: { accountCode: 'FUND-TRAVEL-002' },
    update: {
      accountName: '项目外出差旅经费',
      statusCode: 'ACTIVE',
      categoryName: '差旅预算',
      projectId: 'PRJ-SMW-001',
      projectName: '智能制造产线调试项目',
      ownerOrgUnitId: department.id,
      managerUserId: minister.id,
      totalBudget: 18000,
      reservedAmount: 0,
      usedAmount: 2600,
      paidAmount: 2600,
      remarks: '项目现场调试差旅预算',
      lastExpenseAt: new Date('2026-04-05T08:00:00Z'),
      createdBy: leader.id,
      isDeleted: false,
    },
    create: {
      accountCode: 'FUND-TRAVEL-002',
      accountName: '项目外出差旅经费',
      statusCode: 'ACTIVE',
      categoryName: '差旅预算',
      projectId: 'PRJ-SMW-001',
      projectName: '智能制造产线调试项目',
      ownerOrgUnitId: department.id,
      managerUserId: minister.id,
      totalBudget: 18000,
      reservedAmount: 0,
      usedAmount: 2600,
      paidAmount: 2600,
      remarks: '项目现场调试差旅预算',
      lastExpenseAt: new Date('2026-04-05T08:00:00Z'),
      createdBy: leader.id,
    },
  });

  await prisma.fundApplication.upsert({
    where: { applicationNo: 'FUND-20260407-001' },
    update: {
      accountId: workshopAccount.id,
      applicantUserId: member.id,
      applicantRoleCode: RoleCode.MEMBER,
      applicationType: 'EXPENSE',
      expenseType: 'REPAIR',
      title: 'PLC 工位维修费用',
      purpose: '对应 RP-20260406-001 维修工单，申请更换 IO 模块维修费用',
      amount: 1200,
      payeeName: '设备维修供应商',
      projectId: 'PRJ-SMW-001',
      projectName: '智能制造产线调试项目',
      relatedBusinessType: ApprovalBusinessType.REPAIR_ORDER,
      relatedBusinessId: String(seededRepair.id),
      statusCode: FundApplicationStatus.APPROVED,
      paymentStatus: FundPaymentStatus.PENDING,
      latestResult: '种子数据：审批通过，待支付',
      submittedAt: new Date('2026-04-07T09:00:00Z'),
      completedAt: new Date('2026-04-07T10:00:00Z'),
      createdBy: member.id,
    },
    create: {
      applicationNo: 'FUND-20260407-001',
      accountId: workshopAccount.id,
      applicantUserId: member.id,
      applicantRoleCode: RoleCode.MEMBER,
      applicationType: 'EXPENSE',
      expenseType: 'REPAIR',
      title: 'PLC 工位维修费用',
      purpose: '对应 RP-20260406-001 维修工单，申请更换 IO 模块维修费用',
      amount: 1200,
      payeeName: '设备维修供应商',
      projectId: 'PRJ-SMW-001',
      projectName: '智能制造产线调试项目',
      relatedBusinessType: ApprovalBusinessType.REPAIR_ORDER,
      relatedBusinessId: String(seededRepair.id),
      statusCode: FundApplicationStatus.APPROVED,
      paymentStatus: FundPaymentStatus.PENDING,
      latestResult: '种子数据：审批通过，待支付',
      submittedAt: new Date('2026-04-07T09:00:00Z'),
      completedAt: new Date('2026-04-07T10:00:00Z'),
      createdBy: member.id,
    },
  });

  const solderWire = await prisma.invConsumable.upsert({
    where: { consumableCode: 'CS-SOLDER-001' },
    update: {
      consumableName: '焊锡丝',
      categoryName: '电子耗材',
      specification: '0.8mm / 500g',
      unitName: '卷',
      statusCode: ConsumableStatus.ACTIVE,
      inventoryStatus: ConsumableInventoryStatus.NORMAL,
      currentStock: 18,
      warningThreshold: 5,
      warningFlag: false,
      orgUnitId: group.id,
      defaultLocation: '电子仓 A-01',
      lastTxnAt: new Date('2026-04-06T09:00:00Z'),
      createdBy: leader.id,
      isDeleted: false,
    },
    create: {
      consumableCode: 'CS-SOLDER-001',
      consumableName: '焊锡丝',
      categoryName: '电子耗材',
      specification: '0.8mm / 500g',
      unitName: '卷',
      statusCode: ConsumableStatus.ACTIVE,
      inventoryStatus: ConsumableInventoryStatus.NORMAL,
      currentStock: 18,
      warningThreshold: 5,
      warningFlag: false,
      orgUnitId: group.id,
      defaultLocation: '电子仓 A-01',
      lastTxnAt: new Date('2026-04-06T09:00:00Z'),
      createdBy: leader.id,
    },
  });

  const gloves = await prisma.invConsumable.upsert({
    where: { consumableCode: 'CS-GLOVE-002' },
    update: {
      consumableName: '防静电手套',
      categoryName: '防护耗材',
      specification: 'L 码 / 12 双装',
      unitName: '盒',
      statusCode: ConsumableStatus.ACTIVE,
      inventoryStatus: ConsumableInventoryStatus.LOW_STOCK,
      currentStock: 2,
      warningThreshold: 4,
      warningFlag: true,
      orgUnitId: group.id,
      defaultLocation: '防护仓 B-03',
      replenishmentTriggeredAt: new Date('2026-04-07T08:30:00Z'),
      lastTxnAt: new Date('2026-04-07T08:30:00Z'),
      createdBy: leader.id,
      isDeleted: false,
    },
    create: {
      consumableCode: 'CS-GLOVE-002',
      consumableName: '防静电手套',
      categoryName: '防护耗材',
      specification: 'L 码 / 12 双装',
      unitName: '盒',
      statusCode: ConsumableStatus.ACTIVE,
      inventoryStatus: ConsumableInventoryStatus.LOW_STOCK,
      currentStock: 2,
      warningThreshold: 4,
      warningFlag: true,
      orgUnitId: group.id,
      defaultLocation: '防护仓 B-03',
      replenishmentTriggeredAt: new Date('2026-04-07T08:30:00Z'),
      lastTxnAt: new Date('2026-04-07T08:30:00Z'),
      createdBy: leader.id,
    },
  });

  await prisma.invConsumableRequest.deleteMany({
    where: {
      requestNo: 'REQ-20260407-001',
    },
  });

  await prisma.invInventoryTxn.deleteMany({
    where: {
      remark: {
        in: ['P0 种子建账', '样机调试领用', '现场防护领用', '种子数据：申领审批自动出库'],
      },
    },
  });

  await prisma.invInventoryTxn.createMany({
    data: [
      {
        consumableId: solderWire.id,
        txnType: InventoryTxnType.INBOUND,
        quantity: 20,
        balanceAfter: 20,
        operatorUserId: leader.id,
        operatorRoleCode: RoleCode.LAB_LEADER,
        remark: 'P0 种子建账',
        txnAt: new Date('2026-04-05T10:00:00Z'),
      },
      {
        consumableId: solderWire.id,
        txnType: InventoryTxnType.OUTBOUND,
        quantity: 2,
        balanceAfter: 18,
        projectId: 'PRJ-INV-001',
        projectName: '焊接工位改造',
        operatorUserId: groupLeader.id,
        operatorRoleCode: RoleCode.GROUP_LEADER,
        remark: '样机调试领用',
        txnAt: new Date('2026-04-06T09:00:00Z'),
      },
      {
        consumableId: gloves.id,
        txnType: InventoryTxnType.INBOUND,
        quantity: 4,
        balanceAfter: 4,
        operatorUserId: leader.id,
        operatorRoleCode: RoleCode.LAB_LEADER,
        remark: 'P0 种子建账',
        txnAt: new Date('2026-04-05T10:20:00Z'),
      },
      {
        consumableId: gloves.id,
        txnType: InventoryTxnType.OUTBOUND,
        quantity: 2,
        balanceAfter: 2,
        projectId: 'PRJ-INV-002',
        projectName: '产线静电防护整改',
        operatorUserId: member.id,
        operatorRoleCode: RoleCode.MEMBER,
        remark: '现场防护领用',
        txnAt: new Date('2026-04-07T08:30:00Z'),
      },
    ],
  });

  const request = await prisma.invConsumableRequest.create({
    data: {
      requestNo: 'REQ-20260407-001',
      consumableId: gloves.id,
      applicantUserId: member.id,
      applicantRoleCode: RoleCode.MEMBER,
      quantity: 1,
      purpose: '实验线巡检防护',
      projectId: 'PRJ-INV-002',
      projectName: '产线静电防护整改',
      statusCode: ConsumableRequestStatus.FULFILLED,
      latestResult: '种子数据：审批通过并已出库',
      statusLogs: [
        {
          actionType: 'REQUEST_CREATED',
          fromStatus: null,
          toStatus: 'DRAFT',
          operatorUserId: String(member.id),
          operatorName: member.displayName,
          comment: '实验线巡检防护',
          createdAt: '2026-04-07T09:00:00.000Z',
        },
        {
          actionType: 'APPROVAL_APPROVED',
          fromStatus: 'IN_APPROVAL',
          toStatus: 'FULFILLED',
          operatorUserId: String(groupLeader.id),
          operatorName: groupLeader.displayName,
          comment: '种子数据自动出库',
          createdAt: '2026-04-07T09:10:00.000Z',
        },
      ],
      requestedAt: new Date('2026-04-07T09:00:00Z'),
      completedAt: new Date('2026-04-07T09:10:00Z'),
    },
  });

  const outboundTxn = await prisma.invInventoryTxn.create({
    data: {
      consumableId: gloves.id,
      requestId: request.id,
      txnType: InventoryTxnType.REQUEST_OUTBOUND,
      quantity: 1,
      balanceAfter: 1,
      projectId: 'PRJ-INV-002',
      projectName: '产线静电防护整改',
      operatorUserId: groupLeader.id,
      operatorRoleCode: RoleCode.GROUP_LEADER,
      remark: '种子数据：申领审批自动出库',
      txnAt: new Date('2026-04-07T09:10:00Z'),
    },
  });

  await prisma.invConsumableRequest.update({
    where: { id: request.id },
    data: {
      outboundTxnId: outboundTxn.id,
    },
  });

  await prisma.invConsumable.update({
    where: { id: gloves.id },
    data: {
      currentStock: 1,
      inventoryStatus: ConsumableInventoryStatus.LOW_STOCK,
      warningFlag: true,
      replenishmentTriggeredAt: new Date('2026-04-07T08:30:00Z'),
      lastTxnAt: new Date('2026-04-07T09:10:00Z'),
    },
  });

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
