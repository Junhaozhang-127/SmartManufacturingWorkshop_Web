import { PrismaService } from '@api/modules/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type AuthLoginRequest, type ChangePasswordRequest, RoleCode } from '@smw/shared';
import bcrypt from 'bcryptjs';

import { AccessControlService } from './access-control.service';
import { AccessTokenService } from './access-token.service';
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
