import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { type CurrentUserProfile, DataScope, RoleCode } from '@smw/shared';
import bcrypt from 'bcryptjs';

import type { PrismaService } from '../prisma/prisma.service';
import type { AccessControlService } from './access-control.service';
import type { AccessTokenService } from './access-token.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const builtProfile: CurrentUserProfile = {
    id: '1',
    username: 'teacher01',
    displayName: 'Teacher One',
    statusCode: 'ACTIVE',
    activeRole: {
      roleCode: RoleCode.TEACHER,
      roleName: 'Teacher',
      dataScope: DataScope.ALL,
    },
    roleOptions: [],
    permissions: [],
    forcePasswordChange: false,
    orgProfile: {
      orgUnitId: null,
      orgUnitName: null,
      departmentId: null,
      departmentName: null,
      groupId: null,
      groupName: null,
      positionCode: null,
    },
    dataScopeContext: {
      scope: DataScope.ALL,
      userId: '1',
      orgUnitId: null,
      departmentId: null,
      departmentAndDescendantIds: [],
      groupId: null,
      selfUserIds: ['1'],
      participatingUserIds: ['1'],
    },
    dashboard: {
      todoCount: 0,
      shortcutEntries: [],
    },
  };

  function createUser(overrides?: Partial<Record<string, unknown>>) {
    return {
      id: 1n,
      username: 'teacher01',
      passwordHash: 'hash-1',
      isDeleted: false,
      statusCode: 'ACTIVE',
      forcePasswordChange: false,
      userRoles: [
        {
          role: {
            roleCode: RoleCode.TEACHER,
            roleName: 'Teacher',
            dataScope: DataScope.ALL,
            sortNo: 10,
          },
        },
      ],
      member: null,
      ...overrides,
    };
  }

  function createService(options?: {
    loginUser?: ReturnType<typeof createUser> | null;
    switchRoleUser?: Record<string, unknown> | null;
  }) {
    const switchRoleUser =
      options && 'switchRoleUser' in options
        ? options.switchRoleUser
        : createUser({
            userRoles: [
              {
                role: {
                  roleCode: RoleCode.MEMBER,
                  roleName: 'Member',
                  dataScope: DataScope.SELF_PARTICIPATE,
                  sortNo: 10,
                },
              },
              {
                role: {
                  roleCode: RoleCode.GROUP_LEADER,
                  roleName: 'Group Leader',
                  dataScope: DataScope.GROUP_PROJECT,
                  sortNo: 20,
                },
              },
            ],
          });

    const prisma = {
      sysUser: {
        update: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn().mockResolvedValue(switchRoleUser),
      },
    };

    const accessControlService = {
      loadUserByUsername: jest.fn().mockResolvedValue(options?.loginUser ?? createUser()),
      buildCurrentUserProfile: jest.fn().mockResolvedValue(builtProfile),
      loadCurrentUser: jest.fn(),
    };

    const accessTokenService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };

    return {
      service: new AuthService(
        prisma as unknown as PrismaService,
        accessControlService as unknown as AccessControlService,
        accessTokenService as unknown as AccessTokenService,
      ),
      prisma,
      accessControlService,
      accessTokenService,
    };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs in successfully and updates last login time', async () => {
    const { service, prisma, accessControlService, accessTokenService } = createService();
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

    const result = await service.login({
      username: 'teacher01',
      password: '123456',
    });

    expect(accessControlService.loadUserByUsername).toHaveBeenCalledWith('teacher01');
    expect(prisma.sysUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      }),
    );
    expect(accessTokenService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: '1',
        username: 'teacher01',
        activeRoleCode: RoleCode.TEACHER,
        roleCodes: [RoleCode.TEACHER],
      }),
    );
    expect(result).toEqual({
      token: 'signed-token',
      user: builtProfile,
    });
  });

  it('falls back to MEMBER when the user has no roles during login', async () => {
    const { service, accessTokenService } = createService({
      loginUser: createUser({ userRoles: [] }),
    });
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

    await service.login({
      username: 'teacher01',
      password: '123456',
    });

    expect(accessTokenService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        activeRoleCode: RoleCode.MEMBER,
        roleCodes: [],
      }),
    );
  });

  it('rejects login when account is unavailable', async () => {
    const { service } = createService({ loginUser: null });

    await expect(
      service.login({
        username: 'ghost',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects login when password does not match', async () => {
    const { service } = createService();
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

    await expect(
      service.login({
        username: 'teacher01',
        password: 'bad-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('switches role for a valid granted role', async () => {
    const { service, accessTokenService, accessControlService } = createService();

    const result = await service.switchRole('1', RoleCode.GROUP_LEADER);

    expect(accessTokenService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: '1',
        activeRoleCode: RoleCode.GROUP_LEADER,
        roleCodes: [RoleCode.MEMBER, RoleCode.GROUP_LEADER],
      }),
    );
    expect(accessControlService.buildCurrentUserProfile).toHaveBeenCalledWith(
      expect.anything(),
      RoleCode.GROUP_LEADER,
    );
    expect(result.token).toBe('signed-token');
  });

  it('rejects switchRole when target role is not assigned to the user', async () => {
    const { service } = createService();

    await expect(service.switchRole('1', RoleCode.MINISTER)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects switchRole when user is unavailable', async () => {
    const { service } = createService({ switchRoleUser: null });

    await expect(service.switchRole('1', RoleCode.GROUP_LEADER)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('changes password and clears force-password-change flag', async () => {
    const { service, prisma } = createService();
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('new-hash'));

    const result = await service.changePassword('1', {
      currentPassword: '123456',
      newPassword: '654321',
    });

    expect(prisma.sysUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1n },
        data: expect.objectContaining({
          passwordHash: 'new-hash',
          forcePasswordChange: false,
          passwordChangedAt: expect.any(Date),
        }),
      }),
    );
    expect(result).toEqual({ success: true });
  });

  it('rejects changePassword when current password is wrong', async () => {
    const { service } = createService();
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

    await expect(
      service.changePassword('1', {
        currentPassword: 'bad-password',
        newPassword: '654321',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects changePassword when new password equals current password', async () => {
    const { service } = createService();
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

    await expect(
      service.changePassword('1', {
        currentPassword: '123456',
        newPassword: '123456',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
