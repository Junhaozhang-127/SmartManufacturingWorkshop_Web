import { PrismaService } from '@api/modules/prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PermissionCodes } from '@smw/shared';
import bcrypt from 'bcryptjs';

import type { MockLoginDto } from './dto/mock-login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async mockLogin(payload: MockLoginDto) {
    const user = await this.prisma.sysUser.findUnique({
      where: { username: payload.username },
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
            orgUnit: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('账号不存在');
    }

    const matched = await bcrypt.compare(payload.password, user.passwordHash);

    if (!matched) {
      throw new UnauthorizedException('密码错误');
    }

    const roleCodes = user.userRoles.map((item) => item.role.roleCode);
    const permissions = roleCodes.includes('TEACHER') || roleCodes.includes('LAB_LEADER')
      ? Object.values(PermissionCodes)
      : [PermissionCodes.systemDashboardView, PermissionCodes.systemHealthView, PermissionCodes.systemLoginExecute];

    return {
      token: `mock-token-${String(user.id)}`,
      user: {
        id: String(user.id),
        username: user.username,
        displayName: user.displayName,
        roleCodes,
        permissions,
        orgUnitName: user.member?.orgUnit.unitName ?? '未绑定组织',
      },
    };
  }
}
