import { mockLogin } from '@web/api/auth';
import { defineStore } from 'pinia';

interface AuthState {
  token: string;
  displayName: string;
  username: string;
  roleCodes: string[];
  permissions: string[];
  orgUnitName: string;
}

const STORAGE_KEY = 'smw-web-auth';

function readPersistedState(): AuthState {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {
      token: '',
      displayName: '',
      username: '',
      roleCodes: [],
      permissions: [],
      orgUnitName: '',
    };
  }

  return JSON.parse(raw) as AuthState;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => readPersistedState(),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    persist() {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          token: this.token,
          displayName: this.displayName,
          username: this.username,
          roleCodes: this.roleCodes,
          permissions: this.permissions,
          orgUnitName: this.orgUnitName,
        }),
      );
    },
    async login(username: string, password: string) {
      const response = await mockLogin({ username, password });

      this.token = response.data.token;
      this.displayName = response.data.user.displayName;
      this.username = response.data.user.username;
      this.roleCodes = response.data.user.roleCodes;
      this.permissions = response.data.user.permissions;
      this.orgUnitName = response.data.user.orgUnitName;
      this.persist();
    },
    logout() {
      this.token = '';
      this.displayName = '';
      this.username = '';
      this.roleCodes = [];
      this.permissions = [];
      this.orgUnitName = '';
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});
