<script setup lang="ts">
import { ApprovalBusinessType, FundApplicationStatus, FundPaymentStatus, PermissionCodes } from '@smw/shared';
import { withdrawApproval } from '@web/api/approval';
import {
  type AttachmentItem,
  deleteMyTempAttachment,
  listBusinessAttachments,
  unbindBusinessAttachment,
} from '@web/api/attachments';
import {
  createFundApplication,
  fetchFundApplicationDetail,
  fetchFundApplications,
  fetchFundSettings,
  markFundApplicationPaid,
  submitFundApplication,
  updateFundApplication,
} from '@web/api/finance';
import AttachmentUploader from '@web/components/attachments/AttachmentUploader.vue';
import { useAuthz } from '@web/composables/useAuthz';
import { useAuthStore } from '@web/stores/auth';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { hasPermission } = useAuthz();
const canCreate = computed(() => hasPermission(PermissionCodes.fundCreate));
const canUpdate = computed(() => hasPermission(PermissionCodes.fundUpdate));
const currentUserId = computed(() => authStore.user?.id ?? null);

const loading = ref(false);
const actionLoading = ref(false);
const detailVisible = ref(false);
const dialogVisible = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();
const applications = ref<Awaited<ReturnType<typeof fetchFundApplications>>['data']['items']>([]);
const total = ref(0);
const detail = ref<Awaited<ReturnType<typeof fetchFundApplicationDetail>>['data'] | null>(null);
const detailAttachments = ref<AttachmentItem[]>([]);
const detailOrderAttachments = ref<AttachmentItem[]>([]);
const detailInvoiceAttachments = ref<AttachmentItem[]>([]);
const detailGoodsAttachments = ref<AttachmentItem[]>([]);
const reimbursementThreshold = ref<number>(500);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  statusCode: '',
  paymentStatus: '',
  expenseType: '',
});

const form = reactive({
  applicationType: 'EXPENSE',
  expenseType: 'PROCUREMENT',
  title: '',
  purpose: '',
  amount: undefined as number | undefined,
  reimbursementAmount: undefined as number | undefined,
  attachments: [] as AttachmentItem[],
  orderAttachments: [] as AttachmentItem[],
  invoiceAttachments: [] as AttachmentItem[],
  goodsAttachments: [] as AttachmentItem[],
});

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
    const applicationResponse = await fetchFundApplications(query);
    applications.value = applicationResponse.data.items;
    total.value = applicationResponse.data.meta.total;
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
    const voucherPromise = listBusinessAttachments({
      businessType: ApprovalBusinessType.FUND_REQUEST,
      businessId: id,
      usageType: 'FUND_VOUCHER',
    });

    const isReimbursement = response.data.applicationType === 'REIMBURSEMENT';
    const [voucher, order, invoice, goods] = await Promise.all([
      voucherPromise,
      isReimbursement
        ? listBusinessAttachments({
            businessType: ApprovalBusinessType.FUND_REQUEST,
            businessId: id,
            usageType: 'REIMBURSE_ORDER',
          })
        : Promise.resolve({ data: [] as AttachmentItem[] }),
      isReimbursement
        ? listBusinessAttachments({
            businessType: ApprovalBusinessType.FUND_REQUEST,
            businessId: id,
            usageType: 'REIMBURSE_INVOICE',
          })
        : Promise.resolve({ data: [] as AttachmentItem[] }),
      isReimbursement
        ? listBusinessAttachments({
            businessType: ApprovalBusinessType.FUND_REQUEST,
            businessId: id,
            usageType: 'REIMBURSE_GOODS',
          })
        : Promise.resolve({ data: [] as AttachmentItem[] }),
    ]);

    detailAttachments.value = voucher.data;
    detailOrderAttachments.value = order.data;
    detailInvoiceAttachments.value = invoice.data;
    detailGoodsAttachments.value = goods.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '详情加载失败');
    detailAttachments.value = [];
    detailOrderAttachments.value = [];
    detailInvoiceAttachments.value = [];
    detailGoodsAttachments.value = [];
  }
}

function openApproval(approvalInstanceId: string | null) {
  if (!approvalInstanceId) return;
  void router.push({ name: 'workflow.approval-center', query: { focus: approvalInstanceId } });
}

function resetForm() {
  formMode.value = 'create';
  editingId.value = null;
  form.applicationType = 'EXPENSE';
  form.expenseType = 'PROCUREMENT';
  form.title = '';
  form.purpose = '';
  form.amount = undefined;
  form.reimbursementAmount = undefined;
  form.attachments = [];
  form.orderAttachments = [];
  form.invoiceAttachments = [];
  form.goodsAttachments = [];
}

function openCreate() {
  resetForm();
  dialogVisible.value = true;
}

async function openEdit(id: string) {
  resetForm();
  formMode.value = 'edit';
  editingId.value = id;
  dialogVisible.value = true;

  try {
    const response = await fetchFundApplicationDetail(id);
    const data = response.data;
    form.applicationType = String(data.applicationType);
    form.expenseType = String(data.expenseType);
    form.title = data.title;
    form.purpose = data.purpose;
    form.amount = data.amount;
    form.reimbursementAmount = data.reimbursementAmount ?? undefined;
    const [voucher, order, invoice, goods] = await Promise.all([
      listBusinessAttachments({
        businessType: ApprovalBusinessType.FUND_REQUEST,
        businessId: id,
        usageType: 'FUND_VOUCHER',
      }),
      listBusinessAttachments({
        businessType: ApprovalBusinessType.FUND_REQUEST,
        businessId: id,
        usageType: 'REIMBURSE_ORDER',
      }),
      listBusinessAttachments({
        businessType: ApprovalBusinessType.FUND_REQUEST,
        businessId: id,
        usageType: 'REIMBURSE_INVOICE',
      }),
      listBusinessAttachments({
        businessType: ApprovalBusinessType.FUND_REQUEST,
        businessId: id,
        usageType: 'REIMBURSE_GOODS',
      }),
    ]);

    form.attachments = voucher.data;
    form.orderAttachments = order.data;
    form.invoiceAttachments = invoice.data;
    form.goodsAttachments = goods.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '草稿加载失败');
    dialogVisible.value = false;
  }
}

function makeRemoveRequest(usageType: string) {
  return async (attachment: AttachmentItem) => {
    if (attachment.expiresAt) {
      await deleteMyTempAttachment(attachment.fileId);
      return;
    }

    const businessId = editingId.value;
    if (!businessId) {
      // create mode: should not have bound attachments here
      await deleteMyTempAttachment(attachment.fileId);
      return;
    }

    await unbindBusinessAttachment({
      businessType: ApprovalBusinessType.FUND_REQUEST,
      businessId,
      usageType,
      fileId: attachment.fileId,
    });
  };
}

function baseReimbursementAmount() {
  return (form.reimbursementAmount ?? form.amount ?? 0) as number;
}

function validateReimbursementMaterialsForSubmit() {
  if (form.applicationType !== 'REIMBURSEMENT') return true;
  if (baseReimbursementAmount() <= reimbursementThreshold.value) return true;

  if (!form.orderAttachments.length || !form.invoiceAttachments.length || !form.goodsAttachments.length) {
    ElMessage.error('报销金额超过阈值，订单截图/发票截图/实物截图为必填');
    return false;
  }

  return true;
}

async function saveDraft() {
  if (!formRef.value) return;
  await formRef.value.validate();

  actionLoading.value = true;
  try {
    if (formMode.value === 'edit' && editingId.value) {
      const response = await updateFundApplication(editingId.value, {
        title: form.title,
        purpose: form.purpose,
        amount: form.amount,
        reimbursementAmount: form.reimbursementAmount,
        expenseType: form.expenseType,
        attachmentFileIds: form.attachments.map((item) => item.fileId),
        orderAttachmentFileIds: form.orderAttachments.map((item) => item.fileId),
        invoiceAttachmentFileIds: form.invoiceAttachments.map((item) => item.fileId),
        goodsAttachmentFileIds: form.goodsAttachments.map((item) => item.fileId),
      });
      ElMessage.success('草稿已更新');
      dialogVisible.value = false;
      resetForm();
      await load();
      await openDetail(response.data.id);
      return;
    }

    const response = await createFundApplication({
      applicationType: form.applicationType,
      expenseType: form.expenseType,
      title: form.title,
      purpose: form.purpose,
      amount: form.amount!,
      reimbursementAmount: form.reimbursementAmount,
      attachmentFileIds: form.attachments.map((item) => item.fileId),
      orderAttachmentFileIds: form.orderAttachments.map((item) => item.fileId),
      invoiceAttachmentFileIds: form.invoiceAttachments.map((item) => item.fileId),
      goodsAttachmentFileIds: form.goodsAttachments.map((item) => item.fileId),
      submitForApproval: false,
    });

    ElMessage.success('草稿已保存');
    dialogVisible.value = false;
    resetForm();
    await load();
    await openDetail(response.data.id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存草稿失败');
  } finally {
    actionLoading.value = false;
  }
}

async function submit() {
  if (!formRef.value) return;
  await formRef.value.validate();

  if (!validateReimbursementMaterialsForSubmit()) {
    return;
  }

  actionLoading.value = true;
  try {
    if (formMode.value === 'edit' && editingId.value) {
      await updateFundApplication(editingId.value, {
        title: form.title,
        purpose: form.purpose,
        amount: form.amount,
        reimbursementAmount: form.reimbursementAmount,
        expenseType: form.expenseType,
        attachmentFileIds: form.attachments.map((item) => item.fileId),
        orderAttachmentFileIds: form.orderAttachments.map((item) => item.fileId),
        invoiceAttachmentFileIds: form.invoiceAttachments.map((item) => item.fileId),
        goodsAttachmentFileIds: form.goodsAttachments.map((item) => item.fileId),
      });

      const response = await submitFundApplication(editingId.value, {
        attachmentFileIds: form.attachments.map((item) => item.fileId),
        orderAttachmentFileIds: form.orderAttachments.map((item) => item.fileId),
        invoiceAttachmentFileIds: form.invoiceAttachments.map((item) => item.fileId),
        goodsAttachmentFileIds: form.goodsAttachments.map((item) => item.fileId),
      });

      ElMessage.success('费用申请已提交审批');
      dialogVisible.value = false;
      resetForm();
      await load();
      await openDetail(response.data.id);
      return;
    }

    const response = await createFundApplication({
      applicationType: form.applicationType,
      expenseType: form.expenseType,
      title: form.title,
      purpose: form.purpose,
      amount: form.amount!,
      reimbursementAmount: form.reimbursementAmount,
      attachmentFileIds: form.attachments.map((item) => item.fileId),
      orderAttachmentFileIds: form.orderAttachments.map((item) => item.fileId),
      invoiceAttachmentFileIds: form.invoiceAttachments.map((item) => item.fileId),
      goodsAttachmentFileIds: form.goodsAttachments.map((item) => item.fileId),
      submitForApproval: true,
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

async function withdrawCurrentApplication() {
  if (!detail.value?.approvalInstanceId) return;
  actionLoading.value = true;
  try {
    await withdrawApproval(detail.value.approvalInstanceId, '申请人撤回');
    ElMessage.success('已撤回');
    await load();
    await openDetail(detail.value.id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '撤回失败');
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

onMounted(async () => {
  try {
    const response = await fetchFundSettings();
    reimbursementThreshold.value = response.data.reimbursementMaterialThreshold;
  } catch {
    // keep default threshold
  }
  await load();
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
        <el-button type="primary" @click="load">查询</el-button>
        <el-button v-if="canCreate" @click="openCreate">新建申请</el-button>
      </div>

      <el-table v-loading="loading" :data="applications">
        <el-table-column prop="applicationNo" label="申请单号" min-width="150" />
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="expenseType" label="费用类型" min-width="140" />
        <el-table-column prop="amount" label="金额" min-width="110" />
        <el-table-column prop="statusCode" label="申请状态" min-width="120" />
        <el-table-column prop="paymentStatus" label="支付状态" min-width="120" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            <el-button v-if="row.approvalInstanceId" link type="success" @click="openApproval(row.approvalInstanceId)">
              审批
            </el-button>
            <el-button
              v-if="(row.statusCode === 'DRAFT' || row.statusCode === 'RETURNED') && currentUserId && row.applicantUserId === currentUserId"
              link
              @click="openEdit(row.id)"
            >
              编辑
            </el-button>
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

    <el-dialog
      v-model="dialogVisible"
      :title="formMode === 'edit' ? '编辑费用申请/报销' : '新建费用申请/报销'"
      width="720px"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" label-width="120px">
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
        </el-form-item>
        <el-form-item label="报销金额">
          <el-input-number v-model="form.reimbursementAmount" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="用途说明" prop="purpose" :rules="[{ required: true, message: '请输入用途说明' }]">
          <el-input v-model="form.purpose" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="附件凭证（选填）">
          <AttachmentUploader v-model="form.attachments" :remove-request="makeRemoveRequest('FUND_VOUCHER')" />
        </el-form-item>

        <template v-if="form.applicationType === 'REIMBURSEMENT'">
          <el-alert
            :title="`报销材料阈值：${reimbursementThreshold.toFixed(2)}；本次金额：${baseReimbursementAmount().toFixed(2)}。超阈值时三类截图必传。`"
            type="info"
            :closable="false"
            style="margin-bottom: 12px"
          />

          <el-form-item label="订单截图" :required="baseReimbursementAmount() > reimbursementThreshold">
            <AttachmentUploader v-model="form.orderAttachments" :remove-request="makeRemoveRequest('REIMBURSE_ORDER')" />
          </el-form-item>
          <el-form-item label="发票截图" :required="baseReimbursementAmount() > reimbursementThreshold">
            <AttachmentUploader v-model="form.invoiceAttachments" :remove-request="makeRemoveRequest('REIMBURSE_INVOICE')" />
          </el-form-item>
          <el-form-item label="实物截图" :required="baseReimbursementAmount() > reimbursementThreshold">
            <AttachmentUploader v-model="form.goodsAttachments" :remove-request="makeRemoveRequest('REIMBURSE_GOODS')" />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button :loading="actionLoading" @click="saveDraft">保存草稿</el-button>
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
            <el-button
              v-if="detail.approvalInstanceId && detail.statusCode === FundApplicationStatus.IN_APPROVAL && currentUserId && detail.applicantUserId === currentUserId"
              type="warning"
              plain
              :loading="actionLoading"
              @click="withdrawCurrentApplication"
            >
              撤回
            </el-button>
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="费用类型">{{ detail.expenseType }}</el-descriptions-item>
            <el-descriptions-item label="申请金额">{{ detail.amount }}</el-descriptions-item>
            <el-descriptions-item label="支付状态">{{ detail.paymentStatus }}</el-descriptions-item>
            <el-descriptions-item label="申请人">{{ detail.applicantName }}</el-descriptions-item>
            <el-descriptions-item label="审批实例">
              <el-button v-if="detail.approvalInstanceId" link type="primary" @click="openApproval(detail.approvalInstanceId)">
                {{ detail.approvalInstanceId }}
              </el-button>
              <span v-else>-</span>
            </el-descriptions-item>
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
          <template v-if="detail.applicationType === 'REIMBURSEMENT'">
            <el-divider content-position="left">订单截图</el-divider>
            <AttachmentUploader v-model="detailOrderAttachments" readonly />
            <el-divider content-position="left">发票截图</el-divider>
            <AttachmentUploader v-model="detailInvoiceAttachments" readonly />
            <el-divider content-position="left">实物截图</el-divider>
            <AttachmentUploader v-model="detailGoodsAttachments" readonly />
          </template>
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
