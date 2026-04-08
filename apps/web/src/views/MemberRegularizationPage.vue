<script setup lang="ts">
import { PermissionCodes } from '@smw/shared';
import {
  approveRegularization,
  createRegularization,
  fetchMemberList,
  fetchRegularizationDetail,
  fetchRegularizationList,
  rejectRegularization,
  withdrawRegularization,
} from '@web/api/member';
import { useAuthz } from '@web/composables/useAuthz';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const { hasPermission } = useAuthz();

const loading = ref(false);
const submitting = ref(false);
const createVisible = ref(false);
const detailVisible = ref(false);
const rows = ref<Awaited<ReturnType<typeof fetchRegularizationList>>['data']['items']>([]);
const total = ref(0);
const detail = ref<Awaited<ReturnType<typeof fetchRegularizationDetail>>['data'] | null>(null);
const memberOptions = ref<Array<{ id: string; label: string; joinDate: string }>>([]);
const approvalComment = ref('');

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  statusCode: '',
});

const createForm = reactive({
  memberProfileId: '',
  internshipStartDate: '',
  plannedRegularDate: '',
  applicationReason: '',
  selfAssessment: '',
});

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '审批中', value: 'IN_APPROVAL' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '已撤回', value: 'WITHDRAWN' },
];

const canCreate = computed(() => hasPermission(PermissionCodes.memberCreate));
const canReview = computed(() => hasPermission(PermissionCodes.memberApprove));

function statusTagType(statusCode: string) {
  switch (statusCode) {
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    case 'IN_APPROVAL':
      return 'warning';
    default:
      return 'info';
  }
}

async function load() {
  loading.value = true;
  try {
    const response = await fetchRegularizationList(query);
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '转正列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadMemberOptions() {
  const response = await fetchMemberList({ page: 1, pageSize: 100, statusCode: 'INTERN' });
  memberOptions.value = response.data.items.map((item) => ({
    id: item.id,
    label: `${item.displayName} / ${item.orgUnitName}`,
    joinDate: item.joinDate,
  }));
}

async function openDetail(id: string) {
  detailVisible.value = true;
  approvalComment.value = '';
  try {
    const response = await fetchRegularizationDetail(id);
    detail.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '转正详情加载失败');
    detailVisible.value = false;
  }
}

async function submitCreate() {
  submitting.value = true;
  try {
    await createRegularization(createForm);
    ElMessage.success('转正申请已提交并进入审批中心');
    createVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '转正申请提交失败');
  } finally {
    submitting.value = false;
  }
}

async function submitReview(action: 'approve' | 'reject' | 'withdraw') {
  if (!detail.value) return;
  submitting.value = true;
  try {
    if (action === 'approve') {
      await approveRegularization(detail.value.id, approvalComment.value);
    } else if (action === 'reject') {
      await rejectRegularization(detail.value.id, approvalComment.value);
    } else {
      await withdrawRegularization(detail.value.id, approvalComment.value);
    }

    ElMessage.success('流程操作已提交');
    await openDetail(detail.value.id);
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '流程操作失败');
  } finally {
    submitting.value = false;
  }
}

function openApprovalCenter() {
  if (!detail.value?.approvalInstanceId) return;
  void router.push({ name: 'workflow.approval-center', query: { focus: detail.value.approvalInstanceId } });
}

onMounted(async () => {
  await Promise.all([load(), loadMemberOptions()]);
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">转正管理</p>
      <h2>实习转正管理</h2>
      <p>统一管理申请、阶段评价、审批跟踪与结果同步；审批节点复用统一审批中心，不单独造流程。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row member-toolbar">
        <el-input v-model="query.keyword" placeholder="搜索姓名、账号、组织" clearable @keyup.enter="load" />
        <el-select v-model="query.statusCode" style="width: 12rem">
          <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button v-if="canCreate" type="success" @click="createVisible = true">发起转正申请</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="displayName" label="成员" min-width="140" />
        <el-table-column prop="orgUnitName" label="组织" min-width="150" />
        <el-table-column prop="mentorName" label="带教" min-width="120" />
        <el-table-column label="流程状态" width="150">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.statusCode)">{{ row.statusCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="memberStatus" label="成员状态" min-width="170" />
        <el-table-column prop="plannedRegularDate" label="计划转正日期" min-width="140" />
        <el-table-column prop="latestResult" label="最近结果" min-width="180" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            <el-button link @click="router.push({ name: 'members.detail', params: { id: row.memberProfileId } })">
              成员档案
            </el-button>
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

    <el-dialog v-model="createVisible" title="发起转正申请" width="36rem">
      <el-form label-position="top">
        <el-form-item label="成员">
          <el-select v-model="createForm.memberProfileId" style="width: 100%">
            <el-option v-for="option in memberOptions" :key="option.id" :label="option.label" :value="option.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="实习开始日期">
          <el-date-picker v-model="createForm.internshipStartDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="计划转正日期">
          <el-date-picker v-model="createForm.plannedRegularDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="申请理由">
          <el-input v-model="createForm.applicationReason" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="自我评价">
          <el-input v-model="createForm.selfAssessment" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCreate">提交</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" size="52%">
      <template #header>
        <div>
          <strong>{{ detail?.displayName || '转正详情' }}</strong>
          <p class="drawer-caption">{{ detail?.statusCode || '' }}</p>
        </div>
      </template>

      <div v-if="detail" class="approval-detail">
        <div class="approval-detail__section">
          <h3>申请摘要</h3>
          <dl class="drawer-descriptions">
            <dt>组织</dt>
            <dd>{{ detail.orgUnitName }}</dd>
            <dt>带教</dt>
            <dd>{{ detail.mentorName || '-' }}</dd>
            <dt>申请状态</dt>
            <dd>{{ detail.statusCode }}</dd>
            <dt>成员状态</dt>
            <dd>{{ detail.memberStatus }}</dd>
            <dt>计划转正日期</dt>
            <dd>{{ detail.plannedRegularDate }}</dd>
          </dl>
        </div>

        <div class="approval-detail__section">
          <h3>申请内容</h3>
          <p>{{ detail.applicationReason }}</p>
          <p class="drawer-caption">自我评价：{{ detail.selfAssessment || '未填写' }}</p>
        </div>

        <div class="approval-detail__section">
          <div class="approval-detail__section-header">
            <h3>阶段评价</h3>
            <el-button v-if="detail.approvalInstanceId" link type="primary" @click="openApprovalCenter">
              打开审批中心
            </el-button>
          </div>
          <el-table :data="detail.stageEvaluations" border>
            <el-table-column prop="stageCode" label="阶段" min-width="140" />
            <el-table-column prop="summary" label="摘要" min-width="220" />
            <el-table-column prop="score" label="评分" width="100" />
            <el-table-column prop="resultCode" label="结果" width="120" />
            <el-table-column prop="evaluatorName" label="评价人" min-width="120" />
          </el-table>
        </div>

        <div v-if="canReview || canCreate" class="approval-detail__section">
          <h3>审批处理</h3>
          <el-input
            v-model="approvalComment"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="输入审批意见或补充说明"
          />
          <div class="approval-detail__actions">
            <el-button
              v-if="canReview && detail.statusCode === 'IN_APPROVAL'"
              type="success"
              :loading="submitting"
              @click="submitReview('approve')"
            >
              通过当前节点
            </el-button>
            <el-button
              v-if="canReview && detail.statusCode === 'IN_APPROVAL'"
              type="danger"
              :loading="submitting"
              @click="submitReview('reject')"
            >
              驳回
            </el-button>
            <el-button
              v-if="canCreate && detail.statusCode === 'IN_APPROVAL'"
              type="warning"
              plain
              :loading="submitting"
              @click="submitReview('withdraw')"
            >
              撤回
            </el-button>
          </div>
        </div>
      </div>
    </el-drawer>
  </section>
</template>
