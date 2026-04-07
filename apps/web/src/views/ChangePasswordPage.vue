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
  currentPassword: '123456',
  newPassword: '',
  confirmPassword: '',
});

async function submit() {
  if (form.newPassword !== form.confirmPassword) {
    ElMessage.error('两次输入的新密码不一致');
    return;
  }

  try {
    loading.value = true;
    await authStore.changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
    ElMessage.success('密码修改成功');
    await authStore.fetchMe();
    await router.push(String(route.query.redirect || '/'));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '密码修改失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="password-page">
    <section class="password-card">
      <p class="login-page__eyebrow">First Login Security</p>
      <h1>修改登录密码</h1>
      <p>
        {{ authStore.forcePasswordChange ? '当前账号为首次登录，修改密码后才可进入系统。' : '您可以在此更新登录密码。' }}
      </p>

      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="当前密码">
          <el-input v-model="form.currentPassword" show-password type="password" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="form.newPassword" show-password type="password" />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input v-model="form.confirmPassword" show-password type="password" />
        </el-form-item>
        <el-button :loading="loading" class="login-card__submit" type="primary" @click="submit">
          提交修改
        </el-button>
      </el-form>
    </section>
  </div>
</template>
