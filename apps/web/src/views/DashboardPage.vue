<script setup lang="ts">
import { useAuthStore } from '@web/stores/auth';
import { computed } from 'vue';

const authStore = useAuthStore();

const cards = computed(() => [
  {
    label: '当前角色',
    value: authStore.roleCodes.join(' / ') || '未登录',
  },
  {
    label: '权限条目',
    value: String(authStore.permissions.length),
  },
  {
    label: '组织范围',
    value: authStore.orgUnitName || '未绑定',
  },
]);
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">一期只做工程骨架</p>
      <h2>当前仓库已具备后台布局、统一响应、最小用户组织模型和联通验证页面。</h2>
      <p>
        后续业务模块可直接复用同一套路由约定、权限码、分页协议、Prisma schema 和 CI。
      </p>
    </div>

    <div class="stat-grid">
      <article v-for="card in cards" :key="card.label" class="stat-card">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </div>
  </section>
</template>
