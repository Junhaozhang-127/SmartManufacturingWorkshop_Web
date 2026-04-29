<script setup lang="ts">
import { ConsumableInventoryStatus, ConsumableStatus, InventoryTxnType, PermissionCodes } from '@smw/shared';
import type { ConsumableItem } from '@smw/shared';
import {
  createConsumableRequest,
  createInventoryInbound,
  createInventoryOutbound,
  fetchConsumables,
} from '@web/api/inventory';
import { useAuthz } from '@web/composables/useAuthz';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';

const { hasPermission } = useAuthz();

const canCreateRequest = computed(() => hasPermission(PermissionCodes.inventoryCreate));
const canUpdateInventory = computed(() => hasPermission(PermissionCodes.inventoryUpdate));

const loading = ref(false);
const actionLoading = ref(false);
const rows = ref<ConsumableItem[]>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  categoryName: '',
  statusCode: '',
  warningFlag: '' as '' | 'true' | 'false',
});

const requestVisible = ref(false);
const requestFormRef = ref<FormInstance>();
const requestTarget = ref<ConsumableItem | null>(null);
const requestForm = reactive({
  quantity: undefined as number | undefined,
  purpose: '',
  projectId: '',
  projectName: '',
});

const stockTxnVisible = ref(false);
const stockTxnMode = ref<InventoryTxnType>(InventoryTxnType.INBOUND);
const stockTxnFormRef = ref<FormInstance>();
const stockTxnTarget = ref<ConsumableItem | null>(null);
const stockTxnForm = reactive({
  quantity: undefined as number | undefined,
  projectId: '',
  projectName: '',
  remark: '',
});

const inventoryStatusOptions = [
  { label: '全部库存状态', value: '' },
  { label: '正常', value: ConsumableInventoryStatus.NORMAL },
  { label: '低库存', value: ConsumableInventoryStatus.LOW_STOCK },
  { label: '缺货', value: ConsumableInventoryStatus.OUT_OF_STOCK },
  { label: '停用', value: ConsumableInventoryStatus.DISABLED },
];

function resolveInventoryTagType(status: string) {
  switch (status) {
    case ConsumableInventoryStatus.NORMAL:
      return 'success';
    case ConsumableInventoryStatus.LOW_STOCK:
      return 'warning';
    case ConsumableInventoryStatus.OUT_OF_STOCK:
      return 'danger';
    default:
      return 'info';
  }
}

function resolveBaseStatusTagType(status: string) {
  return status === ConsumableStatus.ACTIVE ? 'success' : 'info';
}

async function load() {
  loading.value = true;
  try {
    const response = await fetchConsumables({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword.trim() || undefined,
      categoryName: query.categoryName.trim() || undefined,
      statusCode: query.statusCode || undefined,
      warningFlag: query.warningFlag || undefined,
    });
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '耗材库存加载失败');
  } finally {
    loading.value = false;
  }
}

function openRequest(row: ConsumableItem) {
  requestTarget.value = row;
  requestForm.quantity = undefined;
  requestForm.purpose = '';
  requestForm.projectId = '';
  requestForm.projectName = '';
  requestVisible.value = true;
}

async function submitRequest() {
  if (!requestTarget.value || !requestFormRef.value) return;
  await requestFormRef.value.validate();
  actionLoading.value = true;
  try {
    await createConsumableRequest({
      consumableId: requestTarget.value.id,
      quantity: requestForm.quantity!,
      purpose: requestForm.purpose.trim(),
      projectId: requestForm.projectId.trim() || undefined,
      projectName: requestForm.projectName.trim() || undefined,
    });
    ElMessage.success('申领已提交审批');
    requestVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '申领提交失败');
  } finally {
    actionLoading.value = false;
  }
}

function openStockTxn(row: ConsumableItem, mode: InventoryTxnType) {
  stockTxnTarget.value = row;
  stockTxnMode.value = mode;
  stockTxnForm.quantity = undefined;
  stockTxnForm.projectId = '';
  stockTxnForm.projectName = '';
  stockTxnForm.remark = '';
  stockTxnVisible.value = true;
}

async function submitStockTxn() {
  if (!stockTxnTarget.value || !stockTxnFormRef.value) return;
  await stockTxnFormRef.value.validate();
  actionLoading.value = true;
  try {
    const payload = {
      consumableId: stockTxnTarget.value.id,
      quantity: stockTxnForm.quantity!,
      projectId: stockTxnForm.projectId.trim() || undefined,
      projectName: stockTxnForm.projectName.trim() || undefined,
      remark: stockTxnForm.remark.trim() || undefined,
    };
    if (stockTxnMode.value === InventoryTxnType.INBOUND) {
      await createInventoryInbound(payload);
    } else {
      await createInventoryOutbound(payload);
    }
    ElMessage.success(stockTxnMode.value === InventoryTxnType.INBOUND ? '已完成入库' : '已完成出库');
    stockTxnVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '库存操作失败');
  } finally {
    actionLoading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">耗材管理</p>
      <h2>耗材库存</h2>
      <p>支持库存查询、低库存预警查看、申领提交，以及最小化入库/出库操作。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-input v-model="query.keyword" placeholder="搜索耗材编号/名称/分类" clearable @keyup.enter="load" />
        <el-input v-model="query.categoryName" placeholder="分类筛选" clearable @keyup.enter="load" />
        <el-select v-model="query.statusCode" style="width: 10rem">
          <el-option v-for="item in inventoryStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="query.warningFlag" style="width: 10rem">
          <el-option label="全部预警状态" value="" />
          <el-option label="仅预警" value="true" />
          <el-option label="仅非预警" value="false" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="consumableCode" label="耗材编号" min-width="130" />
        <el-table-column prop="consumableName" label="耗材名称" min-width="160" />
        <el-table-column prop="categoryName" label="分类" min-width="120" />
        <el-table-column prop="specification" label="规格" min-width="140" />
        <el-table-column prop="unitName" label="单位" width="90" />
        <el-table-column label="当前库存" width="110">
          <template #default="{ row }">{{ row.currentStock }}</template>
        </el-table-column>
        <el-table-column label="最低预警值" width="120">
          <template #default="{ row }">{{ row.warningThreshold }}</template>
        </el-table-column>
        <el-table-column label="库存状态" width="120">
          <template #default="{ row }">
            <el-tag :type="resolveInventoryTagType(row.inventoryStatus)">{{ row.inventoryStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="基础状态" width="110">
          <template #default="{ row }">
            <el-tag :type="resolveBaseStatusTagType(row.statusCode)">{{ row.statusCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预警" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.warningFlag" type="danger">低库存</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="defaultLocation" label="库位" min-width="120" />
        <el-table-column prop="orgUnitName" label="归属组织" min-width="120" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canCreateRequest" link type="primary" @click="openRequest(row)">申领</el-button>
            <el-button
              v-if="canUpdateInventory"
              link
              type="success"
              @click="openStockTxn(row, InventoryTxnType.INBOUND)"
            >
              入库
            </el-button>
            <el-button
              v-if="canUpdateInventory"
              link
              type="warning"
              @click="openStockTxn(row, InventoryTxnType.OUTBOUND)"
            >
              出库
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

    <el-dialog v-model="requestVisible" title="耗材申领" width="520px" destroy-on-close>
      <el-form ref="requestFormRef" :model="requestForm" label-width="110px">
        <el-form-item label="耗材">
          <el-input :model-value="requestTarget?.consumableName || '-'" disabled />
        </el-form-item>
        <el-form-item label="申领数量" prop="quantity" :rules="[{ required: true, message: '请输入申领数量' }]">
          <el-input-number v-model="requestForm.quantity" :min="0.01" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="用途说明" prop="purpose" :rules="[{ required: true, message: '请输入用途说明' }]">
          <el-input v-model="requestForm.purpose" type="textarea" :rows="4" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="关联项目编号">
          <el-input v-model="requestForm.projectId" maxlength="64" />
        </el-form-item>
        <el-form-item label="关联项目名称">
          <el-input v-model="requestForm.projectName" maxlength="128" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="requestVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitRequest">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="stockTxnVisible"
      :title="stockTxnMode === InventoryTxnType.INBOUND ? '耗材入库' : '耗材出库'"
      width="520px"
      destroy-on-close
    >
      <el-form ref="stockTxnFormRef" :model="stockTxnForm" label-width="110px">
        <el-form-item label="耗材">
          <el-input :model-value="stockTxnTarget?.consumableName || '-'" disabled />
        </el-form-item>
        <el-form-item label="数量" prop="quantity" :rules="[{ required: true, message: '请输入数量' }]">
          <el-input-number v-model="stockTxnForm.quantity" :min="0.01" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="项目编号">
          <el-input v-model="stockTxnForm.projectId" maxlength="64" />
        </el-form-item>
        <el-form-item label="项目名称">
          <el-input v-model="stockTxnForm.projectName" maxlength="128" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="stockTxnForm.remark" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockTxnVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitStockTxn">提交</el-button>
      </template>
    </el-dialog>
  </section>
</template>
