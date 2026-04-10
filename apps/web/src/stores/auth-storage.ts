import type { CurrentUserProfile } from '@smw/shared';

export interface PersistedAuthState {
  token: string;
  user: CurrentUserProfile | null;
}

const STORAGE_KEY = 'smw-web-auth';
const LEGACY_TOKEN_KEYS = ['token', 'accessToken', 'refreshToken'] as const;

function removeFromWebStorage(key: string) {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(key);
  }
}

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
  removeFromWebStorage(STORAGE_KEY);
  LEGACY_TOKEN_KEYS.forEach((key) => removeFromWebStorage(key));
}

export function getStoredAccessToken() {
  return readPersistedAuthState().token;
}
