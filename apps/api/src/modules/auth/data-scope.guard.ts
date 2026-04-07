import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { DATA_SCOPE_KEY } from './auth.decorators';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class DataScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const shouldInject = this.reflector.getAllAndOverride<boolean>(DATA_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!shouldInject) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.dataScopeContext = request.currentUser?.dataScopeContext;
    return true;
  }
}
