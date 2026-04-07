import type { CurrentUserProfile } from '@smw/shared';

export interface PersistedAuthState {
  token: string;
  user: CurrentUserProfile | null;
}

const STORAGE_KEY = 'smw-web-auth';

export function readPersistedAuthState(): PersistedAuthState {
  if (typeof localStorage === 'undefined') {
    return { token: '', user: null };
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return { token: '', user: null };
  }

  try {
    return JSON.parse(raw) as PersistedAuthState;
  } catch {
    return { token: '', user: null };
  }
}

export function writePersistedAuthState(state: PersistedAuthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearPersistedAuthState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getStoredAccessToken() {
  return readPersistedAuthState().token;
}
