import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AccessControlService } from './access-control.service';
import { AccessTokenService } from './access-token.service';
import { AUTH_TOKEN_COOKIE, parseCookieValue } from './auth.cookie';
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

    if (!authorization?.startsWith('Bearer ') && !parseCookieValue(request.headers.cookie, AUTH_TOKEN_COOKIE)) {
      throw new UnauthorizedException('缺少访问令牌');
    }

    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : (parseCookieValue(request.headers.cookie, AUTH_TOKEN_COOKIE) ?? '');
    const payload = this.accessTokenService.verify(token);
    request.currentUser = await this.accessControlService.loadCurrentUser(payload);
    request.accessToken = token;

    return true;
  }
}
