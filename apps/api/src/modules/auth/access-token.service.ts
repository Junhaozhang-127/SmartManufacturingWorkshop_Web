import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AccessTokenPayload } from '@smw/shared';

interface AccessTokenPayloadInput {
  sub: string;
  username: string;
  activeRoleCode: AccessTokenPayload['activeRoleCode'];
  roleCodes: AccessTokenPayload['roleCodes'];
  scopeVersion: number;
}

@Injectable()
export class AccessTokenService {
  private readonly secret: string;
  private readonly ttlSeconds: number;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.configService.getOrThrow<string>('AUTH_TOKEN_SECRET');
    this.ttlSeconds = Number(this.configService.getOrThrow<string>('AUTH_TOKEN_TTL_SECONDS'));
  }

  sign(payload: AccessTokenPayloadInput) {
    const fullPayload: AccessTokenPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + this.ttlSeconds,
    };

    const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));
    const signature = this.createSignature(encodedPayload);

    return `${encodedPayload}.${signature}`;
  }

  verify(token: string) {
    const [encodedPayload, signature] = token.split('.');

    if (!encodedPayload || !signature) {
      throw new UnauthorizedException('无效的访问令牌');
    }

    const expectedSignature = this.createSignature(encodedPayload);

    if (!this.safeCompare(signature, expectedSignature)) {
      throw new UnauthorizedException('访问令牌签名无效');
    }

    const payload = JSON.parse(this.base64UrlDecode(encodedPayload)) as AccessTokenPayload;

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('访问令牌已过期');
    }

    return payload;
  }

  private createSignature(value: string) {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }

  private safeCompare(left: string, right: string) {
    if (left.length !== right.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(left), Buffer.from(right));
  }

  private base64UrlEncode(value: string) {
    return Buffer.from(value, 'utf8').toString('base64url');
  }

  private base64UrlDecode(value: string) {
    return Buffer.from(value, 'base64url').toString('utf8');
  }
}
