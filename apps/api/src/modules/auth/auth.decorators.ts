import type { ExecutionContext} from '@nestjs/common';
import { createParamDecorator, SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@smw/shared';

import type { AuthenticatedRequest } from './auth.types';

export const PERMISSIONS_KEY = 'permissions';
export const DATA_SCOPE_KEY = 'data-scope';

export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireDataScope = () => SetMetadata(DATA_SCOPE_KEY, true);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.currentUser;
});

export const DataScopeContextParam = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.dataScopeContext;
});
