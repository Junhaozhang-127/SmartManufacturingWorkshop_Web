<script setup lang="ts">
import IcpBeianFooter from '@web/components/layout/IcpBeianFooter.vue';
import { useAuthStore } from '@web/stores/auth';
import { ElMessage } from 'element-plus';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const loading = ref(false);

const form = reactive({
  username: '',
  password: '',
});

async function submit() {
  if (!form.username.trim() || !form.password) {
    ElMessage.error('请输入账号和密码');
    return;
  }

  try {
    loading.value = true;

    const user = await authStore.login({
      username: form.username.trim(),
      password: form.password,
    });

    ElMessage.success('登录成功');

    if (user.forcePasswordChange) {
      const redirect = route.query.redirect ? String(route.query.redirect) : undefined;
      await router.push(redirect ? { path: '/change-password', query: { redirect } } : '/change-password');
      return;
    }

    await router.push(String(route.query.redirect || '/'));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败');
  } finally {
    loading.value = false;
  }
}

</script>

<template>
  <div class="page-shell">
    <div class="login-page page-shell__content">
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
        <p>
          请使用已分配的账号登录。如需开通账号，请联系管理员。
          <router-link to="/register">注册账号</router-link>
        </p>
      </div>

      <el-form label-position="top" autocomplete="off" @submit.prevent="submit">
        <el-form-item label="账号">
          <el-input v-model="form.username" autocomplete="off" name="username" placeholder="请输入账号" />
        </el-form-item>

        <el-form-item label="密码">
          <el-input v-model="form.password" autocomplete="off" name="password" show-password type="password" />
        </el-form-item>

        <el-button :loading="loading" class="login-card__submit" type="primary" @click="submit">
          登录
        </el-button>
      </el-form>

    </section>
    </div>
    <IcpBeianFooter />
  </div>
</template>
