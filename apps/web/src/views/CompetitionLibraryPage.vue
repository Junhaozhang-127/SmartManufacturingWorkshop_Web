<script setup lang="ts">
import { PermissionCodes } from '@smw/shared';
import {
  createCompetition,
  fetchAchievementUsers,
  fetchCompetitionDetail,
  fetchCompetitionList,
  registerCompetitionTeam,
  updateCompetition,
} from '@web/api/competition-achievement';
import { useAuthz } from '@web/composables/useAuthz';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const { hasPermission } = useAuthz();

const loading = ref(false);
const submitting = ref(false);
const detailLoading = ref(false);
const rows = ref<Awaited<ReturnType<typeof fetchCompetitionList>>['data']['items']>([]);
const total = ref(0);
const detail = ref<Awaited<ReturnType<typeof fetchCompetitionDetail>>['data'] | null>(null);
const userOptions = ref<Awaited<ReturnType<typeof fetchAchievementUsers>>['data']>([]);
const competitionDialogVisible = ref(false);
const registerDialogVisible = ref(false);
const detailVisible = ref(false);
const editingCompetitionId = ref<string | null>(null);
const activeCompetitionId = ref('');

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  statusCode: '',
  competitionLevel: '',
});

const competitionForm = reactive({
  competitionCode: '',
  name: '',
  organizer: '',
  competitionLevel: '',
  competitionCategory: '',
  statusCode: 'OPEN',
  registrationStartDate: '',
  registrationEndDate: '',
  eventStartDate: '',
  eventEndDate: '',
  description: '',
});

const registerForm = reactive({
  teamName: '',
  teamLeaderUserId: '',
  advisorUserId: '',
  memberUserIds: [] as string[],
  projectId: '',
  projectName: '',
  applicationReason: '',
});

const canMaintain = computed(
  () => hasPermission(PermissionCodes.competitionCreate) || hasPermission(PermissionCodes.competitionUpdate),
);
const canRegister = computed(() => hasPermission(PermissionCodes.competitionRegistrationCreate));

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: 'OPEN', value: 'OPEN' },
  { label: 'CLOSED', value: 'CLOSED' },
  { label: 'ARCHIVED', value: 'ARCHIVED' },
];

const levelOptions = [
  { label: '全部级别', value: '' },
  { label: 'SCHOOL', value: 'SCHOOL' },
  { label: 'CITY', value: 'CITY' },
  { label: 'PROVINCIAL', value: 'PROVINCIAL' },
  { label: 'NATIONAL', value: 'NATIONAL' },
  { label: 'INTERNATIONAL', value: 'INTERNATIONAL' },
];

function resetCompetitionForm() {
  editingCompetitionId.value = null;
  Object.assign(competitionForm, {
    competitionCode: '',
    name: '',
    organizer: '',
    competitionLevel: '',
    competitionCategory: '',
    statusCode: 'OPEN',
    registrationStartDate: '',
    registrationEndDate: '',
    eventStartDate: '',
    eventEndDate: '',
    description: '',
  });
}

function resetRegisterForm() {
  Object.assign(registerForm, {
    teamName: '',
    teamLeaderUserId: '',
    advisorUserId: '',
    memberUserIds: [],
    projectId: '',
    projectName: '',
    applicationReason: '',
  });
}

async function load() {
  loading.value = true;
  try {
    const response = await fetchCompetitionList(query);
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '赛事列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadUserOptions() {
  const response = await fetchAchievementUsers();
  userOptions.value = response.data;
}

async function openDetail(id: string) {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    const response = await fetchCompetitionDetail(id);
    detail.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '赛事详情加载失败');
    detailVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
}

function openCreateCompetition() {
  resetCompetitionForm();
  competitionDialogVisible.value = true;
}

function openEditCompetition(row: (typeof rows.value)[number]) {
  editingCompetitionId.value = row.id;
  Object.assign(competitionForm, {
    competitionCode: row.competitionCode,
    name: row.name,
    organizer: row.organizer,
    competitionLevel: row.competitionLevel,
    competitionCategory: row.competitionCategory,
    statusCode: row.statusCode,
    registrationStartDate: row.registrationStartDate ?? '',
    registrationEndDate: row.registrationEndDate ?? '',
    eventStartDate: row.eventStartDate ?? '',
    eventEndDate: row.eventEndDate ?? '',
    description: row.description ?? '',
  });
  competitionDialogVisible.value = true;
}

function openRegister(row: (typeof rows.value)[number]) {
  activeCompetitionId.value = row.id;
  resetRegisterForm();
  registerDialogVisible.value = true;
}

async function submitCompetition() {
  submitting.value = true;
  try {
    if (editingCompetitionId.value) {
      await updateCompetition(editingCompetitionId.value, competitionForm);
      ElMessage.success('赛事已更新');
    } else {
      await createCompetition(competitionForm);
      ElMessage.success('赛事已创建');
    }
    competitionDialogVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '赛事保存失败');
  } finally {
    submitting.value = false;
  }
}

async function submitRegister() {
  submitting.value = true;
  try {
    await registerCompetitionTeam(activeCompetitionId.value, {
      teamName: registerForm.teamName,
      teamLeaderUserId: registerForm.teamLeaderUserId,
      advisorUserId: registerForm.advisorUserId || undefined,
      members: registerForm.memberUserIds.map((userId) => ({ userId })),
      projectId: registerForm.projectId || undefined,
      projectName: registerForm.projectName || undefined,
      applicationReason: registerForm.applicationReason || undefined,
    });
    ElMessage.success('报名申请已提交审批中心');
    registerDialogVisible.value = false;
    await Promise.all([load(), detail.value ? openDetail(activeCompetitionId.value) : Promise.resolve()]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '报名申请提交失败');
  } finally {
    submitting.value = false;
  }
}

function openApproval(approvalInstanceId: string | null) {
  if (!approvalInstanceId) return;
  void router.push({ name: 'workflow.approval-center', query: { focus: approvalInstanceId } });
}

onMounted(async () => {
  await Promise.all([load(), loadUserOptions()]);
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">COM-01 Competition Library</p>
      <h2>赛事库与报名</h2>
      <p>赛事作为独立生命周期对象维护，支持赛事库检索、队伍组建、指导老师绑定与报名审批轨迹回看。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-input v-model="query.keyword" placeholder="搜索赛事编码、名称、主办方" clearable @keyup.enter="load" />
        <el-select v-model="query.statusCode" style="width: 12rem">
          <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-select v-model="query.competitionLevel" style="width: 12rem">
          <el-option v-for="option in levelOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button v-if="canMaintain" type="success" @click="openCreateCompetition">维护赛事</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="competitionCode" label="赛事编码" min-width="140" />
        <el-table-column prop="name" label="赛事名称" min-width="220" />
        <el-table-column prop="competitionLevel" label="级别" width="120" />
        <el-table-column prop="competitionCategory" label="类别" min-width="140" />
        <el-table-column prop="organizer" label="主办方" min-width="180" />
        <el-table-column prop="registrationEndDate" label="报名截止" min-width="130" />
        <el-table-column prop="statusCode" label="状态" width="110" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            <el-button v-if="canRegister" link type="success" @click="openRegister(row)">报名</el-button>
            <el-button v-if="canMaintain" link @click="openEditCompetition(row)">编辑</el-button>
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

    <el-dialog v-model="competitionDialogVisible" :title="editingCompetitionId ? '编辑赛事' : '新建赛事'" width="42rem">
      <el-form label-position="top">
        <div class="grid-two">
          <el-form-item label="赛事编码"><el-input v-model="competitionForm.competitionCode" /></el-form-item>
          <el-form-item label="赛事名称"><el-input v-model="competitionForm.name" /></el-form-item>
          <el-form-item label="主办方"><el-input v-model="competitionForm.organizer" /></el-form-item>
          <el-form-item label="赛事级别"><el-input v-model="competitionForm.competitionLevel" /></el-form-item>
          <el-form-item label="赛事类别"><el-input v-model="competitionForm.competitionCategory" /></el-form-item>
          <el-form-item label="状态"><el-input v-model="competitionForm.statusCode" /></el-form-item>
          <el-form-item label="报名开始">
            <el-date-picker v-model="competitionForm.registrationStartDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
          <el-form-item label="报名截止">
            <el-date-picker v-model="competitionForm.registrationEndDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
          <el-form-item label="赛事开始">
            <el-date-picker v-model="competitionForm.eventStartDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
          <el-form-item label="赛事结束">
            <el-date-picker v-model="competitionForm.eventEndDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="说明"><el-input v-model="competitionForm.description" type="textarea" :rows="4" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="competitionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCompetition">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="registerDialogVisible" title="赛事报名申请" width="42rem">
      <el-form label-position="top">
        <div class="grid-two">
          <el-form-item label="队伍名称"><el-input v-model="registerForm.teamName" /></el-form-item>
          <el-form-item label="队长">
            <el-select v-model="registerForm.teamLeaderUserId" filterable style="width: 100%">
              <el-option v-for="option in userOptions" :key="option.id" :label="option.label" :value="option.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="指导老师">
            <el-select v-model="registerForm.advisorUserId" clearable filterable style="width: 100%">
              <el-option v-for="option in userOptions" :key="option.id" :label="option.label" :value="option.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="关联项目编号"><el-input v-model="registerForm.projectId" /></el-form-item>
        </div>
        <el-form-item label="关联项目名称"><el-input v-model="registerForm.projectName" /></el-form-item>
        <el-form-item label="队伍成员">
          <el-select v-model="registerForm.memberUserIds" multiple filterable style="width: 100%">
            <el-option v-for="option in userOptions" :key="option.id" :label="option.label" :value="option.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="报名说明"><el-input v-model="registerForm.applicationReason" type="textarea" :rows="4" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="registerDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitRegister">提交报名</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" size="56%">
      <template #header>
        <div>
          <strong>{{ detail?.name || '赛事详情' }}</strong>
          <p class="drawer-caption">{{ detail?.competitionCode || '' }}</p>
        </div>
      </template>

      <div v-loading="detailLoading" class="approval-detail">
        <div v-if="detail" class="approval-detail__section">
          <h3>赛事信息</h3>
          <dl class="drawer-descriptions">
            <dt>赛事级别</dt>
            <dd>{{ detail.competitionLevel }}</dd>
            <dt>赛事类别</dt>
            <dd>{{ detail.competitionCategory }}</dd>
            <dt>主办方</dt>
            <dd>{{ detail.organizer }}</dd>
            <dt>报名截止</dt>
            <dd>{{ detail.registrationEndDate || '-' }}</dd>
            <dt>状态</dt>
            <dd>{{ detail.statusCode }}</dd>
          </dl>
          <p class="drawer-caption">{{ detail.description || '未填写赛事说明' }}</p>
        </div>

        <div v-if="detail" class="approval-detail__section">
          <h3>队伍报名</h3>
          <el-table :data="detail.teams" border>
            <el-table-column prop="teamName" label="队伍" min-width="160" />
            <el-table-column prop="teamLeaderName" label="队长" min-width="120" />
            <el-table-column prop="advisorName" label="指导老师" min-width="120" />
            <el-table-column prop="memberNames" label="成员" min-width="220">
              <template #default="{ row }">{{ row.memberNames.join('、') }}</template>
            </el-table-column>
            <el-table-column prop="projectName" label="关联项目" min-width="160" />
            <el-table-column prop="statusCode" label="状态" width="130" />
            <el-table-column label="审批" width="120">
              <template #default="{ row }">
                <el-button v-if="row.approvalInstanceId" link type="primary" @click="openApproval(row.approvalInstanceId)">
                  轨迹
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-drawer>
  </section>
</template>
