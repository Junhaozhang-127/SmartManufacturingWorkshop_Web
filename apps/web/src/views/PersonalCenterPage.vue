<script setup lang="ts">
import { fetchPersonalCenter } from '@web/api/system';
import { useAuthStore } from '@web/stores/auth';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);
const savingPassword = ref(false);
const passwordFormRef = ref<FormInstance>();
const profile = ref<Awaited<ReturnType<typeof fetchPersonalCenter>>['data'] | null>(null);

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

async function load() {
  loading.value = true;
  try {
    const response = await fetchPersonalCenter();
    profile.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '个人中心加载失败');
  } finally {
    loading.value = false;
  }
}

async function navigate(path: string, query?: Record<string, string>) {
  await router.push({ path, query });
}

async function submitPasswordChange() {
  if (!passwordFormRef.value) return;
  await passwordFormRef.value.validate();

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.error('两次输入的新密码不一致');
    return;
  }

  savingPassword.value = true;
  try {
    await authStore.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
    await authStore.fetchMe();
    ElMessage.success('密码修改成功');
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '密码修改失败');
  } finally {
    savingPassword.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section v-loading="loading" class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">个人中心</p>
      <h2>个人中心</h2>
      <p>集中查看个人资料、角色信息、我的申请、我的待办与未读消息，并支持直接修改登录密码。</p>
    </div>

    <div class="dashboard-approval-grid">
      <div class="panel-card">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">个人资料</p>
            <h2>资料概览</h2>
          </div>
        </div>
        <el-descriptions v-if="profile" :column="2" border>
          <el-descriptions-item label="姓名">{{ profile.displayName }}</el-descriptions-item>
          <el-descriptions-item label="账号">{{ profile.username }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ profile.mobile || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ profile.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前组织">{{ profile.orgProfile.orgUnitName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前岗位">{{ profile.orgProfile.positionCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="最近登录">{{ profile.lastLoginAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="密码更新时间">{{ profile.passwordChangedAt || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="panel-card">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">角色信息</p>
            <h2>角色信息</h2>
          </div>
        </div>
        <div class="role-chip-grid">
          <div
            v-for="role in profile?.roles || []"
            :key="role.roleCode"
            class="sub-card"
            :class="{ 'sub-card--active': role.roleCode === profile?.activeRole.roleCode }"
          >
            <strong>{{ role.roleName }}</strong>
            <p>{{ role.roleCode }}</p>
            <p>数据范围：{{ role.dataScope }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="stat-grid dashboard-stat-grid">
      <article class="stat-card stat-card--action" @click="navigate('/notifications')">
        <span>未读消息</span>
        <strong>{{ profile?.stats.unreadNotificationCount || 0 }}</strong>
      </article>
      <article class="stat-card stat-card--action" @click="navigate('/workflow/approval-center')">
        <span>我的待办</span>
        <strong>{{ profile?.stats.pendingApprovalCount || 0 }}</strong>
      </article>
      <article class="stat-card stat-card--action" @click="navigate('/workflow/approval-center')">
        <span>我的申请</span>
        <strong>{{ profile?.stats.myApplicationCount || 0 }}</strong>
      </article>
    </div>

    <div class="dashboard-approval-grid">
      <div class="panel-card">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">我的待办</p>
            <h2>我的待办</h2>
          </div>
        </div>
        <div v-if="profile?.pendingApprovals.length" class="dashboard-list">
          <button
            v-for="item in profile.pendingApprovals"
            :key="item.id"
            class="dashboard-list__item"
            type="button"
            @click="navigate('/workflow/approval-center', { focus: item.id })"
          >
            <strong>{{ item.title }}</strong>
            <span>{{ item.currentNodeName || '待处理' }}</span>
          </button>
        </div>
        <el-empty v-else description="暂无待办" />
      </div>

      <div class="panel-card">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">我的申请</p>
            <h2>我的申请</h2>
          </div>
        </div>
        <div v-if="profile?.myApplications.length" class="dashboard-list">
          <button
            v-for="item in profile.myApplications"
            :key="item.id"
            class="dashboard-list__item"
            type="button"
            @click="navigate('/workflow/approval-center', { focus: item.id })"
          >
            <strong>{{ item.title }}</strong>
            <span>{{ item.status }}</span>
          </button>
        </div>
        <el-empty v-else description="暂无申请记录" />
      </div>
    </div>

    <div class="dashboard-approval-grid">
      <div class="panel-card">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">近期消息</p>
            <h2>最近消息</h2>
          </div>
          <el-button link type="primary" @click="navigate('/notifications')">消息中心</el-button>
        </div>
        <div v-if="profile?.recentNotifications.length" class="dashboard-list">
          <button
            v-for="item in profile.recentNotifications"
            :key="item.id"
            class="dashboard-list__item"
            type="button"
            @click="navigate(item.routePath || '/notifications', item.routeQuery || undefined)"
          >
            <strong>{{ item.title }}</strong>
            <span>{{ item.categoryCode }} / {{ item.read ? '已读' : '未读' }}</span>
          </button>
        </div>
        <el-empty v-else description="暂无消息" />
      </div>

      <div class="panel-card">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">密码设置</p>
            <h2>密码修改</h2>
          </div>
        </div>
        <el-form ref="passwordFormRef" :model="passwordForm" label-position="top">
          <el-form-item label="当前密码" :rules="[{ required: true, message: '请输入当前密码' }]">
            <el-input v-model="passwordForm.currentPassword" show-password type="password" />
          </el-form-item>
          <el-form-item label="新密码" :rules="[{ required: true, message: '请输入新密码' }]">
            <el-input v-model="passwordForm.newPassword" show-password type="password" />
          </el-form-item>
          <el-form-item label="确认新密码" :rules="[{ required: true, message: '请再次输入新密码' }]">
            <el-input v-model="passwordForm.confirmPassword" show-password type="password" />
          </el-form-item>
          <el-button type="primary" :loading="savingPassword" @click="submitPasswordChange">更新密码</el-button>
        </el-form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.role-chip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.sub-card--active {
  border-color: var(--el-color-primary);
}

.stat-card--action {
  cursor: pointer;
}
</style>
