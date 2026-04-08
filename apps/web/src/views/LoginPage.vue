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
  { username: 'teacher01', label: 'Teacher', org: 'Global View' },
  { username: 'leader01', label: 'Lab Leader', org: 'Lab' },
  { username: 'minister01', label: 'Minister', org: 'R&D Department' },
  { username: 'hybrid01', label: 'Minister / Group Leader', org: 'R&D / Frontend Group' },
  { username: 'member01', label: 'Member', org: 'Frontend Group' },
];

async function submit() {
  try {
    loading.value = true;

    const user = await authStore.login({
      username: form.username,
      password: form.password,
    });

    ElMessage.success('Login successful');

    if (user.forcePasswordChange) {
      await router.push('/change-password');
      return;
    }

    await router.push(String(route.query.redirect || '/'));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Login failed');
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
      <h1>Workshop Management System Login</h1>
      <p>
        This version already integrates unified login, role switching, RBAC, and data-scope control.
        After login, the home page, menu, and business data switch automatically with the active role.
      </p>
      <div class="login-page__chips">
        <span>Vue 3 + Pinia + Element Plus</span>
        <span>NestJS + Prisma + MySQL</span>
        <span>RBAC + Data Scope</span>
      </div>
    </section>

    <section class="login-card">
      <div class="login-card__header">
        <h2>PUB-01 Login</h2>
        <p>Default password is `123456`. First-time users will be redirected to change their password.</p>
      </div>

      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="Username">
          <el-input v-model="form.username" placeholder="teacher01 / hybrid01 / member01" />
        </el-form-item>

        <el-form-item label="Password">
          <el-input v-model="form.password" show-password type="password" />
        </el-form-item>

        <el-button :loading="loading" class="login-card__submit" type="primary" @click="submit">
          Login
        </el-button>
      </el-form>

      <div class="login-card__accounts">
        <h3>Seed Accounts</h3>
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
