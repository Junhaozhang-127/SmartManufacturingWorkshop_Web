<script setup lang="ts">
import { useAuthStore } from '@web/stores/auth';
import { ElMessage } from 'element-plus';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const loading = ref(false);

const form = reactive({
  username: 'teacher01',
  password: '123456',
});

const demoAccounts = [
  { username: 'teacher01', label: '老师', org: '全局视角' },
  { username: 'leader01', label: '实验室负责人', org: '智能制造实验室' },
  { username: 'member01', label: '成员', org: '开发方向组' },
];

async function submit() {
  try {
    loading.value = true;
    await authStore.login(form.username, form.password);
    ElMessage.success('假登录成功，已联通后端接口');
    await router.push(String(route.query.redirect || '/'));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败');
  } finally {
    loading.value = false;
  }
}

function useAccount(username: string) {
  form.username = username;
  form.password = '123456';
}
</script>

<template>
  <div class="login-page">
    <section class="login-page__hero">
      <p class="login-page__eyebrow">Smart Manufacturing Workshop</p>
      <h1>实验室管理系统工程基线</h1>
      <p>
        当前页面只验证统一登录入口、环境配置、接口联通和角色权限基线，不落任何具体业务流程。
      </p>
      <div class="login-page__chips">
        <span>Vue 3 + Pinia + Element Plus</span>
        <span>NestJS + Prisma + MySQL</span>
        <span>Redis / MinIO Reserved</span>
      </div>
    </section>

    <section class="login-card">
      <div class="login-card__header">
        <h2>假登录页</h2>
        <p>默认密码统一为 `123456`</p>
      </div>
      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="账号">
          <el-input v-model="form.username" placeholder="teacher01 / leader01 / member01" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" show-password type="password" />
        </el-form-item>
        <el-button :loading="loading" class="login-card__submit" type="primary" @click="submit">
          进入后台
        </el-button>
      </el-form>

      <div class="login-card__accounts">
        <h3>种子账号</h3>
        <button
          v-for="item in demoAccounts"
          :key="item.username"
          class="account-chip"
          type="button"
          @click="useAccount(item.username)"
        >
          <strong>{{ item.username }}</strong>
          <span>{{ item.label }} / {{ item.org }}</span>
        </button>
      </div>
    </section>
  </div>
</template>
