<script setup lang="ts">
import { useAuthStore } from '@web/stores/auth';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const cards = computed(() => [
  {
    label: '当前角色',
    value: authStore.activeRole?.roleName ?? '未登录',
  },
  {
    label: '权限数量',
    value: String(authStore.permissions.length),
  },
  {
    label: '待办数量',
    value: String(authStore.dashboard?.todoCount ?? 0),
  },
  {
    label: '数据范围',
    value: authStore.user?.dataScopeContext.scope ?? 'UNKNOWN',
  },
]);

async function navigate(path: string) {
  await router.push(path);
}
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">PUB-02 Dashboard</p>
      <h2>角色化首页驾驶舱空壳</h2>
      <p>
        当前展示当前用户、当前角色、权限数量、待办数量和快捷入口 mock 数据。后续业务模块可以直接复用这套登录态与权限上下文。
      </p>
    </div>

    <div class="stat-grid">
      <article v-for="card in cards" :key="card.label" class="stat-card">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">Quick Access</p>
          <h2>快捷入口</h2>
        </div>
      </div>
      <div class="shortcut-grid">
        <button
          v-for="entry in authStore.dashboard?.shortcutEntries || []"
          :key="entry.code"
          class="shortcut-card"
          type="button"
          @click="navigate(entry.path)"
        >
          <strong>{{ entry.label }}</strong>
          <span>{{ entry.path }}</span>
        </button>
      </div>
    </div>
  </section>
</template>
