<script setup lang="ts">
import { fetchProjectFundDetail } from '@web/api/finance';
import { ElMessage } from 'element-plus';
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const detail = ref<Awaited<ReturnType<typeof fetchProjectFundDetail>>['data'] | null>(null);

async function load() {
  const projectId = route.params.projectId;
  if (typeof projectId !== 'string') return;

  loading.value = true;
  try {
    const response = await fetchProjectFundDetail(projectId);
    detail.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '项目经费详情加载失败');
  } finally {
    loading.value = false;
  }
}

function openApplication(id: string) {
  void router.push({ name: 'funds.applications', query: { focus: id } });
}

function openRepair(id: string) {
  void router.push({ name: 'devices.repairs', query: { focus: id } });
}

watch(
  () => route.params.projectId,
  () => {
    void load();
  },
);

onMounted(() => {
  void load();
});
</script>

<template>
  <section v-loading="loading" class="page-grid">
    <div v-if="detail" class="hero-card">
      <p class="hero-card__eyebrow">Project Detail</p>
      <h2>{{ detail.projectName || detail.projectId }}</h2>
      <p>仅展示该项目关联经费、经费申请和维修联动记录，不扩展为完整项目管理模块。</p>
    </div>

    <div v-if="detail" class="metrics-grid">
      <div class="metric-card">
        <span>预算总额</span>
        <strong>{{ detail.totalBudget.toFixed(2) }}</strong>
      </div>
      <div class="metric-card">
        <span>预占金额</span>
        <strong>{{ detail.reservedAmount.toFixed(2) }}</strong>
      </div>
      <div class="metric-card">
        <span>已用金额</span>
        <strong>{{ detail.usedAmount.toFixed(2) }}</strong>
      </div>
      <div class="metric-card">
        <span>可用余额</span>
        <strong>{{ detail.availableAmount.toFixed(2) }}</strong>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">Accounts</p>
          <h2>关联经费账户</h2>
        </div>
      </div>
      <el-table :data="detail?.accountCards || []">
        <el-table-column prop="accountCode" label="账户编码" min-width="140" />
        <el-table-column prop="accountName" label="账户名称" min-width="180" />
        <el-table-column prop="totalBudget" label="预算总额" min-width="120" />
        <el-table-column prop="reservedAmount" label="预占" min-width="120" />
        <el-table-column prop="usedAmount" label="已用" min-width="120" />
        <el-table-column prop="availableAmount" label="可用余额" min-width="120" />
      </el-table>
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">Applications</p>
          <h2>关联费用申请</h2>
        </div>
      </div>
      <el-table :data="detail?.applications || []">
        <el-table-column prop="applicationNo" label="申请单号" min-width="150" />
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="expenseType" label="费用类型" min-width="140" />
        <el-table-column prop="amount" label="金额" min-width="110" />
        <el-table-column prop="statusCode" label="状态" min-width="120" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="openApplication(row.id)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">Repair Links</p>
          <h2>设备维修联动</h2>
        </div>
      </div>
      <el-empty v-if="!detail?.linkedRepairs.length" description="暂无维修联动记录" />
      <el-table v-else :data="detail?.linkedRepairs || []">
        <el-table-column prop="repairNo" label="维修单号" min-width="150" />
        <el-table-column prop="deviceName" label="设备名称" min-width="180" />
        <el-table-column prop="amount" label="金额" min-width="120" />
        <el-table-column prop="fundLinkCode" label="经费联动编码" min-width="150" />
        <el-table-column prop="statusCode" label="状态" min-width="120" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link @click="openRepair(row.id)">查看维修</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </section>
</template>

<style scoped>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.metric-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 16px;
  padding: 16px;
  background: #fff;
}

.metric-card span {
  display: block;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.metric-card strong {
  font-size: 24px;
}
</style>
