<script setup lang="ts">
import type { LaborApplicationDetail } from '@smw/shared';
import { ApprovalBusinessType, PermissionCodes } from '@smw/shared';
import { type AttachmentItem, deleteMyTempAttachment, listBusinessAttachments, unbindBusinessAttachment } from '@web/api/attachments';
import {
  createLaborApplication,
  createLaborPayment,
  fetchFinanceUserOptions,
  fetchLaborApplicationDetail,
  fetchLaborApplications,
  markLaborPaid,
  submitLaborApplication,
  updateLaborApplication,
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
const canPay = computed(() => hasPermission(PermissionCodes.fundUpdate));

const loading = ref(false);
const actionLoading = ref(false);
const dialogVisible = ref(false);
const detailVisible = ref(false);
const formRef = ref<FormInstance>();

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  statusCode: '',
});

const rows = ref<Awaited<ReturnType<typeof fetchLaborApplications>>['data']['items']>([]);
const total = ref(0);

const detail = ref<LaborApplicationDetail | null>(null);
const detailAttachments = ref<AttachmentItem[]>([]);

const userOptions = ref<Array<{ id: string; label: string }>>([]);

const formMode = ref<'create' | 'edit' | 'directPay'>('create');
const editingId = ref<string | null>(null);
const formAttachments = ref<AttachmentItem[]>([]);

const form = reactive({
  laborType: 'SERVICE',
  targetUserId: '',
  title: '',
  reason: '',
  amount: undefined as number | undefined,
});

function resetForm() {
  formMode.value = 'create';
  editingId.value = null;
  form.laborType = 'SERVICE';
  form.targetUserId = '';
  form.title = '';
  form.reason = '';
  form.amount = undefined;
  formAttachments.value = [];
}

function openApproval(approvalInstanceId: string | null) {
  if (!approvalInstanceId) return;
  void router.push({ name: 'workflow.approval-center', query: { focus: approvalInstanceId } });
}

async function loadUserOptions() {
  try {
    const response = await fetchFinanceUserOptions();
    userOptions.value = response.data;
  } catch {
    userOptions.value = [];
  }
}

async function load() {
  loading.value = true;
  try {
    const response = await fetchLaborApplications(query);
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '劳务列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadAttachmentsFor(businessId: string) {
  const response = await listBusinessAttachments({
    businessType: ApprovalBusinessType.LABOR_APPLICATION,
    businessId,
    usageType: 'LABOR_PROOF',
  });
  return response.data;
}

async function openDetail(id: string) {
  detailVisible.value = true;
  try {
    const response = await fetchLaborApplicationDetail(id);
    detail.value = response.data;
    detailAttachments.value = await loadAttachmentsFor(id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '详情加载失败');
    detail.value = null;
    detailAttachments.value = [];
  }
}

function openCreate() {
  resetForm();
  formMode.value = 'create';
  dialogVisible.value = true;
}

function openDirectPay() {
  resetForm();
  formMode.value = 'directPay';
  dialogVisible.value = true;
}

async function openEdit(id: string) {
  resetForm();
  formMode.value = 'edit';
  editingId.value = id;
  dialogVisible.value = true;

  try {
    const response = await fetchLaborApplicationDetail(id);
    form.laborType = response.data.laborType;
    form.targetUserId = response.data.targetUserId;
    form.title = response.data.title;
    form.reason = response.data.reason;
    form.amount = response.data.amount;
    formAttachments.value = await loadAttachmentsFor(id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '草稿加载失败');
    dialogVisible.value = false;
  }
}

async function removeAttachmentForEdit(attachment: AttachmentItem) {
  if (formMode.value === 'create' || formMode.value === 'directPay') {
    await deleteMyTempAttachment(attachment.fileId);
    return;
  }

  const businessId = editingId.value;
  if (!businessId) return;

  // If this attachment is still temporary, delete it; otherwise unbind from business.
  if (attachment.expiresAt) {
    await deleteMyTempAttachment(attachment.fileId);
  } else {
    await unbindBusinessAttachment({
      businessType: ApprovalBusinessType.LABOR_APPLICATION,
      businessId,
      usageType: 'LABOR_PROOF',
      fileId: attachment.fileId,
    });
  }
}

async function saveDraft() {
  if (!formRef.value) return;
  await formRef.value.validate();

  actionLoading.value = true;
  try {
    if (formMode.value === 'edit' && editingId.value) {
      const response = await updateLaborApplication(editingId.value, {
        laborType: form.laborType,
        targetUserId: form.targetUserId,
        title: form.title,
        reason: form.reason,
        amount: form.amount,
        attachmentFileIds: formAttachments.value.map((item) => item.fileId),
      });
      ElMessage.success('草稿已更新');
      dialogVisible.value = false;
      resetForm();
      await load();
      await openDetail(response.data.id);
      return;
    }

    const response = await createLaborApplication({
      laborType: form.laborType,
      targetUserId: form.targetUserId,
      title: form.title,
      reason: form.reason,
      amount: form.amount!,
      attachmentFileIds: formAttachments.value.map((item) => item.fileId),
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

  actionLoading.value = true;
  try {
    if (formMode.value === 'directPay') {
      const response = await createLaborPayment({
        laborType: form.laborType,
        targetUserId: form.targetUserId,
        title: form.title,
        reason: form.reason,
        amount: form.amount!,
        attachmentFileIds: formAttachments.value.map((item) => item.fileId),
      });
      ElMessage.success('劳务已发放');
      dialogVisible.value = false;
      resetForm();
      await load();
      await openDetail(response.data.id);
      return;
    }

    if (formMode.value === 'edit' && editingId.value) {
      await updateLaborApplication(editingId.value, {
        laborType: form.laborType,
        targetUserId: form.targetUserId,
        title: form.title,
        reason: form.reason,
        amount: form.amount,
        attachmentFileIds: formAttachments.value.map((item) => item.fileId),
      });
      const response = await submitLaborApplication(editingId.value, {
        attachmentFileIds: formAttachments.value.map((item) => item.fileId),
      });
      ElMessage.success('劳务申请已提交审批');
      dialogVisible.value = false;
      resetForm();
      await load();
      await openDetail(response.data.id);
      return;
    }

    const response = await createLaborApplication({
      laborType: form.laborType,
      targetUserId: form.targetUserId,
      title: form.title,
      reason: form.reason,
      amount: form.amount!,
      attachmentFileIds: formAttachments.value.map((item) => item.fileId),
      submitForApproval: true,
    });
    ElMessage.success('劳务申请已提交审批');
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

async function payApproved() {
  if (!detail.value) return;
  actionLoading.value = true;
  try {
    await markLaborPaid(detail.value.id, {});
    ElMessage.success('已标记为已发放');
    await load();
    await openDetail(detail.value.id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '发放失败');
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
);

onMounted(async () => {
  await Promise.all([load(), loadUserOptions()]);
});
</script>

<template>
  <section class="page-grid">
    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">经费 / 成员</p>
          <h2>劳务发放</h2>
          <p>支持草稿、提交审批、统一审批中心跟踪；老师可直接发放。</p>
        </div>
        <div class="panel-card__actions">
          <el-button v-if="canPay" type="success" @click="openDirectPay">直接发放</el-button>
          <el-button v-if="canCreate" type="primary" @click="openCreate">新建申请</el-button>
        </div>
      </div>

      <div class="approval-toolbar">
        <el-input v-model="query.keyword" placeholder="搜索编号/标题/人员" clearable @keyup.enter="load" />
        <el-button :loading="loading" @click="load">查询</el-button>
      </div>

      <div class="table-scroll">
        <el-table v-loading="loading" :data="rows" border stripe>
          <el-table-column prop="laborNo" label="编号" min-width="180" />
          <el-table-column prop="title" label="标题" min-width="220" />
          <el-table-column prop="amount" label="金额" min-width="120" />
          <el-table-column prop="statusCode" label="状态" min-width="140" />
          <el-table-column prop="applicantName" label="申请人" min-width="140" />
          <el-table-column prop="targetUserName" label="发放对象" min-width="140" />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
              <el-button v-if="row.approvalInstanceId" link type="success" @click="openApproval(row.approvalInstanceId)">
                审批
              </el-button>
              <el-button v-if="row.statusCode === 'DRAFT' || row.statusCode === 'RETURNED'" link @click="openEdit(row.id)">
                编辑
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

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

    <el-dialog v-model="dialogVisible" :title="formMode === 'directPay' ? '直接发放劳务' : formMode === 'edit' ? '编辑劳务申请' : '新建劳务申请'" width="760px" @closed="resetForm">
      <el-form ref="formRef" :model="form" label-width="110px">
        <el-form-item label="劳务类型" prop="laborType" :rules="[{ required: true, message: '请输入劳务类型' }]">
          <el-input v-model="form.laborType" />
        </el-form-item>
        <el-form-item label="发放对象" prop="targetUserId" :rules="[{ required: true, message: '请选择发放对象' }]">
          <el-select v-model="form.targetUserId" filterable placeholder="选择用户">
            <el-option v-for="user in userOptions" :key="user.id" :label="user.label" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" prop="title" :rules="[{ required: true, message: '请输入标题' }]">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="事由" prop="reason" :rules="[{ required: true, message: '请输入事由' }]">
          <el-input v-model="form.reason" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="金额" prop="amount" :rules="[{ required: true, message: '请输入金额' }]">
          <el-input-number v-model="form.amount" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="证明材料（选填）">
          <AttachmentUploader v-model="formAttachments" :remove-request="removeAttachmentForEdit" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button v-if="formMode !== 'directPay'" :loading="actionLoading" @click="saveDraft">保存草稿</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submit">
          {{ formMode === 'directPay' ? '确认发放' : '提交审批' }}
        </el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" size="760px">
      <template #header>
        <div>
          <strong>{{ detail?.laborNo || '劳务详情' }}</strong>
          <div v-if="detail">{{ detail.title }} / {{ detail.statusCode }}</div>
        </div>
      </template>

      <div v-if="detail" class="page-grid">
        <div class="panel-card">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">劳务信息</p>
              <h2>劳务信息</h2>
            </div>
            <el-button
              v-if="canPay && detail.statusCode === 'APPROVED'"
              type="primary"
              :loading="actionLoading"
              @click="payApproved"
            >
              标记已发放
            </el-button>
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="劳务类型">{{ detail.laborType }}</el-descriptions-item>
            <el-descriptions-item label="金额">{{ detail.amount }}</el-descriptions-item>
            <el-descriptions-item label="申请人">{{ detail.applicantName }}</el-descriptions-item>
            <el-descriptions-item label="发放对象">{{ detail.targetUserName }}</el-descriptions-item>
            <el-descriptions-item label="审批实例">
              <el-button v-if="detail.approvalInstanceId" link type="primary" @click="openApproval(detail.approvalInstanceId)">
                {{ detail.approvalInstanceId }}
              </el-button>
              <span v-else>-</span>
            </el-descriptions-item>
            <el-descriptions-item label="最新结果">{{ detail.latestResult || '-' }}</el-descriptions-item>
            <el-descriptions-item label="事由" :span="2">{{ detail.reason }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="panel-card">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">证明材料</p>
              <h2>附件</h2>
            </div>
          </div>
          <AttachmentUploader v-model="detailAttachments" readonly />
        </div>
      </div>
    </el-drawer>
  </section>
</template>

<style scoped>
.approval-toolbar {
  display: flex;
  gap: 12px;
  margin: 12px 0;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}
</style>
