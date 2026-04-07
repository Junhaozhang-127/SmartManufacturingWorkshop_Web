import type {
  AuthCaptchaResponse,
  AuthLoginRequest,
  AuthLoginResponse,
  ChangePasswordRequest,
  CurrentUserProfile,
  SwitchRoleRequest,
} from '@smw/shared';

import { http } from './client';

export async function fetchCaptcha() {
  return http.get<never, { data: AuthCaptchaResponse }>('/auth/captcha');
}

export async function login(payload: AuthLoginRequest) {
  return http.post<never, { data: AuthLoginResponse }>('/auth/login', payload);
}

export async function fetchCurrentUser() {
  return http.get<never, { data: CurrentUserProfile }>('/auth/me');
}

export async function switchRole(payload: SwitchRoleRequest) {
  return http.post<never, { data: AuthLoginResponse }>('/auth/switch-role', payload);
}

export async function changePassword(payload: ChangePasswordRequest) {
  return http.post<never, { data: { success: boolean } }>('/auth/change-password', payload);
}
