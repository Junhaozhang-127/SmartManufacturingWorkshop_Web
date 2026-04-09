<script setup lang="ts">
import { register } from '@web/api/auth';
import { ElMessage } from 'element-plus';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);

const form = reactive({
  username: '',
  displayName: '',
  password: '',
  confirmPassword: '',
});

async function submit() {
  if (!form.username.trim() || !form.displayName.trim() || !form.password) {
    ElMessage.error('请填写完整信息');
    return;
  }

  if (form.password !== form.confirmPassword) {
    ElMessage.error('两次输入的密码不一致');
    return;
  }

  try {
    loading.value = true;

    await register({
      username: form.username.trim(),
      password: form.password,
      displayName: form.displayName.trim(),
    });

    ElMessage.success('注册成功，请登录');
    await router.push('/login');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '注册失败');
  } finally {
    loading.value = false;
  }
}

function backToLogin() {
  router.push('/login');
}
</script>

<template>
  <div class="login-page">
    <section class="login-page__hero">
      <p class="login-page__eyebrow">智能制造工坊</p>
      <h1>账号注册</h1>
      <p>注册成功后将默认授予“实习生”角色。</p>
      <div class="login-page__chips">
        <span>仅创建账号</span>
        <span>默认实习生</span>
        <span>注册后可登录</span>
      </div>
    </section>

    <section class="login-card">
      <div class="login-card__header">
        <h2>注册入口</h2>
        <p>请填写账号、姓名与密码。</p>
      </div>

      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="账号">
          <el-input v-model="form.username" autocomplete="username" placeholder="请输入账号" />
        </el-form-item>

        <el-form-item label="姓名">
          <el-input v-model="form.displayName" autocomplete="name" placeholder="请输入姓名" />
        </el-form-item>

        <el-form-item label="密码">
          <el-input v-model="form.password" autocomplete="new-password" show-password type="password" />
        </el-form-item>

        <el-form-item label="确认密码">
          <el-input v-model="form.confirmPassword" autocomplete="new-password" show-password type="password" />
        </el-form-item>

        <el-button :loading="loading" class="login-card__submit" type="primary" @click="submit">注册</el-button>
        <el-button :disabled="loading" class="login-card__submit" plain @click="backToLogin">返回登录</el-button>
      </el-form>
    </section>
  </div>
</template>

