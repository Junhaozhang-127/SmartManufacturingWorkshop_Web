<script setup lang="ts">
import { fetchCaptcha } from '@web/api/auth';
import { useAuthStore } from '@web/stores/auth';
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const loading = ref(false);
const captchaLoading = ref(false);
const captchaSvg = ref('');
const captchaId = ref('');

const form = reactive({
  username: 'teacher01',
  password: '123456',
  captchaCode: '',
});

const demoAccounts = [
  { username: 'teacher01', label: '老师', org: '全局视角' },
  { username: 'leader01', label: '实验室负责人', org: '实验室' },
  { username: 'minister01', label: '部长', org: '研发部' },
  { username: 'hybrid01', label: '部长 / 组长', org: '研发部 / 前端组' },
  { username: 'member01', label: '成员', org: '前端组' },
];

async function refreshCaptcha() {
  try {
    captchaLoading.value = true;
    const response = await fetchCaptcha();
    captchaSvg.value = response.data.captchaSvg;
    captchaId.value = response.data.captchaId;
    form.captchaCode = '';
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '验证码加载失败');
  } finally {
    captchaLoading.value = false;
  }
}

async function submit() {
  try {
    loading.value = true;
    const user = await authStore.login({
      username: form.username,
      password: form.password,
      captchaId: captchaId.value,
      captchaCode: form.captchaCode,
    });

    ElMessage.success('登录成功');

    if (user.forcePasswordChange) {
      await router.push('/change-password');
      return;
    }

    await router.push(String(route.query.redirect || '/'));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败');
    await refreshCaptcha();
  } finally {
    loading.value = false;
  }
}

function useAccount(username: string) {
  form.username = username;
  form.password = '123456';
}

onMounted(async () => {
  await refreshCaptcha();
});
</script>

<template>
  <div class="login-page">
    <section class="login-page__hero">
      <p class="login-page__eyebrow">Smart Manufacturing Workshop</p>
      <h1>实验室管理系统登录</h1>
      <p>
        本次版本完成登录鉴权、角色切换、RBAC 与数据范围控制底座。登录后首页、菜单和数据集合都会随当前角色变化。
      </p>
      <div class="login-page__chips">
        <span>Vue 3 + Pinia + Element Plus</span>
        <span>NestJS + Prisma + MySQL</span>
        <span>RBAC + Data Scope</span>
      </div>
    </section>

    <section class="login-card">
      <div class="login-card__header">
        <h2>PUB-01 登录页</h2>
        <p>默认密码统一为 `123456`，首次登录用户会被引导修改密码。</p>
      </div>
      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="账号">
          <el-input v-model="form.username" placeholder="teacher01 / hybrid01 / member01" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" show-password type="password" />
        </el-form-item>
        <el-form-item label="验证码">
          <div class="captcha-row">
            <el-input v-model="form.captchaCode" maxlength="8" placeholder="请输入验证码" />
            <button class="captcha-box" type="button" @click="refreshCaptcha">
              <img v-if="captchaSvg" :src="captchaSvg" alt="验证码" />
              <span v-else>{{ captchaLoading ? '加载中...' : '刷新验证码' }}</span>
            </button>
          </div>
        </el-form-item>
        <el-button :loading="loading" class="login-card__submit" type="primary" @click="submit">
          登录系统
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
