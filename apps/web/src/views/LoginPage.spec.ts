import { randomUUID } from 'node:crypto';

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import LoginPage from './LoginPage.vue';

const storeLogin = vi.fn();
const routerPush = vi.fn();
const messageError = vi.fn();
const messageSuccess = vi.fn();

vi.mock('@web/stores/auth', () => ({
  useAuthStore: () => ({
    login: (...args: unknown[]) => storeLogin(...args),
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: {},
  }),
  useRouter: () => ({
    push: (...args: unknown[]) => routerPush(...args),
  }),
}));

vi.mock('element-plus', () => ({
  ElMessage: {
    error: (...args: unknown[]) => messageError(...args),
    success: (...args: unknown[]) => messageSuccess(...args),
  },
}));

// eslint-disable-next-line vue/one-component-per-file
const ElInputStub = defineComponent({
  name: 'ElInputStub',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        value: props.modelValue,
        onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
      });
  },
});

// eslint-disable-next-line vue/one-component-per-file
const ElButtonStub = defineComponent({
  name: 'ElButtonStub',
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click'],
  template: '<button :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>',
});

// eslint-disable-next-line vue/one-component-per-file
const ElFormStub = defineComponent({
  name: 'ElFormStub',
  emits: ['submit'],
  template: '<form @submit.prevent="$emit(\'submit\')"><slot /></form>',
});

// eslint-disable-next-line vue/one-component-per-file
const ElFormItemStub = defineComponent({
  name: 'ElFormItemStub',
  props: {
    label: {
      type: String,
      default: '',
    },
  },
  template: '<label><span>{{ label }}</span><slot /></label>',
});

function mountPage() {
  return mount(LoginPage, {
    global: {
      stubs: {
        ElInput: ElInputStub,
        ElButton: ElButtonStub,
        ElForm: ElFormStub,
        ElFormItem: ElFormItemStub,
      },
    },
  });
}

describe('LoginPage', () => {
  beforeEach(() => {
    storeLogin.mockReset();
    routerPush.mockReset();
    messageError.mockReset();
    messageSuccess.mockReset();
  });

  it('submits username and password and redirects to dashboard', async () => {
    const username = `user_${randomUUID().slice(0, 8)}`;
    const password = randomUUID();

    storeLogin.mockResolvedValue({
      forcePasswordChange: false,
    });

    const wrapper = mountPage();
    await wrapper.findAll('input')[0]?.setValue(username);
    await wrapper.findAll('input')[1]?.setValue(password);
    await wrapper.find('.login-card__submit').trigger('click');

    expect(storeLogin).toHaveBeenCalledWith({
      username,
      password,
    });
    expect(messageSuccess).toHaveBeenCalledWith('登录成功');
    expect(routerPush).toHaveBeenCalledWith('/');
  });

  it('shows an error when login fails', async () => {
    const username = `user_${randomUUID().slice(0, 8)}`;
    const password = randomUUID();

    storeLogin.mockRejectedValue(new Error('Request failed with status code 500'));

    const wrapper = mountPage();
    await wrapper.findAll('input')[0]?.setValue(username);
    await wrapper.findAll('input')[1]?.setValue(password);
    await wrapper.find('.login-card__submit').trigger('click');

    expect(messageError).toHaveBeenCalledWith('Request failed with status code 500');
  });
});
