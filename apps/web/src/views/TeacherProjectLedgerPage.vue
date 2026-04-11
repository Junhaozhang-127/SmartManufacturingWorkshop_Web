<script setup lang="ts">
import { RoleCode } from '@smw/shared';
import { fetchAchievementUsers } from '@web/api/competition-achievement';
import {
  createTeacherFundAccount,
  fetchTeacherFundAccounts,
  type TeacherFundAccountItem,
  updateTeacherFundAccount,
} from '@web/api/finance';
import { fetchOrgOverview } from '@web/api/member';
import { useAuthStore } from '@web/stores/auth';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

type Mode = 'ENTRY' | 'ASSIGN';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const canUse = computed(() =>
  [RoleCode.TEACHER, RoleCode.MINISTER].includes(authStore.activeRoleCode ?? RoleCode.MEMBER),
);
const canGoFundManage = computed(() => authStore.activeRoleCode === RoleCode.TEACHER);
const mode = computed<Mode>(() => (route.name === 'teacher.projects.assign' ? 'ASSIGN' : 'ENTRY'));

const loading = ref(false);
const rows = ref<TeacherFundAccountItem[]>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  statusCode: '',
});

const statusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 'ACTIVE' },
  { label: '停用', value: 'INACTIVE' },
];

const orgUnitOptions = ref<Array<{ id: string; label: string }>>([]);
const userOptions = ref<Array<{ id: string; label: string }>>([]);

const formRef = ref<FormInstance>();
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  accountCode: '',
  accountName: '',
  categoryName: 'PROJECT',
  projectId: '',
  projectName: '',
  ownerOrgUnitId: '',
  managerUserId: '',
  totalBudget: undefined as number | undefined,
  remarks: '',
  statusCode: 'ACTIVE',
});

const assignRef = ref<FormInstance>();
const assignVisible = ref(false);
const assignSaving = ref(false);
const assignTarget = ref<TeacherFundAccountItem | null>(null);
const assignForm = reactive({
  ownerOrgUnitId: '',
  managerUserId: '',
});

function flattenOrgTree(nodes: Array<{ id: string; unitName: string; children?: unknown[] }>, prefix = '') {
  for (const node of nodes) {
    orgUnitOptions.value.push({ id: node.id, label: `${prefix}${node.unitName}` });
    const children = Array.isArray(node.children) ? (node.children as any[]) : [];
    if (children.length) {
      flattenOrgTree(children, `${prefix}— `);
    }
  }
}

async function loadOptions() {
  try {
    const [orgResponse, userResponse] = await Promise.all([fetchOrgOverview(), fetchAchievementUsers()]);
    orgUnitOptions.value = [];
    flattenOrgTree(orgResponse.data.tree as any[]);
    userOptions.value = userResponse.data.map((item) => ({ id: item.id, label: item.label }));
  } catch {
    // Ignore option failures; page remains usable for read-only listing.
  }
}

async function load() {
  loading.value = true;
  try {
    const response = await fetchTeacherFundAccounts({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword.trim() || undefined,
      statusCode: query.statusCode || undefined,
    });
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '项目台账加载失败');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  editingId.value = null;
  form.accountCode = '';
  form.accountName = '';
  form.categoryName = 'PROJECT';
  form.projectId = '';
  form.projectName = '';
  form.ownerOrgUnitId = '';
  form.managerUserId = '';
  form.totalBudget = undefined;
  form.remarks = '';
  form.statusCode = 'ACTIVE';
}

function openCreate() {
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: TeacherFundAccountItem) {
  editingId.value = row.id;
  form.accountCode = row.accountCode;
  form.accountName = row.accountName;
  form.categoryName = row.categoryName;
  form.projectId = row.projectId ?? '';
  form.projectName = row.projectName ?? '';
  form.ownerOrgUnitId = row.ownerOrgUnitId ?? '';
  form.managerUserId = row.managerUserId ?? '';
  form.totalBudget = row.totalBudget;
  form.remarks = row.remarks ?? '';
  form.statusCode = row.statusCode;
  dialogVisible.value = true;
}

async function submit() {
  if (!formRef.value) return;
  await formRef.value.validate();

  saving.value = true;
  try {
    const payload = {
      accountCode: form.accountCode.trim(),
      accountName: form.accountName.trim(),
      categoryName: form.categoryName.trim(),
      projectId: form.projectId.trim() || undefined,
      projectName: form.projectName.trim() || undefined,
      ownerOrgUnitId: form.ownerOrgUnitId || undefined,
      managerUserId: form.managerUserId || undefined,
      totalBudget: form.totalBudget ?? 0,
      remarks: form.remarks.trim() || undefined,
      statusCode: form.statusCode,
    };

    if (editingId.value) {
      await updateTeacherFundAccount(editingId.value, payload);
      ElMessage.success('已更新项目台账');
    } else {
      await createTeacherFundAccount(payload);
      ElMessage.success('已创建项目台账');
    }

    dialogVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    saving.value = false;
  }
}

function openAssign(row: TeacherFundAccountItem) {
  assignTarget.value = row;
  assignForm.ownerOrgUnitId = row.ownerOrgUnitId ?? '';
  assignForm.managerUserId = row.managerUserId ?? '';
  assignVisible.value = true;
}

async function submitAssign() {
  if (!assignTarget.value) return;
  if (!assignRef.value) return;
  await assignRef.value.validate();

  assignSaving.value = true;
  try {
    await updateTeacherFundAccount(assignTarget.value.id, {
      accountCode: assignTarget.value.accountCode,
      accountName: assignTarget.value.accountName,
      categoryName: assignTarget.value.categoryName,
      projectId: assignTarget.value.projectId ?? undefined,
      projectName: assignTarget.value.projectName ?? undefined,
      ownerOrgUnitId: assignForm.ownerOrgUnitId || undefined,
      managerUserId: assignForm.managerUserId || undefined,
      totalBudget: assignTarget.value.totalBudget,
      remarks: assignTarget.value.remarks ?? undefined,
      statusCode: assignTarget.value.statusCode,
    });

    ElMessage.success('已更新项目分配');
    assignVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '分配失败');
  } finally {
    assignSaving.value = false;
  }
}

function goEntry() {
  void router.push({ name: 'teacher.projects.entry' });
}

function goAssign() {
  void router.push({ name: 'teacher.projects.assign' });
}

function goFundManage() {
  void router.push({ name: 'funds.overview' });
}

onMounted(async () => {
  await Promise.all([loadOptions(), load()]);
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">老师面板</p>
      <h2>{{ mode === 'ENTRY' ? '项目录入' : '项目分配' }}</h2>
      <p>以“经费账户（FundAccount）”作为项目台账承载：录入项目编号/名称/预算，并分配归属组织与经费管理员。</p>
      <div class="hero-card__actions">
        <el-button-group>
          <el-button :type="mode === 'ENTRY' ? 'primary' : 'default'" @click="goEntry">项目录入</el-button>
          <el-button :type="mode === 'ASSIGN' ? 'primary' : 'default'" @click="goAssign">项目分配</el-button>
        </el-button-group>
        <el-button v-if="canGoFundManage" @click="goFundManage">经费管理</el-button>
      </div>
    </div>

    <div v-if="!canUse" class="panel-card">
      <p class="muted">无权限：仅部长及以上身份可访问项目台账。</p>
    </div>

    <div v-else class="panel-card">
      <div class="toolbar-row">
        <el-input v-model="query.keyword" placeholder="搜索项目/账户编号/名称" clearable @keyup.enter="load" />
        <el-select v-model="query.statusCode" style="width: 8.5rem">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button v-if="mode === 'ENTRY' && canUse" type="success" @click="openCreate">新建项目</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="projectId" label="项目编号" min-width="140" />
        <el-table-column prop="projectName" label="项目名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="accountCode" label="账户编号" min-width="150" show-overflow-tooltip />
        <el-table-column prop="accountName" label="账户名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="totalBudget" label="预算" width="120" />
        <el-table-column prop="statusCode" label="状态" width="120" />
        <el-table-column
          v-if="mode === 'ASSIGN'"
          prop="ownerOrgUnitName"
          label="归属组织"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column
          v-if="mode === 'ASSIGN'"
          prop="managerUserName"
          label="经费管理员"
          width="160"
          show-overflow-tooltip
        />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="mode === 'ENTRY'" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="mode === 'ASSIGN'" link type="primary" @click="openAssign(row)">分配</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-row">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          @change="load"
        />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑项目台账' : '新建项目台账'" width="660px" destroy-on-close>
      <el-form ref="formRef" :model="form" label-width="110px">
        <el-form-item label="项目编号" prop="projectId" :rules="[{ required: true, message: '请输入项目编号' }]">
          <el-input v-model="form.projectId" maxlength="64" />
        </el-form-item>
        <el-form-item label="项目名称" prop="projectName" :rules="[{ required: true, message: '请输入项目名称' }]">
          <el-input v-model="form.projectName" maxlength="128" />
        </el-form-item>
        <el-form-item label="账户编号" prop="accountCode" :rules="[{ required: true, message: '请输入账户编号' }]">
          <el-input v-model="form.accountCode" maxlength="64" />
        </el-form-item>
        <el-form-item label="账户名称" prop="accountName" :rules="[{ required: true, message: '请输入账户名称' }]">
          <el-input v-model="form.accountName" maxlength="128" />
        </el-form-item>
        <el-form-item label="类别" prop="categoryName" :rules="[{ required: true, message: '请输入类别' }]">
          <el-input v-model="form.categoryName" maxlength="64" />
        </el-form-item>
        <el-form-item label="预算" prop="totalBudget" :rules="[{ required: true, message: '请输入预算' }]">
          <el-input-number v-model="form.totalBudget" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="归属组织">
          <el-select v-model="form.ownerOrgUnitId" filterable clearable style="width: 100%">
            <el-option v-for="item in orgUnitOptions" :key="item.id" :label="item.label" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="经费管理员">
          <el-select v-model="form.managerUserId" filterable clearable style="width: 100%">
            <el-option v-for="item in userOptions" :key="item.id" :label="item.label" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.statusCode" style="width: 10rem">
            <el-option label="启用" value="ACTIVE" />
            <el-option label="停用" value="INACTIVE" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remarks" type="textarea" :rows="3" maxlength="1000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="assignVisible" title="项目分配" width="560px" destroy-on-close>
      <el-form ref="assignRef" :model="assignForm" label-width="110px">
        <el-form-item label="归属组织" prop="ownerOrgUnitId" :rules="[{ required: true, message: '请选择归属组织' }]">
          <el-select v-model="assignForm.ownerOrgUnitId" filterable style="width: 100%">
            <el-option v-for="item in orgUnitOptions" :key="item.id" :label="item.label" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="经费管理员" prop="managerUserId" :rules="[{ required: true, message: '请选择经费管理员' }]">
          <el-select v-model="assignForm.managerUserId" filterable style="width: 100%">
            <el-option v-for="item in userOptions" :key="item.id" :label="item.label" :value="item.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="assignSaving" @click="assignVisible = false">取消</el-button>
        <el-button type="primary" :loading="assignSaving" @click="submitAssign">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.hero-card__actions {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.muted {
  color: #64748b;
}
</style>

