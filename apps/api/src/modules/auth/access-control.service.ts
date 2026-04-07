import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Prisma, SysRole } from '@prisma/client';
import {
  type AccessTokenPayload,
  type CurrentUserProfile,
  type DashboardSummaryMock,
  DataScope,
  type DataScopeContext,
  MenuCode,
  type PermissionCode,
  PermissionCodes,
  RoleCode,
  RoleDataScopeMap,
  type RoleOption,
  RolePermissionMap,
  type UserOrgProfile,
} from '@smw/shared';

import { PrismaService } from '../prisma/prisma.service';

type UserWithRelations = Prisma.SysUserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: true;
      };
      orderBy: {
        role: {
          sortNo: 'asc';
        };
      };
    };
    member: {
      include: {
        orgUnit: {
          include: {
            parent: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async loadUserByUsername(username: string) {
    return this.prisma.sysUser.findUnique({
      where: { username },
      include: {
        userRoles: {
          include: {
            role: true,
          },
          orderBy: {
            role: {
              sortNo: 'asc',
            },
          },
        },
        member: {
          include: {
            orgUnit: {
              include: {
                parent: true,
              },
            },
          },
        },
      },
    });
  }

  async loadCurrentUser(payload: AccessTokenPayload) {
    const user = await this.prisma.sysUser.findUnique({
      where: { id: BigInt(payload.sub) },
      include: {
        userRoles: {
          include: {
            role: true,
          },
          orderBy: {
            role: {
              sortNo: 'asc',
            },
          },
        },
        member: {
          include: {
            orgUnit: {
              include: {
                parent: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.isDeleted || user.statusCode !== 'ACTIVE') {
      throw new UnauthorizedException('当前用户状态不可用');
    }

    return this.buildCurrentUserProfile(user, payload.activeRoleCode);
  }

  async buildCurrentUserProfile(
    user: UserWithRelations,
    activeRoleCode?: RoleCode,
  ): Promise<CurrentUserProfile> {
    const roleOptions = this.toRoleOptions(user.userRoles.map((relation) => relation.role));
    const resolvedActiveRole = roleOptions.find((role) => role.roleCode === activeRoleCode) ?? roleOptions[0];

    if (!resolvedActiveRole) {
      throw new ForbiddenException('当前用户未分配角色');
    }

    const orgProfile = this.buildOrgProfile(user);
    const dataScopeContext = await this.buildDataScopeContext(user, resolvedActiveRole);

    return {
      id: String(user.id),
      username: user.username,
      displayName: user.displayName,
      statusCode: user.statusCode,
      activeRole: resolvedActiveRole,
      roleOptions,
      permissions: this.getPermissionsByRole(resolvedActiveRole.roleCode),
      forcePasswordChange: user.forcePasswordChange,
      orgProfile,
      dataScopeContext,
      dashboard: this.buildDashboardSummary(resolvedActiveRole.roleCode),
    };
  }

  getPermissionsByRole(roleCode: RoleCode): PermissionCode[] {
    return RolePermissionMap[roleCode] ?? [PermissionCodes.authLogin];
  }

  ensurePermissions(currentUser: CurrentUserProfile, permissions: PermissionCode[]) {
    const missingPermission = permissions.find((permission) => !currentUser.permissions.includes(permission));

    if (missingPermission) {
      throw new ForbiddenException(`缺少权限: ${missingPermission}`);
    }
  }

  private toRoleOptions(roles: SysRole[]): RoleOption[] {
    return roles.map((role) => ({
      roleCode: role.roleCode as RoleCode,
      roleName: role.roleName,
      dataScope: (role.dataScope as DataScope) ?? RoleDataScopeMap[role.roleCode as RoleCode],
    }));
  }

  private buildOrgProfile(user: UserWithRelations): UserOrgProfile {
    const orgUnit = user.member?.orgUnit ?? null;
    const parent = orgUnit?.parent ?? null;
    const isGroup = orgUnit?.unitType === 'GROUP';
    const isDepartment = orgUnit?.unitType === 'DEPARTMENT';

    return {
      orgUnitId: orgUnit ? String(orgUnit.id) : null,
      orgUnitName: orgUnit?.unitName ?? null,
      departmentId: isGroup ? (parent ? String(parent.id) : null) : isDepartment ? String(orgUnit.id) : null,
      departmentName: isGroup ? parent?.unitName ?? null : isDepartment ? orgUnit?.unitName ?? null : null,
      groupId: isGroup ? String(orgUnit.id) : null,
      groupName: isGroup ? orgUnit.unitName : null,
      positionCode: user.member?.positionCode ?? null,
    };
  }

  private async buildDataScopeContext(
    user: UserWithRelations,
    activeRole: RoleOption,
  ): Promise<DataScopeContext> {
    const orgProfile = this.buildOrgProfile(user);
    const departmentAndDescendantIds = orgProfile.departmentId
      ? await this.collectOrgDescendantIds(orgProfile.departmentId)
      : [];

    return {
      scope: activeRole.dataScope,
      userId: String(user.id),
      orgUnitId: orgProfile.orgUnitId,
      departmentId: orgProfile.departmentId,
      departmentAndDescendantIds,
      groupId: orgProfile.groupId,
      selfUserIds: [String(user.id)],
      participatingUserIds: [String(user.id)],
    };
  }

  private async collectOrgDescendantIds(rootOrgUnitId: string) {
    const units = await this.prisma.orgUnit.findMany({
      where: {
        isDeleted: false,
        statusCode: 'ACTIVE',
      },
      select: {
        id: true,
        parentId: true,
      },
    });

    const targetIds = new Set<string>([rootOrgUnitId]);
    let changed = true;

    while (changed) {
      changed = false;

      for (const unit of units) {
        if (unit.parentId && targetIds.has(String(unit.parentId)) && !targetIds.has(String(unit.id))) {
          targetIds.add(String(unit.id));
          changed = true;
        }
      }
    }

    return [...targetIds];
  }

  private buildDashboardSummary(roleCode: RoleCode): DashboardSummaryMock {
    const approvalEntry = {
      code: MenuCode.APPROVAL_CENTER,
      label: '统一审批中心',
      path: '/workflow/approval-center',
    };
    const demoEntry = {
      code: MenuCode.APPROVAL_DEMO,
      label: '测试审批单',
      path: '/workflow/demo-request',
    };

    switch (roleCode) {
      case RoleCode.TEACHER:
      case RoleCode.LAB_LEADER:
        return {
          todoCount: 9,
          shortcutEntries: [
            { code: MenuCode.DASHBOARD, label: '系统驾驶舱', path: '/' },
            approvalEntry,
            demoEntry,
            { code: MenuCode.MEMBER_EXAMPLES, label: '成员示例列表', path: '/system/examples' },
            { code: MenuCode.HEALTH, label: '系统健康检查', path: '/system/health' },
          ],
        };
      case RoleCode.MINISTER:
      case RoleCode.GROUP_LEADER:
        return {
          todoCount: 5,
          shortcutEntries: [
            { code: MenuCode.DASHBOARD, label: '角色驾驶舱', path: '/' },
            approvalEntry,
            demoEntry,
            { code: MenuCode.MEMBER_EXAMPLES, label: '成员示例列表', path: '/system/examples' },
          ],
        };
      default:
        return {
          todoCount: 2,
          shortcutEntries: [
            { code: MenuCode.DASHBOARD, label: '个人驾驶舱', path: '/' },
            approvalEntry,
            demoEntry,
          ],
        };
    }
  }
}
