import type {
  AuthLoginRequest,
  ChangePasswordRequest,
  CurrentUserProfile,
  RoleCode,
} from '@smw/shared';
import { changePassword, fetchCurrentUser, login, switchRole } from '@web/api/auth';
import { defineStore } from 'pinia';

import {
  clearPersistedAuthState,
  readPersistedAuthState,
  writePersistedAuthState,
} from './auth-storage';

interface AuthState {
  token: string;
  user: CurrentUserProfile | null;
  initialized: boolean;
}

function createInitialState(): AuthState {
  const persisted = readPersistedAuthState();
  return {
    token: persisted.token,
    user: persisted.user,
    initialized: false,
  };
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => createInitialState(),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    displayName: (state) => state.user?.displayName ?? '',
    username: (state) => state.user?.username ?? '',
    permissions: (state) => state.user?.permissions ?? [],
    roleOptions: (state) => state.user?.roleOptions ?? [],
    activeRole: (state) => state.user?.activeRole ?? null,
    activeRoleCode(): RoleCode | null {
      return this.activeRole?.roleCode ?? null;
    },
    forcePasswordChange: (state) => state.user?.forcePasswordChange ?? false,
    orgProfile: (state) => state.user?.orgProfile ?? null,
    dashboard: (state) => state.user?.dashboard ?? null,
  },
  actions: {
    persist() {
      writePersistedAuthState({
        token: this.token,
        user: this.user,
      });
    },
    setSession(token: string, user: CurrentUserProfile) {
      this.token = token;
      this.user = user;
      this.persist();
    },
    clearSession() {
      this.token = '';
      this.user = null;
      clearPersistedAuthState();
    },
    async initialize() {
      if (this.initialized) {
        return;
      }

      if (!this.token) {
        this.initialized = true;
        return;
      }

      try {
        await this.fetchMe();
      } catch {
        this.clearSession();
      } finally {
        this.initialized = true;
      }
    },
    async login(payload: AuthLoginRequest) {
      const response = await login(payload);
      this.setSession(response.data.token, response.data.user);
      this.initialized = true;
      return response.data.user;
    },
    async fetchMe() {
      const response = await fetchCurrentUser();
      this.user = response.data;
      this.persist();
      return response.data;
    },
    async switchRole(roleCode: RoleCode) {
      const response = await switchRole({ roleCode });
      this.setSession(response.data.token, response.data.user);
      return response.data.user;
    },
    async changePassword(payload: ChangePasswordRequest) {
      await changePassword(payload);
      if (this.user) {
        this.user = {
          ...this.user,
          forcePasswordChange: false,
        };
        this.persist();
      }
    },
    logout() {
      this.clearSession();
      this.initialized = true;
    },
  },
});
