<script setup lang="ts">
import { RoleCode } from '@smw/shared';
import {
  assignOrgMembers,
  createDepartment,
  createGroup,
  fetchOrgMemberOptions,
  fetchOrgOverview,
  updateOrgLeader,
} from '@web/api/member';
import { useAuthStore } from '@web/stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';

const authStore = useAuthStore();
const loading = ref(false);
const tree = ref<Awaited<ReturnType<typeof fetchOrgOverview>>['data']['tree']>([]);
const summary = ref({
  orgUnitCount: 0,
  memberCount: 0,
  internCount: 0,
  regularizationPendingCount: 0,
});

const scopeTitle = computed(() => {
  switch (authStore.activeRoleCode) {
    case RoleCode.TEACHER:
      return '实验室组织树';
    case RoleCode.MINISTER:
      return authStore.orgProfile?.departmentName
        ? `${authStore.orgProfile.departmentName}组织树`
        : '当前部门组织树';
    default:
      return '组织树';
  }
});

const scopeDescription = computed(() => {
  switch (authStore.activeRoleCode) {
    case RoleCode.TEACHER:
      return '显示实验室整体组织结构、负责人和成员统计。';
    case RoleCode.MINISTER:
      return '仅显示当前部长所属部门及下属小组的组织结构。';
    default:
      return '显示当前可见范围内的组织结构。';
  }
});

function formatUnitType(unitType: string) {
  switch (unitType) {
    case 'LAB':
      return '实验室';
    case 'DEPARTMENT':
      return '部门';
    case 'GROUP':
      return '小组';
    default:
      return unitType;
  }
}

const isTeacher = computed(() => authStore.activeRoleCode === RoleCode.TEACHER);
const isMinister = computed(() => authStore.activeRoleCode === RoleCode.MINISTER);

const memberOptions = ref<
  Array<{
    memberProfileId: string;
    userId: string;
    displayName: string;
    username: string;
    memberStatus: string;
    orgUnitId: string;
    orgUnitName: string;
    roleCodes: string[];
  }>
>([]);

const memberSelectOptions = computed(() =>
  memberOptions.value.map((item) => ({
    id: item.memberProfileId,
    label: `${item.displayName} / ${item.orgUnitName}`,
  })),
);

const ministerLeaderOptions = computed(() =>
  memberOptions.value
    .filter((item) => item.roleCodes.includes(RoleCode.MINISTER))
    .map((item) => ({
      id: item.userId,
      label: `${item.displayName} (${item.username})`,
    })),
);

const groupLeaderOptions = computed(() =>
  memberOptions.value
    .filter((item) => item.roleCodes.includes(RoleCode.GROUP_LEADER))
    .map((item) => ({
      id: item.userId,
      label: `${item.displayName} (${item.username})`,
    })),
);

async function loadMemberOptions() {
  try {
    const response = await fetchOrgMemberOptions();
    memberOptions.value = response.data;
  } catch {
    memberOptions.value = [];
  }
}

async function load() {
  loading.value = true;
  try {
    const response = await fetchOrgOverview();
    tree.value = response.data.tree;
    summary.value = response.data.summary;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '组织架构加载失败');
  } finally {
    loading.value = false;
  }
}

const createVisible = ref(false);
const createSaving = ref(false);
const createForm = reactive({
  unitName: '',
  leaderUserId: '',
  memberProfileIds: [] as string[],
});

function openCreate() {
  createForm.unitName = '';
  createForm.leaderUserId = '';
  createForm.memberProfileIds = [];
  createVisible.value = true;
}

async function submitCreate() {
  if (!createForm.unitName.trim()) {
    ElMessage.warning('请输入名称');
    return;
  }

  createSaving.value = true;
  try {
    if (isTeacher.value) {
      await createDepartment({
        unitName: createForm.unitName.trim(),
        leaderUserId: createForm.leaderUserId || undefined,
        memberProfileIds: createForm.memberProfileIds.length ? createForm.memberProfileIds : undefined,
      });
      ElMessage.success('部门已创建');
    } else if (isMinister.value) {
      await createGroup({
        unitName: createForm.unitName.trim(),
        leaderUserId: createForm.leaderUserId || undefined,
        memberProfileIds: createForm.memberProfileIds.length ? createForm.memberProfileIds : undefined,
      });
      ElMessage.success('小组已创建');
    }
    createVisible.value = false;
    await Promise.all([load(), loadMemberOptions()]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '创建失败');
  } finally {
    createSaving.value = false;
  }
}

const leaderVisible = ref(false);
const leaderSaving = ref(false);
const leaderTarget = ref<{ id: string; unitName: string; unitType: string; leaderUserId: string | null } | null>(null);
const leaderUserId = ref('');

function canManageNode(node: { id: string; unitType: string; parentId: string | null }) {
  if (isTeacher.value) return node.unitType !== 'LAB';
  if (!isMinister.value) return false;
  const deptId = authStore.orgProfile?.departmentId;
  if (!deptId) return false;
  if (node.unitType === 'DEPARTMENT') return node.id === deptId;
  if (node.unitType === 'GROUP') return node.parentId === deptId;
  return false;
}

function openLeader(node: { id: string; unitName: string; unitType: string; leaderUserId: string | null; parentId: string | null }) {
  if (!canManageNode(node)) return;
  leaderTarget.value = node;
  leaderUserId.value = node.leaderUserId ?? '';
  leaderVisible.value = true;
}

async function submitLeader() {
  if (!leaderTarget.value) return;
  leaderSaving.value = true;
  try {
    await updateOrgLeader(leaderTarget.value.id, { leaderUserId: leaderUserId.value || undefined });
    ElMessage.success('负责人已更新');
    leaderVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '更新失败');
  } finally {
    leaderSaving.value = false;
  }
}

const membersVisible = ref(false);
const membersSaving = ref(false);
const membersTarget = ref<{ id: string; unitName: string; unitType: string; parentId: string | null } | null>(null);
const selectedMemberProfileIds = ref<string[]>([]);

function openMembers(node: { id: string; unitName: string; unitType: string; parentId: string | null }) {
  if (!canManageNode(node)) return;
  membersTarget.value = node;
  selectedMemberProfileIds.value = memberOptions.value
    .filter((item) => item.orgUnitId === node.id)
    .map((item) => item.memberProfileId);
  membersVisible.value = true;
}

async function submitMembers() {
  if (!membersTarget.value) return;
  await ElMessageBox.confirm('分配后成员将移动到目标组织节点，是否继续？', '确认分配', { type: 'warning' });
  membersSaving.value = true;
  try {
    const response = await assignOrgMembers(membersTarget.value.id, { memberProfileIds: selectedMemberProfileIds.value });
    ElMessage.success(`已分配 ${response.data.updatedCount} 人`);
    membersVisible.value = false;
    await Promise.all([load(), loadMemberOptions()]);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '分配失败');
    }
  } finally {
    membersSaving.value = false;
  }
}

onMounted(() => {
  void Promise.all([load(), loadMemberOptions()]);
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">组织架构</p>
      <h2>{{ scopeTitle }}</h2>
      <p>{{ scopeDescription }}</p>
    </div>

    <div class="stat-grid dashboard-stat-grid">
      <article class="stat-card">
        <span>组织节点</span>
        <strong>{{ summary.orgUnitCount }}</strong>
      </article>
      <article class="stat-card">
        <span>成员总数</span>
        <strong>{{ summary.memberCount }}</strong>
      </article>
      <article class="stat-card">
        <span>实习成员</span>
        <strong>{{ summary.internCount }}</strong>
      </article>
      <article class="stat-card">
        <span>待转正成员</span>
        <strong>{{ summary.regularizationPendingCount }}</strong>
      </article>
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">树形结构</p>
          <h2>{{ scopeTitle }}</h2>
        </div>
        <div v-if="isTeacher || isMinister">
          <el-button type="primary" @click="openCreate">{{ isTeacher ? '新增部门' : '新增小组' }}</el-button>
        </div>
      </div>

      <el-empty v-if="!loading && !tree.length" description="当前范围内暂无组织数据" />
      <el-tree v-else v-loading="loading" :data="tree" node-key="id" default-expand-all>
        <template #default="{ data }">
          <div class="org-tree-card">
            <div class="org-tree-card__content">
              <strong>{{ data.unitName }}</strong>
              <p>{{ formatUnitType(data.unitType) }} | 负责人：{{ data.leaderName || '未设置' }}</p>
              <div v-if="canManageNode(data)" class="org-tree-card__actions">
                <el-button link type="primary" @click.stop="openLeader(data)">设置负责人</el-button>
                <el-button link type="primary" @click.stop="openMembers(data)">分配成员</el-button>
              </div>
            </div>
            <div class="org-tree-card__meta">
              <el-tag effect="plain">成员 {{ data.memberCount }}</el-tag>
              <el-tag type="success" effect="plain">正式 {{ data.activeMemberCount }}</el-tag>
              <el-tag type="warning" effect="plain">待转正 {{ data.regularizationPendingCount }}</el-tag>
            </div>
          </div>
        </template>
      </el-tree>
    </div>

    <el-dialog v-model="createVisible" :title="isTeacher ? '新增部门' : '新增小组'" width="560px" destroy-on-close>
      <el-form label-width="110px">
        <el-form-item :label="isTeacher ? '部门名称' : '小组名称'">
          <el-input v-model="createForm.unitName" maxlength="128" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="createForm.leaderUserId" filterable clearable style="width: 100%">
            <el-option
              v-for="option in (isTeacher ? ministerLeaderOptions : groupLeaderOptions)"
              :key="option.id"
              :label="option.label"
              :value="option.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="成员分配">
          <el-select v-model="createForm.memberProfileIds" multiple filterable clearable style="width: 100%">
            <el-option v-for="item in memberSelectOptions" :key="item.id" :label="item.label" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-alert
          v-if="isMinister"
          title="部长新增小组将自动挂到当前部门下，且仅可分配本部门范围内成员。"
          type="info"
          :closable="false"
          show-icon
        />
      </el-form>
      <template #footer>
        <el-button :disabled="createSaving" @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSaving" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="leaderVisible" title="设置负责人" width="520px" destroy-on-close>
      <el-form label-width="110px">
        <el-form-item label="组织节点">
          <el-input :model-value="leaderTarget?.unitName || '-'" disabled />
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="leaderUserId" filterable clearable style="width: 100%">
            <el-option
              v-for="option in (leaderTarget?.unitType === 'DEPARTMENT' ? ministerLeaderOptions : groupLeaderOptions)"
              :key="option.id"
              :label="option.label"
              :value="option.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="leaderSaving" @click="leaderVisible = false">取消</el-button>
        <el-button type="primary" :loading="leaderSaving" @click="submitLeader">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="membersVisible" title="分配成员" width="720px" destroy-on-close>
      <el-form label-width="110px">
        <el-form-item label="组织节点">
          <el-input :model-value="membersTarget?.unitName || '-'" disabled />
        </el-form-item>
        <el-form-item label="成员">
          <el-select v-model="selectedMemberProfileIds" multiple filterable clearable style="width: 100%">
            <el-option v-for="item in memberSelectOptions" :key="item.id" :label="item.label" :value="item.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="membersSaving" @click="membersVisible = false">取消</el-button>
        <el-button type="primary" :loading="membersSaving" @click="submitMembers">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
:deep(.el-tree-node__content) {
  align-items: flex-start;
  min-height: 3.5rem;
  height: auto;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

:deep(.el-tree-node__expand-icon) {
  margin-top: 0.4rem;
}

:deep(.el-tree-node__children .el-tree-node__content) {
  min-height: 3.75rem;
}

.org-tree-card__actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
</style>
