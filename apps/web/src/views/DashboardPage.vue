<script setup lang="ts">
import { fetchApprovalDashboardSummary } from '@web/api/approval';
import { useAuthStore } from '@web/stores/auth';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);
const approvalSummary = ref<Awaited<ReturnType<typeof fetchApprovalDashboardSummary>>['data'] | null>(null);

const cards = computed(() => [
  {
    label: '当前角色',
    value: authStore.activeRole?.roleName ?? '未登录',
  },
  {
    label: '权限数量',
    value: String(authStore.permissions.length),
  },
  {
    label: '我的待办',
    value: String(approvalSummary.value?.pendingCount ?? 0),
  },
  {
    label: '我的审批',
    value: String(approvalSummary.value?.processedCount ?? 0),
  },
  {
    label: '退回记录',
    value: String(approvalSummary.value?.returnedCount ?? 0),
  },
  {
    label: '数据范围',
    value: authStore.user?.dataScopeContext.scope ?? 'UNKNOWN',
  },
]);

async function load() {
  loading.value = true;
  try {
    const response = await fetchApprovalDashboardSummary();
    approvalSummary.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审批聚合数据加载失败');
  } finally {
    loading.value = false;
  }
}

async function navigate(path: string) {
  await router.push(path);
}

onMounted(load);
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">PUB-02 Dashboard</p>
      <h2>角色化首页驾驶舱</h2>
      <p>
        首页聚合统一审批中心数据，展示我的待办、我的审批与退回记录。后续业务模块只要接入通用审批引擎，即可自动进入此处聚合视图。
      </p>
    </div>

    <div class="stat-grid dashboard-stat-grid">
      <article v-for="card in cards" :key="card.label" class="stat-card">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">Quick Access</p>
          <h2>快捷入口</h2>
        </div>
      </div>
      <div class="shortcut-grid">
        <button
          v-for="entry in authStore.dashboard?.shortcutEntries || []"
          :key="entry.code"
          class="shortcut-card"
          type="button"
          @click="navigate(entry.path)"
        >
          <strong>{{ entry.label }}</strong>
          <span>{{ entry.path }}</span>
        </button>
      </div>
    </div>

    <div class="dashboard-approval-grid">
      <div class="panel-card">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">Approval Inbox</p>
            <h2>我的待办</h2>
          </div>
          <el-button link type="primary" @click="navigate('/workflow/approval-center')">进入审批中心</el-button>
        </div>
        <el-skeleton :loading="loading" animated :rows="4">
          <template #default>
            <div v-if="approvalSummary?.pendingItems.length" class="dashboard-list">
              <button
                v-for="item in approvalSummary.pendingItems"
                :key="item.id"
                class="dashboard-list__item"
                type="button"
                @click="navigate('/workflow/approval-center')"
              >
                <strong>{{ item.title }}</strong>
                <span>{{ item.currentNodeName || '待处理' }}</span>
              </button>
            </div>
            <el-empty v-else description="当前没有待办审批" />
          </template>
        </el-skeleton>
      </div>

      <div class="panel-card">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">Approval Archive</p>
            <h2>我的审批</h2>
          </div>
          <el-button link type="primary" @click="navigate('/workflow/approval-center')">查看全部</el-button>
        </div>
        <el-skeleton :loading="loading" animated :rows="4">
          <template #default>
            <div v-if="approvalSummary?.processedItems.length" class="dashboard-list">
              <button
                v-for="item in approvalSummary.processedItems"
                :key="item.id"
                class="dashboard-list__item"
                type="button"
                @click="navigate('/workflow/approval-center')"
              >
                <strong>{{ item.title }}</strong>
                <span>{{ item.status }}</span>
              </button>
            </div>
            <el-empty v-else description="当前没有已处理记录" />
          </template>
        </el-skeleton>
      </div>
    </div>
  </section>
</template>
