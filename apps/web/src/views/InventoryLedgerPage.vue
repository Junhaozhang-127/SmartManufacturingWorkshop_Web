<script setup lang="ts">
import { PermissionCodes } from '@smw/shared';
import { createConsumable, fetchConsumableDetail, fetchConsumableList } from '@web/api/inventory';
import { useAuthz } from '@web/composables/useAuthz';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';

const { hasPermission } = useAuthz();
const canCreate = computed(() => hasPermission(PermissionCodes.inventoryCreate));

const loading = ref(false);
const detailLoading = ref(false);
const submitLoading = ref(false);
const detailVisible = ref(false);
const createVisible = ref(false);
const createFormRef = ref<FormInstance>();
const detail = ref<Awaited<ReturnType<typeof fetchConsumableDetail>>['data'] | null>(null);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  categoryName: '',
  statusCode: '',
  warningFlag: '',
});

const form = reactive({
  consumableName: '',
  categoryName: '',
  specification: '',
  unitName: '个',
  warningThreshold: 0,
  initialStock: undefined as number | undefined,
  defaultLocation: '',
});

const list = ref<Awaited<ReturnType<typeof fetchConsumableList>>['data']['items']>([]);
const total = ref(0);

const statusOptions = ['NORMAL', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISABLED'];

async function loadList() {
  loading.value = true;
  try {
    const response = await fetchConsumableList(query);
    list.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '耗材台账加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(id: string) {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    const response = await fetchConsumableDetail(id);
    detail.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '耗材详情加载失败');
  } finally {
    detailLoading.value = false;
  }
}

function resetForm() {
  form.consumableName = '';
  form.categoryName = '';
  form.specification = '';
  form.unitName = '个';
  form.warningThreshold = 0;
  form.initialStock = undefined;
  form.defaultLocation = '';
}

async function submitConsumable() {
  if (!createFormRef.value) return;
  await createFormRef.value.validate();

  submitLoading.value = true;
  try {
    const response = await createConsumable({
      consumableName: form.consumableName,
      categoryName: form.categoryName,
      specification: form.specification || undefined,
      unitName: form.unitName,
      warningThreshold: form.warningThreshold,
      initialStock: form.initialStock,
      defaultLocation: form.defaultLocation || undefined,
    });
    ElMessage.success('耗材台账已创建');
    createVisible.value = false;
    await loadList();
    await openDetail(response.data.id);
    resetForm();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '耗材创建失败');
  } finally {
    submitLoading.value = false;
  }
}

onMounted(loadList);
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">INV-01 Consumable Ledger</p>
      <h2>耗材库存台账</h2>
      <p>统一维护耗材基础档案、库存余量、预警阈值与补货触发状态。P0 采用冗余库存字段 + 交易流水审计，优先保证查询筛选和审批联动的稳定性。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-input v-model="query.keyword" placeholder="搜索耗材名称 / 编码" clearable @keyup.enter="loadList" />
        <el-input v-model="query.categoryName" placeholder="分类" clearable @keyup.enter="loadList" />
        <el-select v-model="query.statusCode" clearable placeholder="库存状态">
          <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.warningFlag" clearable placeholder="是否预警">
          <el-option label="是" value="true" />
          <el-option label="否" value="false" />
        </el-select>
        <el-button type="primary" @click="loadList">查询</el-button>
        <el-button v-if="canCreate" @click="createVisible = true">新增耗材</el-button>
      </div>

      <el-table v-loading="loading" :data="list">
        <el-table-column prop="consumableCode" label="耗材编码" min-width="150" />
        <el-table-column prop="consumableName" label="耗材名称" min-width="180" />
        <el-table-column prop="categoryName" label="分类" min-width="120" />
        <el-table-column prop="specification" label="规格" min-width="160" />
        <el-table-column prop="currentStock" label="库存余量" min-width="120" />
        <el-table-column prop="warningThreshold" label="预警阈值" min-width="120" />
        <el-table-column label="状态" min-width="140">
          <template #default="{ row }">
            <el-tag :type="row.warningFlag ? 'danger' : 'success'">{{ row.inventoryStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="补货触发" min-width="180">
          <template #default="{ row }">
            <span v-if="row.replenishmentTriggeredAt">{{ row.replenishmentTriggeredAt }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          layout="total, prev, pager, next"
          :total="total"
          @current-change="loadList"
          @size-change="loadList"
        />
      </div>
    </div>

    <el-drawer v-model="detailVisible" size="760px">
      <template #header>
        <div>
          <strong>{{ detail?.consumableName || '耗材详情' }}</strong>
          <div v-if="detail" class="drawer-subtitle">{{ detail.consumableCode }} / {{ detail.inventoryStatus }}</div>
        </div>
      </template>

      <div v-loading="detailLoading" class="device-detail-grid">
        <template v-if="detail">
          <div class="panel-card">
            <div class="panel-card__header">
              <div>
                <p class="panel-card__eyebrow">Ledger</p>
                <h2>基础信息</h2>
              </div>
            </div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="耗材名称">{{ detail.consumableName }}</el-descriptions-item>
              <el-descriptions-item label="分类">{{ detail.categoryName }}</el-descriptions-item>
              <el-descriptions-item label="规格">{{ detail.specification || '-' }}</el-descriptions-item>
              <el-descriptions-item label="单位">{{ detail.unitName }}</el-descriptions-item>
              <el-descriptions-item label="库存余量">{{ detail.currentStock }}</el-descriptions-item>
              <el-descriptions-item label="预警阈值">{{ detail.warningThreshold }}</el-descriptions-item>
              <el-descriptions-item label="状态">{{ detail.inventoryStatus }}</el-descriptions-item>
              <el-descriptions-item label="默认库位">{{ detail.defaultLocation || '-' }}</el-descriptions-item>
              <el-descriptions-item label="补货触发时间" :span="2">
                {{ detail.replenishmentTriggeredAt || '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="panel-card">
            <div class="panel-card__header">
              <div>
                <p class="panel-card__eyebrow">Trace</p>
                <h2>最近库存流水</h2>
              </div>
            </div>
            <el-table :data="detail.recentTxns">
              <el-table-column prop="txnType" label="交易类型" min-width="120" />
              <el-table-column prop="quantity" label="数量" min-width="100" />
              <el-table-column prop="balanceAfter" label="结余" min-width="100" />
              <el-table-column prop="projectName" label="关联项目" min-width="160" />
              <el-table-column prop="operatorName" label="操作人" min-width="120" />
              <el-table-column prop="txnAt" label="时间" min-width="180" />
            </el-table>
          </div>
        </template>
      </div>
    </el-drawer>

    <el-dialog v-model="createVisible" title="新增耗材" width="620px" @closed="resetForm">
      <el-form ref="createFormRef" :model="form" label-width="110px">
        <el-form-item label="耗材名称" prop="consumableName" :rules="[{ required: true, message: '请输入耗材名称' }]">
          <el-input v-model="form.consumableName" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryName" :rules="[{ required: true, message: '请输入分类' }]">
          <el-input v-model="form.categoryName" />
        </el-form-item>
        <el-form-item label="规格">
          <el-input v-model="form.specification" />
        </el-form-item>
        <el-form-item label="单位" prop="unitName" :rules="[{ required: true, message: '请输入单位' }]">
          <el-input v-model="form.unitName" />
        </el-form-item>
        <el-form-item label="预警阈值" prop="warningThreshold" :rules="[{ required: true, message: '请输入预警阈值' }]">
          <el-input-number v-model="form.warningThreshold" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="初始库存">
          <el-input-number v-model="form.initialStock" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="默认库位">
          <el-input v-model="form.defaultLocation" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitConsumable">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>
