import { randomBytes, randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthCaptchaResponse } from '@smw/shared';

interface CaptchaRecord {
  code: string;
  expiresAt: number;
}

@Injectable()
export class CaptchaService {
  private readonly cache = new Map<string, CaptchaRecord>();
  private readonly ttlMs = 5 * 60 * 1000;

  issueCaptcha(): AuthCaptchaResponse {
    this.cleanupExpired();

    const captchaId = randomUUID();
    const code = this.generateCode();
    const expiresAt = Date.now() + this.ttlMs;

    this.cache.set(captchaId, { code, expiresAt });

    return {
      captchaId,
      captchaSvg: this.buildSvg(code),
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  verifyCaptcha(captchaId: string, captchaCode: string) {
    this.cleanupExpired();

    const record = this.cache.get(captchaId);

    if (!record) {
      throw new UnauthorizedException('验证码已失效，请刷新后重试');
    }

    this.cache.delete(captchaId);

    if (record.code !== captchaCode.trim().toUpperCase()) {
      throw new UnauthorizedException('验证码错误');
    }
  }

  private generateCode() {
    return randomBytes(4)
      .toString('hex')
      .slice(0, 4)
      .toUpperCase();
  }

  private buildSvg(code: string) {
    const text = code
      .split('')
      .map(
        (char, index) =>
          `<text x="${20 + index * 28}" y="${34 + (index % 2 === 0 ? 2 : -2)}" fill="#0f4c81" font-size="24" font-family="monospace" font-weight="700">${char}</text>`,
      )
      .join('');

    return `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="48" viewBox="0 0 140 48">
        <rect width="140" height="48" rx="10" fill="#f4f8fb" />
        <path d="M6 32 C24 10, 42 44, 60 20 S96 36, 134 14" stroke="#9abed7" stroke-width="2" fill="none" />
        ${text}
      </svg>`,
    )}`;
  }

  private cleanupExpired() {
    const now = Date.now();

    for (const [captchaId, record] of this.cache.entries()) {
      if (record.expiresAt <= now) {
        this.cache.delete(captchaId);
      }
    }
  }
}
