<script setup lang="ts">
import { fetchPersonalCenter, updatePersonalCenter, uploadProfileAvatar } from '@web/api/system';
import { useAuthStore } from '@web/stores/auth';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);
const savingPassword = ref(false);
const passwordFormRef = ref<FormInstance>();
const profile = ref<Awaited<ReturnType<typeof fetchPersonalCenter>>['data'] | null>(null);

const editingProfile = ref(false);
const savingProfile = ref(false);
const profileFormRef = ref<FormInstance>();
const profileForm = reactive({
  displayName: '',
  studentNo: '',
  mobile: '',
  email: '',
});

const localAvatarUrl = ref('');
const tempAvatarUrl = ref('');
const tempAvatarFile = ref<File | null>(null);

const avatarHeaderUrl = computed(() => localAvatarUrl.value || profile.value?.avatarUrl || '');
const avatarEditorPreviewUrl = computed(() => tempAvatarUrl.value || localAvatarUrl.value || profile.value?.avatarUrl || '');
const studentNoDisplay = computed(() => profile.value?.studentNo || '-');

function normalizeAvatarUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return url;

  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

const avatarSrc = computed(() => normalizeAvatarUrl(avatarHeaderUrl.value));
const avatarPreviewSrc = computed(() => normalizeAvatarUrl(avatarEditorPreviewUrl.value));

const avatarText = computed(() => {
  const name = profile.value?.displayName || authStore.displayName || authStore.username || '';
  return name.trim().slice(0, 1) || 'U';
});

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
    localAvatarUrl.value = '';
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '个人中心加载失败');
  } finally {
    loading.value = false;
  }
}

function openProfileEditor() {
  if (!profile.value) return;
  profileForm.displayName = profile.value.displayName || '';
  profileForm.studentNo = profile.value.studentNo || '';
  profileForm.mobile = profile.value.mobile || '';
  profileForm.email = profile.value.email || '';
  editingProfile.value = true;
  void nextTick(() => {
    profileFormRef.value?.clearValidate();
  });
}

function closeProfileEditor() {
  editingProfile.value = false;
  if (tempAvatarUrl.value) {
    URL.revokeObjectURL(tempAvatarUrl.value);
    tempAvatarUrl.value = '';
  }
  tempAvatarFile.value = null;
  void nextTick(() => {
    profileFormRef.value?.clearValidate();
  });
}

function handleAvatarChange(file: { raw?: File } | undefined) {
  const raw = file?.raw;
  if (!raw) return;
  if (!raw.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件作为头像');
    return;
  }

  if (tempAvatarUrl.value) {
    URL.revokeObjectURL(tempAvatarUrl.value);
  }
  tempAvatarFile.value = raw;
  tempAvatarUrl.value = URL.createObjectURL(raw);
}

async function submitProfileChange() {
  if (!profileFormRef.value || !profile.value) return;
  await profileFormRef.value.validate();

  savingProfile.value = true;
  try {
    let avatarStorageKey: string | undefined;
    let avatarFileName: string | undefined;

    if (tempAvatarFile.value) {
      const uploadResponse = await uploadProfileAvatar(tempAvatarFile.value);
      avatarStorageKey = uploadResponse.data.storageKey;
      avatarFileName = uploadResponse.data.fileName;
    }

    await updatePersonalCenter({
      displayName: profileForm.displayName.trim(),
      studentNo: profileForm.studentNo.trim() || undefined,
      mobile: profileForm.mobile.trim() || undefined,
      email: profileForm.email.trim() || undefined,
      avatarStorageKey,
      avatarFileName,
    });

    // 头像上传后端返回 downloadUrl，但这里仍以 reload 的 profile.avatarUrl 为准，避免本地状态与后端不一致。
    if (tempAvatarUrl.value) {
      URL.revokeObjectURL(tempAvatarUrl.value);
      tempAvatarUrl.value = '';
    }
    tempAvatarFile.value = null;
    ElMessage.success('个人信息已更新');
    editingProfile.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '信息修改失败');
  } finally {
    savingProfile.value = false;
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
    <div class="stat-grid dashboard-stat-grid page-top-stats">
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

    <div class="panel-card personal-center-card">
      <div class="panel-card__header personal-center-card__header">
        <div class="personal-center-card__user">
          <el-avatar :size="48" class="personal-center-card__avatar" :src="avatarSrc">{{ avatarText }}</el-avatar>
          <div>
            <p class="panel-card__eyebrow">个人中心</p>
            <h2 class="personal-center-card__title">{{ profile?.displayName || authStore.displayName || '-' }}</h2>
          </div>
        </div>
        <el-button type="primary" :disabled="!profile" @click="openProfileEditor">信息修改</el-button>
      </div>

      <div class="personal-center-card__content">
        <div class="personal-center-card__section">
          <div class="personal-center-card__sectionHeader">
            <p class="panel-card__eyebrow">个人资料</p>
            <h3 class="personal-center-card__sectionTitle">基本信息</h3>
          </div>
          <el-descriptions v-if="profile" :column="2" border>
            <el-descriptions-item label="姓名">{{ profile.displayName }}</el-descriptions-item>
            <el-descriptions-item label="学号">{{ studentNoDisplay }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{ profile.mobile || '-' }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ profile.email || '-' }}</el-descriptions-item>
            <el-descriptions-item label="当前组织">{{ profile.orgProfile.orgUnitName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="当前岗位">{{ profile.orgProfile.positionCode || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="personal-center-card__section">
          <div class="personal-center-card__sectionHeader">
            <p class="panel-card__eyebrow">角色信息</p>
            <h3 class="personal-center-card__sectionTitle">角色列表</h3>
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

    <el-dialog
      v-model="editingProfile"
      title="统一编辑个人信息"
      width="560px"
      :close-on-click-modal="false"
      @close="closeProfileEditor"
    >
      <el-form ref="profileFormRef" :model="profileForm" label-position="top">
        <div class="profile-editor__avatar">
          <el-avatar :size="72" :src="avatarPreviewSrc">{{ avatarText }}</el-avatar>
          <el-upload
            accept="image/*"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleAvatarChange"
          >
            <el-button>选择头像</el-button>
          </el-upload>
          <p class="profile-editor__hint">支持新增/替换头像，保存后生效。</p>
        </div>
        <el-form-item
          label="姓名"
          prop="displayName"
          :rules="[{ required: true, message: '请输入姓名', trigger: 'blur' }]"
        >
          <el-input v-model="profileForm.displayName" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="学号" prop="studentNo">
          <el-input v-model="profileForm.studentNo" maxlength="32" />
        </el-form-item>
        <el-form-item label="手机号" prop="mobile">
          <el-input v-model="profileForm.mobile" maxlength="11" />
          <p class="profile-editor__tip">手机号建议填写中国大陆常用手机号</p>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="profileForm.email" maxlength="100" />
          <p class="profile-editor__tip">邮箱建议填写常用邮箱地址</p>
        </el-form-item>
        <el-form-item label="当前组织">
          <el-input :model-value="profile?.orgProfile.orgUnitName || '-'" disabled />
        </el-form-item>
        <el-form-item label="当前岗位">
          <el-input :model-value="profile?.orgProfile.positionCode || '-'" disabled />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="savingProfile" @click="closeProfileEditor">取消</el-button>
        <el-button type="primary" :loading="savingProfile" @click="submitProfileChange">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.page-top-stats {
  margin-top: 4px;
}

.personal-center-card__header {
  gap: 16px;
}

.personal-center-card__user {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.personal-center-card__title {
  margin: 0;
}

.personal-center-card__content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}

.personal-center-card :deep(.el-descriptions) {
  width: 100%;
}

.personal-center-card :deep(.el-descriptions__table) {
  width: 100%;
  table-layout: fixed;
}

.personal-center-card :deep(.el-descriptions__label) {
  width: 120px;
}

.personal-center-card :deep(.el-descriptions__cell) {
  word-break: break-word;
}

.personal-center-card__sectionHeader {
  margin-bottom: 12px;
}

.personal-center-card__sectionTitle {
  margin: 4px 0 0;
  font-size: 16px;
  line-height: 1.4;
}

@media (max-width: 1024px) {
  .personal-center-card__content {
    grid-template-columns: 1fr;
  }
}

.profile-editor__avatar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0 4px;
}

.profile-editor__hint {
  margin: 0;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.profile-editor__tip {
  margin: 8px 0 0;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

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
