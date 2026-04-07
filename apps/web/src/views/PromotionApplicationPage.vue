<script setup lang="ts">
import { PermissionCodes, PromotionApplicationStatus } from '@smw/shared';
import {
  approvePromotionApplication,
  createPromotionApplication,
  fetchEvaluationSchemes,
  fetchPromotionApplicationDetail,
  fetchPromotionApplications,
  publishPromotionResult,
  rejectPromotionApplication,
  updatePromotionReview,
  withdrawPromotionApplication,
} from '@web/api/evaluation-promotion';
import { useAuthz } from '@web/composables/useAuthz';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const { hasPermission } = useAuthz();

const loading = ref(false);
const detailLoading = ref(false);
const submitting = ref(false);
const createVisible = ref(false);
const detailVisible = ref(false);
const publishVisible = ref(false);
const schemes = ref<Awaited<ReturnType<typeof fetchEvaluationSchemes>>['data']>([]);
const rows = ref<Awaited<ReturnType<typeof fetchPromotionApplications>>['data']['items']>([]);
const total = ref(0);
const detail = ref<Awaited<ReturnType<typeof fetchPromotionApplicationDetail>>['data'] | null>(null);

const query = reactive({
  page: 1,
  pageSize: 10,
  schemeId: '',
  keyword: '',
  statusCode: '',
  targetPositionCode: '',
});

const createForm = reactive({
  memberProfileId: '',
  schemeId: '',
  targetPositionCode: 'GROUP_LEADER',
  targetRoleCode: 'GROUP_LEADER',
});

const reviewForm = reactive({
  teamEvaluation: '',
  departmentReview: '',
  approvalComment: '',
});

const publishForm = reactive({
  publicNoticeStartDate: '',
  publicNoticeEndDate: '',
  appointmentPassed: true,
  publicNoticeResult: '',
});

const canCreate = computed(() => hasPermission(PermissionCodes.promotionCreate));
const canApprove = computed(() => hasPermission(PermissionCodes.promotionApprove));

async function loadSchemes() {
  const response = await fetchEvaluationSchemes();
  schemes.value = response.data;
  const firstScheme = response.data[0];
  if (!query.schemeId && firstScheme) {
    query.schemeId = firstScheme.id;
  }
  if (!createForm.schemeId && firstScheme) {
    createForm.schemeId = firstScheme.id;
  }
}

async function load() {
  loading.value = true;
  try {
    const response = await fetchPromotionApplications(query);
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '晋升申请列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(id: string) {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    const response = await fetchPromotionApplicationDetail(id);
    detail.value = response.data;
    reviewForm.teamEvaluation = response.data.teamEvaluation ?? '';
    reviewForm.departmentReview = response.data.departmentReview ?? '';
    reviewForm.approvalComment = '';
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '晋升申请详情加载失败');
    detailVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
}

async function submitCreate() {
  submitting.value = true;
  try {
    await createPromotionApplication(createForm);
    ElMessage.success('晋升申请已提交并进入审批中心');
    createVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '晋升申请提交失败');
  } finally {
    submitting.value = false;
  }
}

async function saveReviewFields() {
  if (!detail.value) return;
  submitting.value = true;
  try {
    await updatePromotionReview(detail.value.id, {
      teamEvaluation: reviewForm.teamEvaluation,
      departmentReview: reviewForm.departmentReview,
    });
    ElMessage.success('团队评价/部门审核已保存');
    await openDetail(detail.value.id);
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '评审意见保存失败');
  } finally {
    submitting.value = false;
  }
}

async function submitApproval(action: 'approve' | 'reject' | 'withdraw') {
  if (!detail.value) return;
  submitting.value = true;
  try {
    if (action === 'approve') {
      await approvePromotionApplication(detail.value.id, reviewForm.approvalComment);
    } else if (action === 'reject') {
      await rejectPromotionApplication(detail.value.id, reviewForm.approvalComment);
    } else {
      await withdrawPromotionApplication(detail.value.id, reviewForm.approvalComment);
    }
    ElMessage.success('审批动作已提交');
    await openDetail(detail.value.id);
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审批动作提交失败');
  } finally {
    submitting.value = false;
  }
}

async function submitPublish() {
  if (!detail.value) return;
  submitting.value = true;
  try {
    await publishPromotionResult(detail.value.id, publishForm);
    ElMessage.success('公示结果已保存');
    publishVisible.value = false;
    await openDetail(detail.value.id);
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '公示结果保存失败');
  } finally {
    submitting.value = false;
  }
}

function openApprovalCenter() {
  if (!detail.value?.approvalInstanceId) return;
  void router.push({ name: 'workflow.approval-center', query: { focus: detail.value.approvalInstanceId } });
}

function openCreateFromRoute() {
  if (route.query.openCreate !== '1') return;
  createForm.memberProfileId = String(route.query.memberProfileId || '');
  createForm.schemeId = String(route.query.schemeId || createForm.schemeId);
  createForm.targetPositionCode = String(route.query.targetPositionCode || 'GROUP_LEADER');
  createForm.targetRoleCode = createForm.targetPositionCode;
  createVisible.value = true;
}

watch(
  () => route.fullPath,
  () => {
    openCreateFromRoute();
  },
);

onMounted(async () => {
  await loadSchemes();
  await load();
  openCreateFromRoute();
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">PRO-05 Promotion Application</p>
      <h2>晋升申请与评审</h2>
      <p>统一承载申请、团队评价、部门审核、公示结果与审批流转，不自建私有流程表，审批轨迹仍回到统一审批中心查看。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-select v-model="query.schemeId" style="width: 14rem" clearable>
          <el-option v-for="item in schemes" :key="item.id" :label="`${item.schemeName} (${item.periodKey})`" :value="item.id" />
        </el-select>
        <el-input v-model="query.keyword" placeholder="搜索申请单号/成员/组织" clearable @keyup.enter="load" />
        <el-select v-model="query.statusCode" style="width: 12rem" clearable>
          <el-option label="审批中" :value="PromotionApplicationStatus.IN_APPROVAL" />
          <el-option label="待公示" :value="PromotionApplicationStatus.PUBLIC_NOTICE" />
          <el-option label="已任命" :value="PromotionApplicationStatus.APPOINTED" />
          <el-option label="未任命" :value="PromotionApplicationStatus.NOT_APPOINTED" />
          <el-option label="已驳回" :value="PromotionApplicationStatus.REJECTED" />
          <el-option label="已撤回" :value="PromotionApplicationStatus.WITHDRAWN" />
        </el-select>
        <el-select v-model="query.targetPositionCode" style="width: 12rem" clearable>
          <el-option label="组长" value="GROUP_LEADER" />
          <el-option label="部长" value="MINISTER" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button v-if="canCreate" type="success" @click="createVisible = true">发起申请</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="applicationNo" label="申请单号" min-width="170" />
        <el-table-column prop="displayName" label="成员" min-width="120" />
        <el-table-column prop="orgUnitName" label="组织" min-width="140" />
        <el-table-column prop="currentPositionCode" label="当前岗位" width="120" />
        <el-table-column prop="targetPositionCode" label="目标岗位" width="120" />
        <el-table-column prop="schemeName" label="考核周期" min-width="160" />
        <el-table-column label="资格" width="100">
          <template #default="{ row }">
            <el-tag :type="row.qualificationPassed ? 'success' : 'danger'">{{ row.qualificationPassed ? '通过' : '未通过' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="statusCode" label="状态" width="130" />
        <el-table-column prop="latestResult" label="最近结果" min-width="220" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
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

    <el-dialog v-model="createVisible" title="发起晋升申请" width="34rem">
      <el-form label-position="top">
        <el-form-item label="成员档案 ID">
          <el-input v-model="createForm.memberProfileId" />
        </el-form-item>
        <el-form-item label="考核周期">
          <el-select v-model="createForm.schemeId" style="width: 100%">
            <el-option v-for="item in schemes" :key="item.id" :label="`${item.schemeName} (${item.periodKey})`" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标岗位">
          <el-select v-model="createForm.targetPositionCode" style="width: 100%">
            <el-option label="组长" value="GROUP_LEADER" />
            <el-option label="部长" value="MINISTER" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标角色">
          <el-input v-model="createForm.targetRoleCode" />
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
          <strong>{{ detail?.applicationNo || '晋升申请详情' }}</strong>
          <p class="drawer-caption">{{ detail?.statusCode || '' }}</p>
        </div>
      </template>

      <div v-loading="detailLoading">
        <div v-if="detail" class="approval-detail">
          <div class="approval-detail__section">
            <div class="approval-detail__section-header">
              <h3>申请摘要</h3>
              <el-button v-if="detail.approvalInstanceId" link type="primary" @click="openApprovalCenter">打开审批中心</el-button>
            </div>
            <dl class="drawer-descriptions">
              <dt>成员</dt>
              <dd>{{ detail.displayName }}</dd>
              <dt>组织</dt>
              <dd>{{ detail.orgUnitName }}</dd>
              <dt>当前岗位</dt>
              <dd>{{ detail.currentPositionCode }}</dd>
              <dt>目标岗位</dt>
              <dd>{{ detail.targetPositionCode }}</dd>
              <dt>考核周期</dt>
              <dd>{{ detail.schemeName || '-' }}</dd>
              <dt>状态</dt>
              <dd>{{ detail.statusCode }}</dd>
            </dl>
          </div>

          <div class="approval-detail__section">
            <h3>资格快照</h3>
            <pre class="approval-detail__snapshot">{{ JSON.stringify(detail.qualificationSnapshot, null, 2) }}</pre>
          </div>

          <div class="approval-detail__section">
            <h3>业务字段</h3>
            <el-form label-position="top">
              <el-form-item label="团队评价">
                <el-input v-model="reviewForm.teamEvaluation" type="textarea" :rows="3" />
              </el-form-item>
              <el-form-item label="部门审核">
                <el-input v-model="reviewForm.departmentReview" type="textarea" :rows="3" />
              </el-form-item>
            </el-form>
            <el-button v-if="canApprove" :loading="submitting" @click="saveReviewFields">保存业务字段</el-button>
          </div>

          <div class="approval-detail__section">
            <h3>审批处理</h3>
            <el-input
              v-model="reviewForm.approvalComment"
              type="textarea"
              :rows="4"
              maxlength="500"
              show-word-limit
              placeholder="输入审批意见"
            />
            <div class="approval-detail__actions">
              <el-button
                v-if="canApprove && detail.statusCode === PromotionApplicationStatus.IN_APPROVAL"
                type="success"
                :loading="submitting"
                @click="submitApproval('approve')"
              >
                通过
              </el-button>
              <el-button
                v-if="canApprove && detail.statusCode === PromotionApplicationStatus.IN_APPROVAL"
                type="danger"
                :loading="submitting"
                @click="submitApproval('reject')"
              >
                驳回
              </el-button>
              <el-button
                v-if="canCreate && detail.statusCode === PromotionApplicationStatus.IN_APPROVAL"
                plain
                type="warning"
                :loading="submitting"
                @click="submitApproval('withdraw')"
              >
                撤回
              </el-button>
              <el-button
                v-if="canApprove && detail.statusCode === PromotionApplicationStatus.PUBLIC_NOTICE"
                type="primary"
                plain
                @click="publishVisible = true"
              >
                录入公示结果
              </el-button>
            </div>
          </div>

          <div v-if="detail.appointment" class="approval-detail__section">
            <h3>公示与任命</h3>
            <dl class="drawer-descriptions">
              <dt>公示状态</dt>
              <dd>{{ detail.appointment.publicNoticeStatus }}</dd>
              <dt>任命状态</dt>
              <dd>{{ detail.appointment.appointmentStatus }}</dd>
              <dt>公示时间</dt>
              <dd>{{ detail.appointment.publicNoticeStartDate || '-' }} 至 {{ detail.appointment.publicNoticeEndDate || '-' }}</dd>
              <dt>公示结果</dt>
              <dd>{{ detail.appointment.publicNoticeResult || '-' }}</dd>
            </dl>
          </div>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="publishVisible" title="录入公示结果" width="34rem">
      <el-form label-position="top">
        <el-form-item label="公示开始日期">
          <el-date-picker v-model="publishForm.publicNoticeStartDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="公示结束日期">
          <el-date-picker v-model="publishForm.publicNoticeEndDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="是否通过公示">
          <el-switch v-model="publishForm.appointmentPassed" />
        </el-form-item>
        <el-form-item label="公示结果说明">
          <el-input v-model="publishForm.publicNoticeResult" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitPublish">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>
