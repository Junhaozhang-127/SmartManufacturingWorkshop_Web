<script setup lang="ts">
import { useAuthStore } from '@web/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

async function logout() {
  authStore.logout();
  await router.push('/login');
}
</script>

<template>
  <header class="topbar">
    <div>
      <p class="topbar__eyebrow">一期工程基线</p>
      <h1 class="topbar__title">实验室管理系统后台</h1>
    </div>
    <div class="topbar__actions">
      <div class="topbar__identity">
        <strong>{{ authStore.displayName }}</strong>
        <span>{{ authStore.orgUnitName }}</span>
      </div>
      <el-button type="primary" plain @click="logout">退出</el-button>
    </div>
  </header>
</template>
