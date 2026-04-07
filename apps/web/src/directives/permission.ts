import type { PermissionCode } from '@smw/shared';
import { useAuthz } from '@web/composables/useAuthz';
import type { Directive } from 'vue';

export const vPermission: Directive<HTMLElement, PermissionCode | PermissionCode[]> = {
  mounted(el, binding) {
    const { hasPermission, hasAnyPermission } = useAuthz();
    const value = binding.value;
    const visible = Array.isArray(value) ? hasAnyPermission(value) : hasPermission(value);

    if (!visible) {
      el.parentNode?.removeChild(el);
    }
  },
};
