<script setup lang="ts">
import {
  type DeviceLedgerDetail,
  type DeviceLedgerListItem,
  fetchDeviceLedgerDetail,
  fetchDeviceLedgerList,
} from '@web/api/device';
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const detailLoading = ref(false);
const rows = ref<DeviceLedgerListItem[]>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  statusCode: '',
});

const detailVisible = ref(false);
const detail = ref<DeviceLedgerDetail | null>(null);

const statusOptions = [
  { label: '全部', value: '' },
  { label: '闲置', value: 'IDLE' },
  { label: '在用', value: 'IN_USE' },
  { label: '维修中', value: 'REPAIRING' },
  { label: '待报废', value: 'SCRAP_PENDING' },
  { label: '已报废', value: 'SCRAPPED' },
];

async function load() {
  loading.value = true;
  try {
    const response = await fetchDeviceLedgerList({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword.trim() || undefined,
      statusCode: query.statusCode || undefined,
    });
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '设备台账加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(id: string) {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    const response = await fetchDeviceLedgerDetail(id);
    detail.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '设备详情加载失败');
    detailVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
}

function openRepairList(row: DeviceLedgerListItem) {
  if (row.latestRepairId) {
    void router.push({ name: 'devices.repairs', query: { focus: row.latestRepairId } });
    return;
  }
  void router.push({ name: 'devices.repairs' });
}

function openLatestRepair() {
  if (!detail.value?.latestRepairId) return;
  void router.push({ name: 'devices.repairs', query: { focus: detail.value.latestRepairId } });
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">设备与资产</p>
      <h2>设备台账</h2>
      <p>统一查看设备状态、责任人、组织归属与最新报修关联，并可一键跳转到设备报修工单。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-input v-model="query.keyword" placeholder="搜索设备编号/名称/类别/型号" clearable @keyup.enter="load" />
        <el-select v-model="query.statusCode" style="width: 10rem">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="deviceCode" label="设备编号" min-width="140" />
        <el-table-column prop="deviceName" label="设备名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="categoryName" label="类别" min-width="140" show-overflow-tooltip />
        <el-table-column prop="model" label="型号" min-width="140" show-overflow-tooltip />
        <el-table-column prop="statusCode" label="状态" width="120" />
        <el-table-column prop="orgUnitName" label="组织" min-width="140" show-overflow-tooltip />
        <el-table-column prop="responsibleUserName" label="负责人" width="140" show-overflow-tooltip />
        <el-table-column prop="locationLabel" label="位置" min-width="140" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            <el-button link type="primary" @click="openRepairList(row)">报修工单</el-button>
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

    <el-drawer v-model="detailVisible" size="56%" destroy-on-close>
      <template #header>
        <div>
          <strong>{{ detail?.deviceName || '设备详情' }}</strong>
          <p class="drawer-caption">{{ detail?.deviceCode }} / {{ detail?.statusCode }}</p>
        </div>
      </template>

      <div v-loading="detailLoading" class="page-grid">
        <div v-if="detail" class="panel-card">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">基础信息</p>
              <h2>设备信息</h2>
            </div>
            <el-button v-if="detail.latestRepairId" @click="openLatestRepair">查看最新报修</el-button>
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="设备编号">{{ detail.deviceCode }}</el-descriptions-item>
            <el-descriptions-item label="设备名称">{{ detail.deviceName }}</el-descriptions-item>
            <el-descriptions-item label="类别">{{ detail.categoryName }}</el-descriptions-item>
            <el-descriptions-item label="型号">{{ detail.model || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ detail.statusCode }}</el-descriptions-item>
            <el-descriptions-item label="组织">{{ detail.orgUnitName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="负责人">{{ detail.responsibleUserName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="位置">{{ detail.locationLabel || '-' }}</el-descriptions-item>
            <el-descriptions-item label="购置日期">{{ detail.purchaseDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="质保到期">{{ detail.warrantyUntil || '-' }}</el-descriptions-item>
            <el-descriptions-item label="购置金额">{{ detail.purchaseAmount ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="最近变更">
              {{ detail.statusChangedAt ? new Date(detail.statusChangedAt).toLocaleString() : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ detail.remarks || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div v-if="detail?.latestRepair" class="panel-card">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">报修关联</p>
              <h2>最新报修</h2>
            </div>
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="报修单号">{{ detail.latestRepair.repairNo }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ detail.latestRepair.statusCode }}</el-descriptions-item>
            <el-descriptions-item label="报修时间">
              {{ new Date(detail.latestRepair.reportedAt).toLocaleString() }}
            </el-descriptions-item>
            <el-descriptions-item label="最新结果">{{ detail.latestRepair.latestResult || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div v-if="detail" class="panel-card">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">状态留痕</p>
              <h2>状态留痕</h2>
            </div>
          </div>
          <el-empty v-if="!detail.statusLogs.length" description="暂无状态留痕" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="(item, index) in detail.statusLogs"
              :key="`${item.actionType}-${index}`"
              :timestamp="item.createdAt"
            >
              {{ item.actionType }}: {{ item.fromStatus || 'INIT' }} -> {{ item.toStatus || '-' }}
              <span v-if="item.comment">（{{ item.comment }}）</span>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-drawer>
  </section>
</template>
