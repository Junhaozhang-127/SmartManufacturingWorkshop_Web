<script setup lang="ts">
import { PermissionCodes } from '@smw/shared';
import {
  createConsumableRequest,
  createInboundTxn,
  createOutboundTxn,
  fetchConsumableDetail,
  fetchConsumableList,
  fetchConsumableRequestDetail,
  fetchConsumableRequestList,
  fetchInventoryTxnList,
} from '@web/api/inventory';
import { useAuthz } from '@web/composables/useAuthz';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const { hasPermission } = useAuthz();
const canCreate = computed(() => hasPermission(PermissionCodes.inventoryCreate));
const canOperate = computed(() => hasPermission(PermissionCodes.inventoryUpdate));

const loading = ref(false);
const txnLoading = ref(false);
const detailLoading = ref(false);
const actionLoading = ref(false);
const detailVisible = ref(false);
const requestVisible = ref(false);
const inboundVisible = ref(false);
const outboundVisible = ref(false);
const requestFormRef = ref<FormInstance>();
const inboundFormRef = ref<FormInstance>();
const outboundFormRef = ref<FormInstance>();

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  categoryName: '',
  statusCode: '',
  warningFlag: '',
});

const txnQuery = reactive({
  page: 1,
  pageSize: 8,
  keyword: '',
  txnType: '',
});

const requestDetail = ref<Awaited<ReturnType<typeof fetchConsumableRequestDetail>>['data'] | null>(null);
const requestList = ref<Awaited<ReturnType<typeof fetchConsumableRequestList>>['data']['items']>([]);
const txnList = ref<Awaited<ReturnType<typeof fetchInventoryTxnList>>['data']['items']>([]);
const consumableOptions = ref<Awaited<ReturnType<typeof fetchConsumableList>>['data']['items']>([]);
const total = ref(0);
const txnTotal = ref(0);

const requestForm = reactive({
  consumableId: '',
  quantity: undefined as number | undefined,
  purpose: '',
  projectId: '',
  projectName: '',
});

const txnForm = reactive({
  consumableId: '',
  quantity: undefined as number | undefined,
  projectId: '',
  projectName: '',
  remark: '',
});

const currentTxnMode = ref<'inbound' | 'outbound'>('inbound');
const selectedConsumable = ref<Awaited<ReturnType<typeof fetchConsumableDetail>>['data'] | null>(null);

const requestStatusOptions = ['IN_APPROVAL', 'FULFILLED', 'REJECTED', 'WITHDRAWN'];
const txnTypeOptions = ['INBOUND', 'OUTBOUND', 'REQUEST_OUTBOUND'];

async function loadConsumableOptions() {
  const response = await fetchConsumableList({ page: 1, pageSize: 200 });
  consumableOptions.value = response.data.items;
}

async function loadRequests() {
  loading.value = true;
  try {
    const response = await fetchConsumableRequestList(query);
    requestList.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '申领单加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadTxns() {
  txnLoading.value = true;
  try {
    const response = await fetchInventoryTxnList(txnQuery);
    txnList.value = response.data.items;
    txnTotal.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '库存流水加载失败');
  } finally {
    txnLoading.value = false;
  }
}

async function openDetail(id: string) {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    const response = await fetchConsumableRequestDetail(id);
    requestDetail.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '申领单详情加载失败');
  } finally {
    detailLoading.value = false;
  }
}

function openApproval(approvalInstanceId: string | null) {
  if (!approvalInstanceId) return;
  void router.push({ name: 'workflow.approval-center', query: { focus: approvalInstanceId } });
}

async function syncSelectedConsumable() {
  if (!txnForm.consumableId) {
    selectedConsumable.value = null;
    return;
  }

  try {
    const response = await fetchConsumableDetail(txnForm.consumableId);
    selectedConsumable.value = response.data;
  } catch {
    selectedConsumable.value = null;
  }
}

function resetRequestForm() {
  requestForm.consumableId = '';
  requestForm.quantity = undefined;
  requestForm.purpose = '';
  requestForm.projectId = '';
  requestForm.projectName = '';
}

function resetTxnForm() {
  txnForm.consumableId = '';
  txnForm.quantity = undefined;
  txnForm.projectId = '';
  txnForm.projectName = '';
  txnForm.remark = '';
  selectedConsumable.value = null;
}

async function submitRequest() {
  if (!requestFormRef.value) return;
  await requestFormRef.value.validate();

  actionLoading.value = true;
  try {
    const response = await createConsumableRequest({
      consumableId: requestForm.consumableId,
      quantity: requestForm.quantity!,
      purpose: requestForm.purpose,
      projectId: requestForm.projectId || undefined,
      projectName: requestForm.projectName || undefined,
    });
    ElMessage.success('申领单已提交审批');
    requestVisible.value = false;
    await Promise.all([loadRequests(), loadTxns(), loadConsumableOptions()]);
    resetRequestForm();
    await openDetail(response.data.id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '申领单提交失败');
  } finally {
    actionLoading.value = false;
  }
}

async function submitTxn() {
  const activeFormRef = currentTxnMode.value === 'inbound' ? inboundFormRef.value : outboundFormRef.value;
  if (!activeFormRef) return;
  await activeFormRef.validate();

  actionLoading.value = true;
  try {
    const payload = {
      consumableId: txnForm.consumableId,
      quantity: txnForm.quantity!,
      projectId: txnForm.projectId || undefined,
      projectName: txnForm.projectName || undefined,
      remark: txnForm.remark || undefined,
    };
    if (currentTxnMode.value === 'inbound') {
      await createInboundTxn(payload);
      ElMessage.success('入库完成');
      inboundVisible.value = false;
    } else {
      await createOutboundTxn(payload);
      ElMessage.success('出库完成');
      outboundVisible.value = false;
    }
    resetTxnForm();
    await Promise.all([loadRequests(), loadTxns(), loadConsumableOptions()]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '库存变更失败');
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

watch(
  () => txnForm.consumableId,
  () => {
    void syncSelectedConsumable();
  },
);

onMounted(async () => {
  await Promise.all([loadRequests(), loadTxns(), loadConsumableOptions()]);
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">申领与出入库</p>
      <h2>耗材申领与出入库</h2>
      <p>申领单统一进入审批中心；审批通过后自动出库并写入库存流水。P0 同时支持手工入库、手工出库、项目关联字段和全链路审计追踪。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-input v-model="query.keyword" placeholder="搜索申领单号 / 耗材 / 用途" clearable @keyup.enter="loadRequests" />
        <el-input v-model="query.categoryName" placeholder="分类" clearable @keyup.enter="loadRequests" />
        <el-select v-model="query.statusCode" clearable placeholder="申领状态">
          <el-option v-for="item in requestStatusOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.warningFlag" clearable placeholder="是否预警">
          <el-option label="是" value="true" />
          <el-option label="否" value="false" />
        </el-select>
        <el-button type="primary" @click="loadRequests">查询</el-button>
        <el-button v-if="canCreate" @click="requestVisible = true">发起申领</el-button>
        <el-button
          v-if="canOperate"
          @click="
            currentTxnMode = 'inbound';
            inboundVisible = true;
          "
        >
          手工入库
        </el-button>
        <el-button
          v-if="canOperate"
          @click="
            currentTxnMode = 'outbound';
            outboundVisible = true;
          "
        >
          手工出库
        </el-button>
      </div>

      <el-table v-loading="loading" :data="requestList">
        <el-table-column prop="requestNo" label="申领单号" min-width="150" />
        <el-table-column prop="consumableName" label="耗材" min-width="180" />
        <el-table-column prop="quantity" label="数量" min-width="90" />
        <el-table-column prop="statusCode" label="状态" min-width="120" />
        <el-table-column prop="applicantName" label="申请人" min-width="110" />
        <el-table-column prop="projectName" label="关联项目" min-width="160" />
        <el-table-column prop="latestResult" label="处理结果" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            <el-button v-if="row.approvalInstanceId" link type="success" @click="openApproval(row.approvalInstanceId)">
              审批
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
          @current-change="loadRequests"
          @size-change="loadRequests"
        />
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">审批概览</p>
          <h2>库存流水</h2>
        </div>
      </div>
      <div class="toolbar-row">
        <el-input v-model="txnQuery.keyword" placeholder="搜索耗材 / 项目 / 备注" clearable @keyup.enter="loadTxns" />
        <el-select v-model="txnQuery.txnType" clearable placeholder="交易类型">
          <el-option v-for="item in txnTypeOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-button type="primary" @click="loadTxns">查询</el-button>
      </div>
      <el-table v-loading="txnLoading" :data="txnList">
        <el-table-column prop="txnType" label="交易类型" min-width="120" />
        <el-table-column prop="consumableName" label="耗材" min-width="180" />
        <el-table-column prop="quantity" label="数量" min-width="90" />
        <el-table-column prop="balanceAfter" label="结余" min-width="90" />
        <el-table-column prop="projectName" label="关联项目" min-width="160" />
        <el-table-column prop="operatorName" label="操作人" min-width="120" />
        <el-table-column prop="txnAt" label="发生时间" min-width="180" />
      </el-table>

      <div class="table-footer">
        <el-pagination
          v-model:current-page="txnQuery.page"
          v-model:page-size="txnQuery.pageSize"
          layout="total, prev, pager, next"
          :total="txnTotal"
          @current-change="loadTxns"
          @size-change="loadTxns"
        />
      </div>
    </div>

    <el-drawer v-model="detailVisible" size="760px">
      <template #header>
        <div>
          <strong>{{ requestDetail?.requestNo || '申领单详情' }}</strong>
          <div v-if="requestDetail" class="drawer-subtitle">
            {{ requestDetail.consumableName }} / {{ requestDetail.statusCode }}
          </div>
        </div>
      </template>

      <div v-loading="detailLoading" class="device-detail-grid">
        <template v-if="requestDetail">
          <div class="panel-card">
            <div class="panel-card__header">
              <div>
                <p class="panel-card__eyebrow">申领详情</p>
                <h2>申请信息</h2>
              </div>
            </div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="耗材">{{ requestDetail.consumableName }}</el-descriptions-item>
              <el-descriptions-item label="库存状态">{{ requestDetail.consumable.inventoryStatus }}</el-descriptions-item>
              <el-descriptions-item label="申请数量">{{ requestDetail.quantity }}</el-descriptions-item>
              <el-descriptions-item label="当前库存">{{ requestDetail.consumable.currentStock }}</el-descriptions-item>
              <el-descriptions-item label="申请人">{{ requestDetail.applicantName }}</el-descriptions-item>
              <el-descriptions-item label="审批实例">
                <el-button
                  v-if="requestDetail.approvalInstanceId"
                  link
                  type="primary"
                  @click="openApproval(requestDetail.approvalInstanceId)"
                >
                  {{ requestDetail.approvalInstanceId }}
                </el-button>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="关联项目">{{ requestDetail.projectName || requestDetail.projectId || '-' }}</el-descriptions-item>
              <el-descriptions-item label="用途" :span="2">{{ requestDetail.purpose }}</el-descriptions-item>
              <el-descriptions-item label="处理结果" :span="2">{{ requestDetail.latestResult || '-' }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="panel-card">
            <div class="panel-card__header">
              <div>
                <p class="panel-card__eyebrow">处理留痕</p>
                <h2>状态留痕</h2>
              </div>
            </div>
            <el-timeline>
              <el-timeline-item
                v-for="(item, index) in requestDetail.statusLogs"
                :key="`${item.actionType}-${index}`"
                :timestamp="item.createdAt"
              >
                {{ item.actionType }}: {{ item.fromStatus || 'INIT' }} -> {{ item.toStatus || '-' }}
                <span v-if="item.comment">（{{ item.comment }}）</span>
              </el-timeline-item>
            </el-timeline>
          </div>
        </template>
      </div>
    </el-drawer>

    <el-dialog v-model="requestVisible" title="发起耗材申领" width="620px" @closed="resetRequestForm">
      <el-form ref="requestFormRef" :model="requestForm" label-width="110px">
        <el-form-item label="耗材" prop="consumableId" :rules="[{ required: true, message: '请选择耗材' }]">
          <el-select v-model="requestForm.consumableId" filterable>
            <el-option
              v-for="item in consumableOptions"
              :key="item.id"
              :label="`${item.consumableName} / 库存 ${item.currentStock}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="申领数量" prop="quantity" :rules="[{ required: true, message: '请输入申领数量' }]">
          <el-input-number v-model="requestForm.quantity" :min="0.01" :precision="2" />
        </el-form-item>
        <el-form-item label="用途" prop="purpose" :rules="[{ required: true, message: '请输入用途' }]">
          <el-input v-model="requestForm.purpose" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="项目编号"><el-input v-model="requestForm.projectId" /></el-form-item>
        <el-form-item label="项目名称"><el-input v-model="requestForm.projectName" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="requestVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitRequest">提交审批</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="inboundVisible"
      title="手工入库"
      width="620px"
      @closed="resetTxnForm"
    >
      <el-form ref="inboundFormRef" :model="txnForm" label-width="110px">
        <el-form-item label="耗材" prop="consumableId" :rules="[{ required: true, message: '请选择耗材' }]">
          <el-select v-model="txnForm.consumableId" filterable>
            <el-option
              v-for="item in consumableOptions"
              :key="item.id"
              :label="`${item.consumableName} / 当前 ${item.currentStock}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="入库数量" prop="quantity" :rules="[{ required: true, message: '请输入入库数量' }]">
          <el-input-number v-model="txnForm.quantity" :min="0.01" :precision="2" />
        </el-form-item>
        <el-form-item label="当前库存"><span>{{ selectedConsumable?.currentStock ?? '-' }}</span></el-form-item>
        <el-form-item label="项目编号"><el-input v-model="txnForm.projectId" /></el-form-item>
        <el-form-item label="项目名称"><el-input v-model="txnForm.projectName" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="txnForm.remark" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inboundVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitTxn">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="outboundVisible"
      title="手工出库"
      width="620px"
      @closed="resetTxnForm"
    >
      <el-form ref="outboundFormRef" :model="txnForm" label-width="110px">
        <el-form-item label="耗材" prop="consumableId" :rules="[{ required: true, message: '请选择耗材' }]">
          <el-select v-model="txnForm.consumableId" filterable>
            <el-option
              v-for="item in consumableOptions"
              :key="item.id"
              :label="`${item.consumableName} / 当前 ${item.currentStock}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="出库数量" prop="quantity" :rules="[{ required: true, message: '请输入出库数量' }]">
          <el-input-number v-model="txnForm.quantity" :min="0.01" :precision="2" />
        </el-form-item>
        <el-form-item label="当前库存"><span>{{ selectedConsumable?.currentStock ?? '-' }}</span></el-form-item>
        <el-form-item label="项目编号"><el-input v-model="txnForm.projectId" /></el-form-item>
        <el-form-item label="项目名称"><el-input v-model="txnForm.projectName" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="txnForm.remark" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="outboundVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitTxn">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>
