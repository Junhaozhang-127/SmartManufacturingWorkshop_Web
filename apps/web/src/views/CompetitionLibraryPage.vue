<script setup lang="ts">
import { CompetitionStatus, PermissionCodes } from '@smw/shared';
import type { AttachmentItem } from '@web/api/attachments';
import {
  bindBusinessAttachments,
  listBusinessAttachments,
  unbindBusinessAttachment,
  uploadAttachmentWithProgress,
} from '@web/api/attachments';
import {
  createCompetition,
  deleteCompetition,
  fetchAchievementUsers,
  fetchCompetitionDetail,
  fetchCompetitionList,
  publishCompetition,
  registerCompetitionTeam,
  updateCompetition,
  updateCompetitionTeam,
} from '@web/api/competition-achievement';
import { useAuthz } from '@web/composables/useAuthz';
import { useAuthStore } from '@web/stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const BUSINESS_TYPE = 'COMPETITION';
const USAGE_ATTACHMENT = 'COMPETITION_ATTACHMENT';

const router = useRouter();
const { hasPermission } = useAuthz();
const authStore = useAuthStore();

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
const editingTeamId = ref<string | null>(null);

const competitionAttachments = ref<AttachmentItem[]>([]);
const detailAttachments = ref<AttachmentItem[]>([]);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  statusCode: '',
  competitionLevel: '',
  involvedField: '',
});

const competitionForm = reactive({
  name: '',
  location: '',
  competitionLevel: '',
  involvedField: '',
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

const canCreateCompetition = computed(() => hasPermission(PermissionCodes.competitionCreate));
const canUpdateCompetition = computed(() => hasPermission(PermissionCodes.competitionUpdate));
const canRegister = computed(() => hasPermission(PermissionCodes.competitionRegistrationCreate));
const currentUserId = computed(() => authStore.user?.id ?? '');

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '草稿', value: CompetitionStatus.DRAFT },
  { label: '未开始', value: CompetitionStatus.NOT_STARTED },
  { label: '报名中', value: CompetitionStatus.REGISTRATION_OPEN },
  { label: '已截止', value: CompetitionStatus.REGISTRATION_CLOSED },
  { label: '进行中', value: CompetitionStatus.IN_PROGRESS },
  { label: '已结束', value: CompetitionStatus.ENDED },
  { label: '已归档', value: CompetitionStatus.ARCHIVED },
];

const levelOptions = [
  { label: '全部级别', value: '' },
  { label: '校级', value: 'SCHOOL' },
  { label: '市级', value: 'CITY' },
  { label: '省级', value: 'PROVINCIAL' },
  { label: '国家级', value: 'NATIONAL' },
  { label: '国际级', value: 'INTERNATIONAL' },
];

const involvedFieldOptions = ['智能制造', '人工智能', '软件工程', '电子信息', '机械设计', '材料与化工', '其他'];

function resetCompetitionForm() {
  editingCompetitionId.value = null;
  competitionAttachments.value = [];
  Object.assign(competitionForm, {
    name: '',
    location: '',
    competitionLevel: '',
    involvedField: '',
    registrationStartDate: '',
    registrationEndDate: '',
    eventStartDate: '',
    eventEndDate: '',
    description: '',
  });
}

function resetRegisterForm() {
  editingTeamId.value = null;
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

function formatStatus(code: string) {
  switch (code) {
    case CompetitionStatus.DRAFT:
      return '草稿';
    case CompetitionStatus.NOT_STARTED:
      return '未开始';
    case CompetitionStatus.REGISTRATION_OPEN:
      return '报名中';
    case CompetitionStatus.REGISTRATION_CLOSED:
      return '已截止';
    case CompetitionStatus.IN_PROGRESS:
      return '进行中';
    case CompetitionStatus.ENDED:
      return '已结束';
    case CompetitionStatus.ARCHIVED:
      return '已归档';
    default:
      return code || '-';
  }
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
    const attachments = await listBusinessAttachments({
      businessType: BUSINESS_TYPE,
      businessId: id,
      usageType: USAGE_ATTACHMENT,
    });
    detailAttachments.value = attachments.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '赛事详情加载失败');
    detailVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
}

function openCreateCompetition() {
  if (!canCreateCompetition.value) {
    ElMessage.warning('无权限：不可新建赛事');
    return;
  }
  resetCompetitionForm();
  competitionDialogVisible.value = true;
}

async function openEditCompetition(row: (typeof rows.value)[number]) {
  editingCompetitionId.value = row.id;
  Object.assign(competitionForm, {
    name: row.name,
    location: row.location ?? '',
    competitionLevel: row.competitionLevel,
    involvedField: row.involvedField ?? '',
    registrationStartDate: row.registrationStartDate ?? '',
    registrationEndDate: row.registrationEndDate ?? '',
    eventStartDate: row.eventStartDate ?? '',
    eventEndDate: row.eventEndDate ?? '',
    description: row.description ?? '',
  });

  const attachments = await listBusinessAttachments({
    businessType: BUSINESS_TYPE,
    businessId: row.id,
    usageType: USAGE_ATTACHMENT,
  });
  competitionAttachments.value = attachments.data;
  competitionDialogVisible.value = true;
}

function openRegister(row: (typeof rows.value)[number]) {
  activeCompetitionId.value = row.id;
  resetRegisterForm();
  registerDialogVisible.value = true;
}

const canPublish = computed(() => {
  return Boolean(
    competitionForm.name.trim() &&
      competitionForm.location.trim() &&
      competitionForm.competitionLevel.trim() &&
      competitionForm.involvedField.trim() &&
      competitionForm.registrationStartDate &&
      competitionForm.registrationEndDate &&
      competitionForm.eventStartDate &&
      competitionForm.eventEndDate,
  );
});

async function saveCompetitionDraft() {
  submitting.value = true;
  try {
    if (editingCompetitionId.value) {
      if (!canUpdateCompetition.value) {
        ElMessage.error('无权限：不可编辑赛事');
        return;
      }
      const response = await updateCompetition(editingCompetitionId.value, competitionForm);
      editingCompetitionId.value = response.data.id;
      ElMessage.success('已保存草稿');
    } else {
      if (!canCreateCompetition.value) {
        ElMessage.error('无权限：不可新建赛事');
        return;
      }
      const response = await createCompetition(competitionForm);
      editingCompetitionId.value = response.data.id;
      ElMessage.success('已创建草稿');
    }
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    submitting.value = false;
  }
}

async function publishNow() {
  if (!canPublish.value) {
    ElMessage.warning('基础信息或时间信息不完整，无法发布');
    return;
  }
  submitting.value = true;
  try {
    await saveCompetitionDraft();
    if (!editingCompetitionId.value) return;
    await publishCompetition(editingCompetitionId.value);
    ElMessage.success('赛事已发布');
    competitionDialogVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '发布失败');
  } finally {
    submitting.value = false;
  }
}

async function publishRow(row: (typeof rows.value)[number]) {
  submitting.value = true;
  try {
    await publishCompetition(row.id);
    ElMessage.success('赛事已发布');
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '发布失败');
  } finally {
    submitting.value = false;
  }
}

async function removeCompetition(row: (typeof rows.value)[number]) {
  try {
    await ElMessageBox.confirm('确认删除该赛事？', '删除确认', { type: 'warning' });
  } catch (e) {
    if (e === 'cancel') return;
  }
  submitting.value = true;
  try {
    await deleteCompetition(row.id);
    ElMessage.success('已删除');
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除失败');
  } finally {
    submitting.value = false;
  }
}

function isUserInTeam(team: { memberUserIds: string[]; teamLeaderUserId: string }) {
  const uid = currentUserId.value;
  if (!uid) return false;
  return team.teamLeaderUserId === uid || team.memberUserIds.includes(uid);
}

function openEditTeam(team: (NonNullable<typeof detail.value>['teams'])[number]) {
  activeCompetitionId.value = team.competitionId;
  editingTeamId.value = team.id;
  Object.assign(registerForm, {
    teamName: team.teamName,
    teamLeaderUserId: team.teamLeaderUserId,
    advisorUserId: team.advisorUserId ?? '',
    memberUserIds: team.memberUserIds.filter((id) => id !== team.teamLeaderUserId),
    projectId: team.projectId ?? '',
    projectName: team.projectName ?? '',
    applicationReason: team.applicationReason ?? '',
  });
  registerDialogVisible.value = true;
}

async function submitRegister() {
  submitting.value = true;
  try {
    const memberUserIds = [...new Set([registerForm.teamLeaderUserId, ...registerForm.memberUserIds].filter(Boolean))];
    const payload = {
      teamName: registerForm.teamName,
      teamLeaderUserId: registerForm.teamLeaderUserId,
      advisorUserId: registerForm.advisorUserId || undefined,
      members: memberUserIds.map((userId) => ({ userId })),
      projectId: registerForm.projectId || undefined,
      projectName: registerForm.projectName || undefined,
      applicationReason: registerForm.applicationReason || undefined,
    };

    if (editingTeamId.value) {
      await updateCompetitionTeam(activeCompetitionId.value, editingTeamId.value, payload);
      ElMessage.success('队伍信息已更新');
    } else {
      await registerCompetitionTeam(activeCompetitionId.value, payload);
      ElMessage.success('报名申请已提交（审批中心处理）');
    }
    registerDialogVisible.value = false;
    await Promise.all([load(), detail.value ? openDetail(activeCompetitionId.value) : Promise.resolve()]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '提交失败');
  } finally {
    submitting.value = false;
  }
}

async function uploadAndBind(file: File, onProgress?: (_percent: number) => void) {
  const id = editingCompetitionId.value;
  if (!id) {
    ElMessage.warning('请先保存草稿后再上传附件');
    throw new Error('missing competition id');
  }

  const uploaded = await uploadAttachmentWithProgress(file, {
    onUploadProgress: (event) => {
      const totalBytes = event.total;
      if (!totalBytes) return;
      const percent = Math.min(99, Math.max(0, Math.round((event.loaded / totalBytes) * 100)));
      onProgress?.(percent);
    },
  });

  const bound = await bindBusinessAttachments({
    businessType: BUSINESS_TYPE,
    businessId: id,
    usageType: USAGE_ATTACHMENT,
    fileIds: [uploaded.data.fileId],
  });

  const item = bound.data.find((x) => x.fileId === uploaded.data.fileId);
  return { data: item ?? uploaded.data };
}

async function removeBound(item: AttachmentItem) {
  const id = editingCompetitionId.value;
  if (!id) return;
  await unbindBusinessAttachment({
    businessType: BUSINESS_TYPE,
    businessId: id,
    usageType: USAGE_ATTACHMENT,
    fileId: item.fileId,
  });
}

const competitionUploadRequest = (file: File, onProgress?: (_percent: number) => void) => uploadAndBind(file, onProgress);
const competitionRemoveRequest = (item: AttachmentItem) => removeBound(item);

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
      <p class="hero-card__eyebrow">赛事库</p>
      <h2>赛事库与报名</h2>
      <p>维护赛事信息、支持报名并在审批中心处理报名审批。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-input v-model="query.keyword" placeholder="搜索赛事名称 / 地点 / 涉及领域" clearable @keyup.enter="load" />
        <el-select v-model="query.statusCode" style="width: 12rem">
          <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-select v-model="query.competitionLevel" style="width: 12rem">
          <el-option v-for="option in levelOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-select
          v-model="query.involvedField"
          clearable
          filterable
          allow-create
          default-first-option
          style="width: 14rem"
          placeholder="涉及领域"
        >
          <el-option v-for="option in involvedFieldOptions" :key="option" :label="option" :value="option" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button v-if="canCreateCompetition" type="success" @click="openCreateCompetition">新建赛事</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="name" label="赛事名称" min-width="220" />
        <el-table-column prop="location" label="赛事地点" min-width="180" />
        <el-table-column prop="competitionLevel" label="级别" width="120" />
        <el-table-column prop="involvedField" label="涉及领域" min-width="160" />
        <el-table-column prop="registrationEndDate" label="报名截止" min-width="160" />
        <el-table-column prop="statusCode" label="状态" width="110">
          <template #default="{ row }">{{ formatStatus(row.statusCode) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="340" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            <el-button v-if="canRegister" link type="success" @click="openRegister(row)">报名</el-button>
            <el-button v-if="canUpdateCompetition" link @click="openEditCompetition(row)">编辑</el-button>
            <el-button
              v-if="canUpdateCompetition && row.statusCode === CompetitionStatus.DRAFT"
              link
              type="primary"
              :loading="submitting"
              @click="publishRow(row)"
            >
              发布
            </el-button>
            <el-button v-if="canUpdateCompetition" link type="danger" :loading="submitting" @click="removeCompetition(row)">删除</el-button>
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

    <el-dialog v-model="competitionDialogVisible" :title="editingCompetitionId ? '编辑赛事' : '新建赛事'" width="46rem">
      <el-form label-position="top">
        <div class="grid-two">
          <el-form-item label="赛事名称" required>
            <el-input v-model="competitionForm.name" maxlength="255" show-word-limit />
          </el-form-item>
          <el-form-item label="赛事地点" required>
            <el-input v-model="competitionForm.location" maxlength="255" show-word-limit />
          </el-form-item>
          <el-form-item label="赛事级别" required>
            <el-input v-model="competitionForm.competitionLevel" maxlength="32" show-word-limit />
          </el-form-item>
          <el-form-item label="涉及领域" required>
            <el-select v-model="competitionForm.involvedField" filterable allow-create default-first-option style="width: 100%">
              <el-option v-for="option in involvedFieldOptions" :key="option" :label="option" :value="option" />
            </el-select>
          </el-form-item>
          <el-form-item label="报名开始时间">
            <el-date-picker
              v-model="competitionForm.registrationStartDate"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ssZ"
              format="YYYY-MM-DD HH:mm"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="报名截止时间">
            <el-date-picker
              v-model="competitionForm.registrationEndDate"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ssZ"
              format="YYYY-MM-DD HH:mm"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="赛事开始时间">
            <el-date-picker
              v-model="competitionForm.eventStartDate"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ssZ"
              format="YYYY-MM-DD HH:mm"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="赛事结束时间">
            <el-date-picker
              v-model="competitionForm.eventEndDate"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ssZ"
              format="YYYY-MM-DD HH:mm"
              style="width: 100%"
            />
          </el-form-item>
        </div>

        <el-form-item label="说明">
          <el-input v-model="competitionForm.description" type="textarea" :rows="4" maxlength="1000" show-word-limit />
        </el-form-item>

        <el-divider content-position="left">赛事附件</el-divider>
        <el-form-item label="附件（支持多文件）">
          <AttachmentUploader
            v-model="competitionAttachments"
            :readonly="!canUpdateCompetition"
            :upload-request="competitionUploadRequest"
            :remove-request="competitionRemoveRequest"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="competitionDialogVisible = false">取消</el-button>
        <el-button :loading="submitting" @click="saveCompetitionDraft">保存草稿</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!canPublish" @click="publishNow">发布</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="registerDialogVisible" :title="editingTeamId ? '修改队伍信息' : '赛事报名申请'" width="42rem">
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
        <el-button type="primary" :loading="submitting" @click="submitRegister">{{ editingTeamId ? '保存修改' : '提交报名' }}</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" size="56%">
      <template #header>
        <div>
          <strong>{{ detail?.name || '赛事详情' }}</strong>
          <p class="drawer-caption">{{ detail ? formatStatus(detail.statusCode) : '' }}</p>
        </div>
      </template>

      <div v-loading="detailLoading" class="approval-detail">
        <div v-if="detail" class="approval-detail__section">
          <h3>赛事信息</h3>
          <dl class="drawer-descriptions">
            <dt>赛事地点</dt>
            <dd>{{ detail.location || '-' }}</dd>
            <dt>涉及领域</dt>
            <dd>{{ detail.involvedField || '-' }}</dd>
            <dt>赛事级别</dt>
            <dd>{{ detail.competitionLevel }}</dd>
            <dt>报名开始</dt>
            <dd>{{ detail.registrationStartDate || '-' }}</dd>
            <dt>报名截止</dt>
            <dd>{{ detail.registrationEndDate || '-' }}</dd>
            <dt>赛事开始</dt>
            <dd>{{ detail.eventStartDate || '-' }}</dd>
            <dt>赛事结束</dt>
            <dd>{{ detail.eventEndDate || '-' }}</dd>
            <dt>状态</dt>
            <dd>{{ formatStatus(detail.statusCode) }}</dd>
          </dl>
          <p class="drawer-caption">{{ detail.description || '暂无说明' }}</p>
        </div>

        <div v-if="detail" class="approval-detail__section">
          <h3>赛事附件</h3>
          <AttachmentUploader v-model="detailAttachments" readonly />
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
            <el-table-column label="操作" width="180">
              <template #default="{ row }">
                <el-button v-if="isUserInTeam(row)" link type="primary" @click="openEditTeam(row)">编辑</el-button>
                <el-button v-if="row.approvalInstanceId" link type="primary" @click="openApproval(row.approvalInstanceId)">
                  审批
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-drawer>
  </section>
</template>
