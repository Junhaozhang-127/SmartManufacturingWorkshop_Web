import type { Response } from 'express';

export const AUTH_TOKEN_COOKIE = 'smw_token';

export function parseCookieValue(cookieHeader: string | undefined, name: string) {
  const raw = cookieHeader?.trim();
  if (!raw) return undefined;

  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (!key) continue;
    if (key === name) {
      return decodeURIComponent(rest.join('=') || '');
    }
  }

  return undefined;
}

function decodeTokenExpMs(token: string) {
  const [encodedPayload] = token.split('.');
  if (!encodedPayload) return undefined;
  const json = Buffer.from(encodedPayload, 'base64url').toString('utf8');
  const payload = JSON.parse(json) as { exp?: number };
  if (!payload?.exp) return undefined;
  return payload.exp * 1000;
}

export function setAuthTokenCookie(response: Response, token: string) {
  const expMs = decodeTokenExpMs(token);
  const maxAge = expMs ? Math.max(0, expMs - Date.now()) : undefined;

  response.cookie(AUTH_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(typeof maxAge === 'number' ? { maxAge } : {}),
  });
}

