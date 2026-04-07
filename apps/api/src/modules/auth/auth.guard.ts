import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AccessControlService } from './access-control.service';
import { AccessTokenService } from './access-token.service';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly accessTokenService: AccessTokenService,
    private readonly accessControlService: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少访问令牌');
    }

    const token = authorization.slice('Bearer '.length);
    const payload = this.accessTokenService.verify(token);
    request.currentUser = await this.accessControlService.loadCurrentUser(payload);

    return true;
  }
}
