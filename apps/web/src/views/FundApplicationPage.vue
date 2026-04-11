<script setup lang="ts">
import { ApprovalBusinessType, FundApplicationStatus, FundPaymentStatus, PermissionCodes } from '@smw/shared';
import { type AttachmentItem, listBusinessAttachments } from '@web/api/attachments';
import {
  createFundApplication,
  fetchFundAccounts,
  fetchFundApplicationDetail,
  fetchFundApplications,
  markFundApplicationPaid,
} from '@web/api/finance';
import AttachmentUploader from '@web/components/attachments/AttachmentUploader.vue';
import { useAuthz } from '@web/composables/useAuthz';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const { hasPermission } = useAuthz();
const canCreate = computed(() => hasPermission(PermissionCodes.fundCreate));
const canUpdate = computed(() => hasPermission(PermissionCodes.fundUpdate));

const loading = ref(false);
const actionLoading = ref(false);
const detailVisible = ref(false);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const accounts = ref<Awaited<ReturnType<typeof fetchFundAccounts>>['data']>([]);
const applications = ref<Awaited<ReturnType<typeof fetchFundApplications>>['data']['items']>([]);
const total = ref(0);
const detail = ref<Awaited<ReturnType<typeof fetchFundApplicationDetail>>['data'] | null>(null);
const detailAttachments = ref<AttachmentItem[]>([]);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  statusCode: '',
  paymentStatus: '',
  expenseType: '',
  accountId: '',
});

const form = reactive({
  accountId: '',
  applicationType: 'EXPENSE',
  expenseType: 'PROCUREMENT',
  title: '',
  purpose: '',
  amount: undefined as number | undefined,
  reimbursementAmount: undefined as number | undefined,
  payeeName: '',
  projectId: '',
  projectName: '',
  relatedBusinessType: '',
  relatedBusinessId: '',
  attachments: [] as AttachmentItem[],
});

const selectedAccount = computed(() => accounts.value.find((item) => item.id === form.accountId) ?? null);

const expenseTypeOptions = [
  'PROCUREMENT',
  'REIMBURSEMENT',
  'TRAVEL',
  'REPAIR',
  'MAINTENANCE',
  'COMPETITION_REGISTRATION',
  'OTHER',
];

async function load() {
  loading.value = true;
  try {
    const [applicationResponse, accountResponse] = await Promise.all([
      fetchFundApplications(query),
      fetchFundAccounts(),
    ]);
    applications.value = applicationResponse.data.items;
    total.value = applicationResponse.data.meta.total;
    accounts.value = accountResponse.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '经费申请列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(id: string) {
  detailVisible.value = true;
  try {
    const response = await fetchFundApplicationDetail(id);
    detail.value = response.data;
    const attachmentResponse = await listBusinessAttachments({
      businessType: ApprovalBusinessType.FUND_REQUEST,
      businessId: id,
      usageType: 'FUND_VOUCHER',
    });
    detailAttachments.value = attachmentResponse.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '详情加载失败');
    detailAttachments.value = [];
  }
}

function openApproval(approvalInstanceId: string | null) {
  if (!approvalInstanceId) return;
  void router.push({ name: 'workflow.approval-center', query: { focus: approvalInstanceId } });
}

function openProject(projectId: string | null) {
  if (!projectId) return;
  void router.push({ name: 'projects.detail', params: { projectId } });
}

function resetForm() {
  form.accountId = '';
  form.applicationType = 'EXPENSE';
  form.expenseType = 'PROCUREMENT';
  form.title = '';
  form.purpose = '';
  form.amount = undefined;
  form.reimbursementAmount = undefined;
  form.payeeName = '';
  form.projectId = '';
  form.projectName = '';
  form.relatedBusinessType = '';
  form.relatedBusinessId = '';
  form.attachments = [];
}

async function submit() {
  if (!formRef.value) return;
  await formRef.value.validate();

  if (selectedAccount.value && (form.amount || 0) > selectedAccount.value.availableAmount) {
    ElMessage.error(`预算不足，当前账户可用余额为 ${selectedAccount.value.availableAmount.toFixed(2)}`);
    return;
  }

  actionLoading.value = true;
  try {
    const response = await createFundApplication({
      accountId: form.accountId,
      applicationType: form.applicationType,
      expenseType: form.expenseType,
      title: form.title,
      purpose: form.purpose,
      amount: form.amount!,
      reimbursementAmount: form.reimbursementAmount,
      payeeName: form.payeeName || undefined,
      projectId: form.projectId || undefined,
      projectName: form.projectName || undefined,
      relatedBusinessType: form.relatedBusinessType || undefined,
      relatedBusinessId: form.relatedBusinessId || undefined,
      attachmentFileIds: form.attachments.map((item) => item.fileId),
    });
    ElMessage.success('费用申请已提交审批');
    dialogVisible.value = false;
    resetForm();
    await load();
    await openDetail(response.data.id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '提交失败');
  } finally {
    actionLoading.value = false;
  }
}

async function confirmPayment() {
  if (!detail.value) return;
  actionLoading.value = true;
  try {
    await markFundApplicationPaid(detail.value.id, {});
    ElMessage.success('支付状态已更新');
    await load();
    await openDetail(detail.value.id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '支付更新失败');
  } finally {
    actionLoading.value = false;
  }
}

watch(
  () => route.query.focus,
  (focus) => {
    if (typeof focus === 'string' && focus) {
      void openDetail(focus);
    }
  },
  { immediate: true },
);

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">经费申请</p>
      <h2>费用申请 / 报销</h2>
      <p>支持采购、报销、差旅、维修、比赛报名费等费用类型，提交后统一进入审批中心，并保留支付状态和附件凭证链路。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-input v-model="query.keyword" placeholder="搜索单号 / 标题 / 项目" clearable @keyup.enter="load" />
        <el-select v-model="query.statusCode" clearable placeholder="申请状态">
          <el-option v-for="item in Object.values(FundApplicationStatus)" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.paymentStatus" clearable placeholder="支付状态">
          <el-option v-for="item in Object.values(FundPaymentStatus)" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.expenseType" clearable placeholder="费用类型">
          <el-option v-for="item in expenseTypeOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.accountId" clearable filterable placeholder="经费账户">
          <el-option v-for="item in accounts" :key="item.id" :label="item.accountName" :value="item.id" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button v-if="canCreate" @click="dialogVisible = true">新建申请</el-button>
      </div>

      <el-table v-loading="loading" :data="applications">
        <el-table-column prop="applicationNo" label="申请单号" min-width="150" />
        <el-table-column prop="accountName" label="经费账户" min-width="180" />
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="expenseType" label="费用类型" min-width="140" />
        <el-table-column prop="amount" label="金额" min-width="110" />
        <el-table-column prop="statusCode" label="申请状态" min-width="120" />
        <el-table-column prop="paymentStatus" label="支付状态" min-width="120" />
        <el-table-column prop="projectName" label="关联项目" min-width="160" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            <el-button v-if="row.approvalInstanceId" link type="success" @click="openApproval(row.approvalInstanceId)">
              审批
            </el-button>
            <el-button v-if="row.projectId" link @click="openProject(row.projectId)">项目</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          layout="total, prev, pager, next"
          :total="total"
          @current-change="load"
          @size-change="load"
        />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" title="新建费用申请" width="720px" @closed="resetForm">
      <el-form ref="formRef" :model="form" label-width="120px">
        <el-form-item label="经费账户" prop="accountId" :rules="[{ required: true, message: '请选择经费账户' }]">
          <el-select v-model="form.accountId" filterable style="width: 100%">
            <el-option
              v-for="item in accounts"
              :key="item.id"
              :label="`${item.accountName} / 可用 ${item.availableAmount.toFixed(2)}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="申请类型" prop="applicationType" :rules="[{ required: true, message: '请选择申请类型' }]">
          <el-radio-group v-model="form.applicationType">
            <el-radio label="EXPENSE">费用申请</el-radio>
            <el-radio label="REIMBURSEMENT">报销</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="费用类型" prop="expenseType" :rules="[{ required: true, message: '请选择费用类型' }]">
          <el-select v-model="form.expenseType" style="width: 100%">
            <el-option v-for="item in expenseTypeOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" prop="title" :rules="[{ required: true, message: '请输入标题' }]">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="申请金额" prop="amount" :rules="[{ required: true, message: '请输入申请金额' }]">
          <el-input-number v-model="form.amount" :min="0.01" :precision="2" />
          <span v-if="selectedAccount" class="inline-hint">可用余额 {{ selectedAccount.availableAmount.toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="报销金额">
          <el-input-number v-model="form.reimbursementAmount" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="收款方">
          <el-input v-model="form.payeeName" />
        </el-form-item>
        <el-form-item label="关联项目编号"><el-input v-model="form.projectId" /></el-form-item>
        <el-form-item label="关联项目名称"><el-input v-model="form.projectName" /></el-form-item>
        <el-form-item label="关联业务类型">
          <el-select v-model="form.relatedBusinessType" clearable style="width: 100%">
            <el-option :label="ApprovalBusinessType.REPAIR_ORDER" :value="ApprovalBusinessType.REPAIR_ORDER" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联业务ID"><el-input v-model="form.relatedBusinessId" /></el-form-item>
        <el-form-item label="用途说明" prop="purpose" :rules="[{ required: true, message: '请输入用途说明' }]">
          <el-input v-model="form.purpose" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="附件凭证">
          <AttachmentUploader v-model="form.attachments" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submit">提交审批</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" size="760px">
      <template #header>
        <div>
          <strong>{{ detail?.applicationNo || '经费申请详情' }}</strong>
          <div v-if="detail">{{ detail.title }} / {{ detail.statusCode }} / {{ detail.paymentStatus }}</div>
        </div>
      </template>

      <div v-if="detail" class="page-grid">
        <div class="panel-card">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">申请信息</p>
              <h2>申请信息</h2>
            </div>
            <el-button
              v-if="canUpdate && detail.statusCode === FundApplicationStatus.APPROVED && detail.paymentStatus !== FundPaymentStatus.PAID"
              type="primary"
              :loading="actionLoading"
              @click="confirmPayment"
            >
              标记已支付
            </el-button>
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="经费账户">{{ detail.accountName }}</el-descriptions-item>
            <el-descriptions-item label="费用类型">{{ detail.expenseType }}</el-descriptions-item>
            <el-descriptions-item label="申请金额">{{ detail.amount }}</el-descriptions-item>
            <el-descriptions-item label="支付状态">{{ detail.paymentStatus }}</el-descriptions-item>
            <el-descriptions-item label="申请人">{{ detail.applicantName }}</el-descriptions-item>
            <el-descriptions-item label="收款方">{{ detail.payeeName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="关联项目">
              <el-button v-if="detail.projectId" link type="primary" @click="openProject(detail.projectId)">
                {{ detail.projectName || detail.projectId }}
              </el-button>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="审批实例">
              <el-button v-if="detail.approvalInstanceId" link type="primary" @click="openApproval(detail.approvalInstanceId)">
                {{ detail.approvalInstanceId }}
              </el-button>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="可用余额">{{ detail.account.availableAmount }}</el-descriptions-item>
            <el-descriptions-item label="最新结果">{{ detail.latestResult || '-' }}</el-descriptions-item>
            <el-descriptions-item label="用途说明" :span="2">{{ detail.purpose }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="panel-card">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">附件材料</p>
              <h2>附件凭证</h2>
            </div>
          </div>
          <AttachmentUploader v-model="detailAttachments" readonly />
        </div>

        <div class="panel-card">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">流程留痕</p>
              <h2>流程留痕</h2>
            </div>
          </div>
          <el-timeline>
            <el-timeline-item v-for="(item, index) in detail.statusLogs" :key="`${item.actionType}-${index}`" :timestamp="item.createdAt">
              {{ item.actionType }}: {{ item.fromStatus || 'INIT' }} -> {{ item.toStatus || '-' }}
              <span v-if="item.comment">（{{ item.comment }}）</span>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-drawer>
  </section>
</template>

<style scoped>
.inline-hint {
  margin-left: 12px;
  color: var(--el-color-danger);
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}
</style>
