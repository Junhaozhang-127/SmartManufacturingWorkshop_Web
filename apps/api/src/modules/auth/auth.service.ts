import { PrismaService } from '@api/modules/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type AuthLoginRequest, type AuthRegisterRequest, type ChangePasswordRequest, MemberStatus, RoleCode } from '@smw/shared';
import bcrypt from 'bcryptjs';

import { AccessControlService } from './access-control.service';
import { AccessTokenService } from './access-token.service';

function assertStrongPassword(password: string) {
  if (password.length < 12) {
    throw new BadRequestException('密码长度至少 12 位');
  }

  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasLetter || !hasDigit) {
    throw new BadRequestException('密码需同时包含字母与数字');
  }

  const normalized = password.trim().toLowerCase();
  const blocked = new Set(['123456', 'password', 'admin', 'qwerty']);
  if (blocked.has(normalized)) {
    throw new BadRequestException('密码强度过低，请更换');
  }
}
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControlService: AccessControlService,
    private readonly accessTokenService: AccessTokenService,
  ) {}

  async login(payload: AuthLoginRequest) {
    const user = await this.accessControlService.loadUserByUsername(payload.username);

    if (!user || user.isDeleted || user.statusCode !== 'ACTIVE') {
      throw new UnauthorizedException('账号不存在或已停用');
    }

    const matched = await bcrypt.compare(payload.password, user.passwordHash);

    if (!matched) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const activeRoleCode = (user.userRoles[0]?.role.roleCode ?? RoleCode.MEMBER) as RoleCode;
    const roleCodes = user.userRoles.map((item) => item.role.roleCode as RoleCode);

    await this.prisma.sysUser.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return {
      token: this.accessTokenService.sign({
        sub: String(user.id),
        username: user.username,
        activeRoleCode,
        roleCodes,
        scopeVersion: 1,
      }),
      user: await this.accessControlService.buildCurrentUserProfile(user, activeRoleCode),
    };
  }

  async register(payload: AuthRegisterRequest) {
    const username = payload.username.trim();
    const displayName = payload.displayName.trim();

    if (!username || !displayName || !payload.password) {
      throw new BadRequestException('Invalid register payload');
    }

    assertStrongPassword(payload.password);

    const existingUser = await this.prisma.sysUser.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new BadRequestException('Username already exists');
    }

    const internRole = await this.prisma.sysRole.findUnique({
      where: { roleCode: RoleCode.INTERN },
    });

    if (!internRole) {
      throw new BadRequestException('Intern role is not configured');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const defaultOrgUnit =
      (await this.prisma.orgUnit.findFirst({
        where: {
          isDeleted: false,
          statusCode: 'ACTIVE',
          unitCode: 'FE_GROUP',
        },
        select: { id: true },
      })) ??
      (await this.prisma.orgUnit.findFirst({
        where: {
          isDeleted: false,
          statusCode: 'ACTIVE',
          unitType: 'GROUP',
        },
        orderBy: { id: 'asc' },
        select: { id: true },
      })) ??
      (await this.prisma.orgUnit.findFirst({
        where: {
          isDeleted: false,
          statusCode: 'ACTIVE',
        },
        orderBy: { id: 'asc' },
        select: { id: true },
      }));

    if (!defaultOrgUnit) {
      throw new BadRequestException('Default org unit is not configured');
    }

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.sysUser.create({
        data: {
          username,
          displayName,
          passwordHash,
          statusCode: 'ACTIVE',
          forcePasswordChange: false,
          passwordChangedAt: new Date(),
          isDeleted: false,
        },
      });

      await tx.sysUserRole.create({
        data: {
          userId: user.id,
          roleId: internRole.id,
        },
      });

      await tx.memberProfile.create({
        data: {
          userId: user.id,
          orgUnitId: defaultOrgUnit.id,
          positionCode: 'INTERN',
          joinDate: new Date(),
          memberStatus: MemberStatus.INTERN,
        },
      });
    });

    return { success: true };
  }

  async getCurrentUser(userId: string, activeRoleCode: RoleCode) {
    return this.accessControlService.loadCurrentUser({
      sub: userId,
      username: '',
      activeRoleCode,
      roleCodes: [],
      scopeVersion: 1,
      exp: Number.MAX_SAFE_INTEGER,
    });
  }

  async switchRole(userId: string, roleCode: RoleCode) {
    const user = await this.prisma.sysUser.findUnique({
      where: { id: BigInt(userId) },
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

    const roleCodes = user.userRoles.map((relation) => relation.role.roleCode as RoleCode);

    if (!roleCodes.includes(roleCode)) {
      throw new BadRequestException('目标角色不属于当前用户');
    }

    return {
      token: this.accessTokenService.sign({
        sub: String(user.id),
        username: user.username,
        activeRoleCode: roleCode,
        roleCodes,
        scopeVersion: 1,
      }),
      user: await this.accessControlService.buildCurrentUserProfile(user, roleCode),
    };
  }

  async changePassword(userId: string, payload: ChangePasswordRequest) {
    const user = await this.prisma.sysUser.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user || user.isDeleted || user.statusCode !== 'ACTIVE') {
      throw new UnauthorizedException('当前用户状态不可用');
    }

    const matched = await bcrypt.compare(payload.currentPassword, user.passwordHash);

    if (!matched) {
      throw new BadRequestException('当前密码错误');
    }

    if (payload.currentPassword === payload.newPassword) {
      throw new BadRequestException('新密码不能与当前密码相同');
    }

    assertStrongPassword(payload.newPassword);

    await this.prisma.sysUser.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(payload.newPassword, 10),
        forcePasswordChange: false,
        passwordChangedAt: new Date(),
      },
    });

    return { success: true };
  }
}
