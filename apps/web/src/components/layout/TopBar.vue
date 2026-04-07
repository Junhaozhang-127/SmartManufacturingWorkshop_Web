<script setup lang="ts">
import { useAuthStore } from '@web/stores/auth';
import { ElMessage } from 'element-plus';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const switchingRole = ref(false);
const selectedRoleCode = ref(authStore.activeRoleCode);

watch(
  () => authStore.activeRoleCode,
  (value) => {
    selectedRoleCode.value = value;
  },
  { immediate: true },
);

watch(selectedRoleCode, (value) => {
  if (!value || value === authStore.activeRoleCode) {
    return;
  }

  void (async () => {
    try {
      switchingRole.value = true;
      await authStore.switchRole(value);
      ElMessage.success('已切换角色');
      await router.push('/');
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '角色切换失败');
    } finally {
      switchingRole.value = false;
    }
  })();
});

async function goChangePassword() {
  await router.push('/change-password');
}

async function logout() {
  authStore.logout();
  await router.push('/login');
}
</script>

<template>
  <header class="topbar">
    <div>
      <p class="topbar__eyebrow">Lab Management Foundation</p>
      <h1 class="topbar__title">实验室管理系统</h1>
    </div>
    <div class="topbar__actions">
      <el-select
        v-model="selectedRoleCode"
        :loading="switchingRole"
        class="topbar__role-select"
        placeholder="切换角色"
      >
        <el-option
          v-for="role in authStore.roleOptions"
          :key="role.roleCode"
          :label="`${role.roleName} / ${role.dataScope}`"
          :value="role.roleCode"
        />
      </el-select>
      <div class="topbar__identity">
        <strong>{{ authStore.displayName }}</strong>
        <span>{{ authStore.orgProfile?.orgUnitName || '未绑定组织' }}</span>
      </div>
      <el-button plain @click="goChangePassword">修改密码</el-button>
      <el-button type="primary" plain @click="logout">退出登录</el-button>
    </div>
  </header>
</template>
