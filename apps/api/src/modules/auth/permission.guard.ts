import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionCode } from '@smw/shared';

import { AccessControlService } from './access-control.service';
import { PERMISSIONS_KEY } from './auth.decorators';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControlService: AccessControlService,
  ) {}

  canActivate(context: ExecutionContext) {
    const permissions = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!permissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.currentUser) {
      return false;
    }

    if (request.currentUser.forcePasswordChange) {
      throw new ForbiddenException('首次登录需先修改密码');
    }

    this.accessControlService.ensurePermissions(request.currentUser, permissions);
    return true;
  }
}
