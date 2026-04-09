<script setup lang="ts">
import { fetchNotifications } from '@web/api/system';
import { useAuthStore } from '@web/stores/auth';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const unreadCount = ref(0);

async function goNotifications() {
  await router.push('/notifications');
}

async function logout() {
  authStore.logout();
  await router.push('/login');
}

async function loadUnreadCount() {
  try {
    const response = await fetchNotifications({ page: 1, pageSize: 1, readStatus: 'UNREAD' });
    unreadCount.value = response.data.meta.unreadCount;
  } catch {
    unreadCount.value = 0;
  }
}

onMounted(() => {
  void loadUnreadCount();
});
</script>

<template>
  <header class="topbar">
    <div>
      <p class="topbar__eyebrow">智能制造工坊</p>
      <h1 class="topbar__title">实验室管理系统</h1>
    </div>
    <div class="topbar__actions">
      <div class="topbar__identity">
        <strong>{{ authStore.displayName }}</strong>
        <span>{{ authStore.orgProfile?.orgUnitName || '未绑定组织' }}</span>
      </div>
      <el-badge :hidden="!unreadCount" :value="unreadCount" class="topbar__badge">
        <el-button plain @click="goNotifications">通知消息</el-button>
      </el-badge>
      <el-button type="primary" plain @click="logout">退出登录</el-button>
    </div>
  </header>
</template>
