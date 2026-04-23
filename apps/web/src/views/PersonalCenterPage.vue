<script setup lang="ts">
import type { MyFundItem } from '@smw/shared';
import { fetchMyFunds } from '@web/api/finance';
import { fetchPersonalCenter, updatePersonalCenter, uploadProfileAvatar } from '@web/api/system';
import { useIsMobile } from '@web/composables/useIsMobile';
import { useAuthStore } from '@web/stores/auth';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const { isMobile } = useIsMobile();
const loading = ref(false);
const savingPassword = ref(false);
const passwordFormRef = ref<FormInstance>();
const profile = ref<Awaited<ReturnType<typeof fetchPersonalCenter>>['data'] | null>(null);
const myFundsLoading = ref(false);
const myFunds = ref<MyFundItem[]>([]);

const editingProfile = ref(false);
const savingProfile = ref(false);
const profileFormRef = ref<FormInstance>();
const profileForm = reactive({
  displayName: '',
  mobile: '',
  email: '',
  bio: '',
});

const localAvatarUrl = ref('');
const tempAvatarUrl = ref('');
const tempAvatarFile = ref<File | null>(null);

const avatarHeaderUrl = computed(() => localAvatarUrl.value || profile.value?.avatarUrl || '');
const avatarEditorPreviewUrl = computed(() => tempAvatarUrl.value || localAvatarUrl.value || profile.value?.avatarUrl || '');

const avatarText = computed(() => {
  const name = profile.value?.displayName || authStore.displayName || authStore.username || '';
  return name.trim().slice(0, 1) || 'U';
});

function formatMoney(amount: number) {
  return Number.isFinite(amount) ? amount.toFixed(2) : '-';
}

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
    profileForm.bio = response.data.bio || '';
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '个人中心加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadMyFunds() {
  myFundsLoading.value = true;
  try {
    const response = await fetchMyFunds();
    myFunds.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '我的资金加载失败');
    myFunds.value = [];
  } finally {
    myFundsLoading.value = false;
  }
}

function openProfileEditor() {
  if (!profile.value) return;
  profileForm.displayName = profile.value.displayName || '';
  profileForm.mobile = profile.value.mobile || '';
  profileForm.email = profile.value.email || '';
  profileForm.bio = profile.value.bio || '';
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
      avatarFileName = uploadResponse.data.originalName;
    }

    await updatePersonalCenter({
      displayName: profileForm.displayName.trim(),
      mobile: profileForm.mobile.trim(),
      email: profileForm.email.trim(),
      bio: profileForm.bio.trim(),
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
    authStore.logout();
    ElMessage.success('密码修改成功，请重新登录');
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
    await router.replace('/login');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '密码修改失败');
  } finally {
    savingPassword.value = false;
  }
}

onMounted(() => {
  void Promise.all([load(), loadMyFunds()]);
});
</script>

<template>
  <section v-loading="loading" class="page-grid">
    <div class="panel-card personal-center-card">
      <div class="panel-card__header personal-center-card__header">
        <div class="personal-center-card__user">
          <el-avatar :size="48" class="personal-center-card__avatar" :src="avatarHeaderUrl">{{ avatarText }}</el-avatar>
          <div>
            <p class="panel-card__eyebrow">个人中心</p>
            <h2 class="personal-center-card__title">{{ profile?.displayName || authStore.displayName || '-' }}</h2>
          </div>
        </div>
        <el-button type="primary" :disabled="!profile" @click="openProfileEditor">信息修改</el-button>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">角色信息</p>
          <h2>角色信息</h2>
        </div>
      </div>
      <el-descriptions v-if="profile" :column="3" border>
        <el-descriptions-item label="当前角色">{{ profile.activeRole.roleName }}</el-descriptions-item>
        <el-descriptions-item label="所属组织">{{ profile.orgProfile.orgUnitName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="岗位/职位">{{ profile.orgProfile.positionCode || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-empty v-else description="暂无角色信息" />
    </div>

    <div class="panel-card">
      <div class="personal-center-card__content">
        <div class="personal-center-card__section">
          <div class="personal-center-card__sectionHeader">
            <p class="panel-card__eyebrow">基本信息</p>
            <h3 class="personal-center-card__sectionTitle">基本信息</h3>
          </div>
          <el-descriptions v-if="profile" :column="2" border>
            <el-descriptions-item label="姓名">{{ profile.displayName }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{ profile.mobile || '-' }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ profile.email || '-' }}</el-descriptions-item>
            <el-descriptions-item label="个人简介" :span="2">{{ profile.bio || '-' }}</el-descriptions-item>
          </el-descriptions>
          <el-empty v-else description="暂无个人信息" />
        </div>

        <div class="personal-center-card__section">
          <div class="personal-center-card__sectionHeader">
            <p class="panel-card__eyebrow">我的资金</p>
            <h3 class="personal-center-card__sectionTitle">我的资金</h3>
          </div>
          <el-empty v-if="!myFunds.length && !myFundsLoading" description="暂无资金记录" />
          <div v-else class="table-scroll">
            <el-table v-loading="myFundsLoading" :data="myFunds" border stripe>
              <el-table-column prop="amount" label="金额" width="120">
                <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
              </el-table-column>
              <el-table-column prop="statusCode" label="当前状态" width="140" />
              <el-table-column label="申请时间" width="180">
                <template #default="{ row }">{{ new Date(row.appliedAt).toLocaleString() }}</template>
              </el-table-column>
              <el-table-column label="审批时间" width="180">
                <template #default="{ row }">
                  {{ row.approvedAt ? new Date(row.approvedAt).toLocaleString() : '-' }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>
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

    <el-dialog
      v-model="editingProfile"
      title="统一编辑个人信息"
      :width="isMobile ? '92%' : '560px'"
      :close-on-click-modal="false"
      @close="closeProfileEditor"
    >
      <el-form ref="profileFormRef" :model="profileForm" label-position="top">
        <div class="profile-editor__avatar">
          <el-avatar :size="72" :src="avatarEditorPreviewUrl">{{ avatarText }}</el-avatar>
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
        <el-form-item label="手机号" prop="mobile">
          <el-input v-model="profileForm.mobile" maxlength="11" />
          <p class="profile-editor__tip">手机号建议填写中国大陆常用手机号</p>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="profileForm.email" maxlength="100" />
          <p class="profile-editor__tip">邮箱建议填写常用邮箱地址</p>
        </el-form-item>
        <el-form-item label="个人简介" prop="bio">
          <el-input v-model="profileForm.bio" type="textarea" :rows="4" maxlength="500" show-word-limit />
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

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.table-scroll :deep(.el-table) {
  min-width: 620px;
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
  width: 100%;
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

</style>
