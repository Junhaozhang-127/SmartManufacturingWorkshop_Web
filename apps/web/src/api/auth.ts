import { http } from './client';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    roleCodes: string[];
    permissions: string[];
    orgUnitName: string;
  };
}

export async function mockLogin(payload: LoginPayload) {
  return http.post<never, { data: LoginResult }>('/auth/mock-login', payload);
}
