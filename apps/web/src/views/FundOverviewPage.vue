<script setup lang="ts">
import { PermissionCodes } from '@smw/shared';
import { fetchFundOverview } from '@web/api/finance';
import { useAuthStore } from '@web/stores/auth';
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const summary = ref<Awaited<ReturnType<typeof fetchFundOverview>>['data'] | null>(null);
const canManageFunds = authStore.permissions.includes(PermissionCodes.fundCreate);

async function load() {
  loading.value = true;
  try {
    const response = await fetchFundOverview();
    summary.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '经费总览加载失败');
  } finally {
    loading.value = false;
  }
}

function openApprovalCenter() {
  void router.push({ name: 'workflow.approval-center' });
}

function openApplications() {
  if (!canManageFunds) return;
  void router.push({ name: 'funds.applications' });
}

function openProject(projectId: string | null) {
  if (!canManageFunds || !projectId) return;
  void router.push({ name: 'projects.detail', params: { projectId } });
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section v-loading="loading" class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">经费总览</p>
      <h2>经费总览</h2>
      <p>展示预算、预占、已用、可用余额，以及最近申请和待审批数量。</p>
    </div>

    <div v-if="summary" class="metrics-grid">
      <div class="metric-card">
        <span>预算总额</span>
        <strong>{{ summary.totalBudget.toFixed(2) }}</strong>
      </div>
      <div class="metric-card">
        <span>预占金额</span>
        <strong>{{ summary.reservedAmount.toFixed(2) }}</strong>
      </div>
      <div class="metric-card">
        <span>已用金额</span>
        <strong>{{ summary.usedAmount.toFixed(2) }}</strong>
      </div>
      <div class="metric-card">
        <span>可用余额</span>
        <strong>{{ summary.availableAmount.toFixed(2) }}</strong>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">预算卡片</p>
          <h2>账户卡片</h2>
        </div>
        <el-button v-if="canManageFunds" type="primary" @click="openApplications">进入申请页</el-button>
      </div>
      <el-row :gutter="16">
        <el-col v-for="item in summary?.accountCards || []" :key="item.id" :xs="24" :sm="12" :lg="8">
          <div class="sub-card">
            <div class="sub-card__header">
              <strong>{{ item.accountName }}</strong>
              <el-tag size="small">{{ item.statusCode }}</el-tag>
            </div>
            <p>{{ item.accountCode }} / {{ item.categoryName }}</p>
            <p>预算 {{ item.totalBudget.toFixed(2) }} / 可用 {{ item.availableAmount.toFixed(2) }}</p>
            <p>预占 {{ item.reservedAmount.toFixed(2) }} / 已用 {{ item.usedAmount.toFixed(2) }}</p>
            <div class="sub-card__actions">
              <el-button v-if="canManageFunds && item.projectId" link type="primary" @click="openProject(item.projectId)">
                项目详情
              </el-button>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">审批入口</p>
          <h2>待审批入口</h2>
        </div>
        <el-button @click="openApprovalCenter">打开审批中心</el-button>
      </div>
      <el-alert :title="`当前待处理经费审批 ${summary?.pendingApprovalCount || 0} 条`" type="info" :closable="false" />
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">最新申请</p>
          <h2>最近申请</h2>
        </div>
      </div>
      <el-table :data="summary?.latestApplications || []">
        <el-table-column prop="applicationNo" label="申请单号" min-width="150" />
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="expenseType" label="费用类型" min-width="130" />
        <el-table-column prop="amount" label="金额" min-width="110" />
        <el-table-column prop="statusCode" label="状态" min-width="120" />
        <el-table-column prop="paymentStatus" label="支付状态" min-width="120" />
        <el-table-column prop="projectName" label="关联项目" min-width="160" />
      </el-table>
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">近期支出占位</p>
          <h2>最近支出占位</h2>
        </div>
      </div>
      <el-empty v-if="!summary?.recentExpensePlaceholder.length" description="暂无数据" />
      <el-descriptions v-else :column="1" border>
        <el-descriptions-item v-for="item in summary.recentExpensePlaceholder" :key="item.label" :label="item.label">
          {{ item.value }}
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </section>
</template>

<style scoped>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.metric-card,
.sub-card {
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

.sub-card {
  min-height: 160px;
  margin-bottom: 16px;
}

.sub-card__header,
.sub-card__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
