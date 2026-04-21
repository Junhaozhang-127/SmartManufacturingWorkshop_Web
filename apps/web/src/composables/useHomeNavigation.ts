import { useAuthStore } from '@web/stores/auth';
import { useRouter } from 'vue-router';

export function useHomeNavigation() {
  const authStore = useAuthStore();
  const router = useRouter();

  async function goHome(_event?: unknown) {
    const target = authStore.isAuthenticated ? '/' : '/portal';
    await router.push(target);
  }

  return { goHome };
}
