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
  { username: 'teacher01', label: '老师', org: '全局视图' },
  { username: 'minister01', label: '部长', org: '研发部' },
  { username: 'hybrid01', label: '部长 / 组长', org: '研发部 / 前端组' },
  { username: 'member01', label: '成员', org: '前端组' },
  { username: 'intern01', label: '实习生', org: '前端组' },
];

async function submit() {
  try {
    loading.value = true;

    const user = await authStore.login({
      username: form.username,
      password: form.password,
    });

    ElMessage.success('登录成功');

    if (user.forcePasswordChange) {
      await router.push('/change-password');
      return;
    }

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
      <p class="login-page__eyebrow">智能制造工坊</p>
      <h1>工坊管理系统登录</h1>
      <p>
        当前版本已经集成统一登录、角色切换、权限控制和数据范围管理。
        登录后，首页、菜单和业务数据会随当前激活角色自动切换。
      </p>
      <div class="login-page__chips">
        <span>Vue 3 + Pinia + Element Plus</span>
        <span>NestJS + Prisma + MySQL</span>
        <span>RBAC + Data Scope</span>
      </div>
    </section>

    <section class="login-card">
      <div class="login-card__header">
        <h2>登录入口</h2>
        <p>默认密码为 `123456`。首次登录的账号会自动跳转到修改密码页面。</p>
      </div>

      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="teacher01 / hybrid01 / member01 / intern01" />
        </el-form-item>

        <el-form-item label="密码">
          <el-input v-model="form.password" show-password type="password" />
        </el-form-item>

        <el-button :loading="loading" class="login-card__submit" type="primary" @click="submit">
          登录
        </el-button>
      </el-form>

      <div class="login-card__accounts">
        <h3>示例账号</h3>
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
