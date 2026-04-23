import { onBeforeUnmount, onMounted, ref } from 'vue';

export function useIsMobile(breakpointPx = 768) {
  const isMobile = ref(false);

  let mediaQuery: MediaQueryList | null = null;
  const update = () => {
    isMobile.value = mediaQuery ? mediaQuery.matches : window.innerWidth <= breakpointPx;
  };

  onMounted(() => {
    mediaQuery = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    update();
    mediaQuery.addEventListener('change', update);
  });

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener('change', update);
  });

  return { isMobile };
}

