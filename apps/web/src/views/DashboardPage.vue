<script setup lang="ts">
import { fetchHomeDashboard, markNotificationAsRead } from '@web/api/system';
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const dashboard = ref<Awaited<ReturnType<typeof fetchHomeDashboard>>['data'] | null>(null);

async function load() {
  loading.value = true;
  try {
    const response = await fetchHomeDashboard();
    dashboard.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '首页数据加载失败');
  } finally {
    loading.value = false;
  }
}

async function navigate(path?: string, query?: Record<string, string> | null) {
  if (!path) return;
  await router.push({ path, query: query ?? undefined });
}

async function openNotification(id: string, path: string | null, query: Record<string, string> | null) {
  try {
    await markNotificationAsRead(id);
  } catch {
    // Ignore read-state failures and keep navigation responsive.
  }
  await navigate(path ?? '/notifications', query);
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section v-loading="loading" class="page-grid dashboard-page">
    <div class="hero-card dashboard-hero">
      <p class="hero-card__eyebrow">首页总览</p>
      <h2>{{ dashboard?.roleName || '角色化首页' }}</h2>
      <p class="dashboard-hero-desc">首页统一展示待办、申请、通知，帮助你快速进入当前最需要处理的工作。</p>
    </div>

    <div class="dashboard-approval-grid dashboard-top-grid">
      <div class="panel-card dashboard-notification-panel">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">通知消息</p>
            <h2>最新通知</h2>
          </div>
          <el-button link type="primary" @click="navigate('/notifications')">消息中心</el-button>
        </div>
        <div v-if="dashboard?.notifications.length" class="dashboard-list">
          <button
            v-for="item in dashboard.notifications"
            :key="item.id"
            class="dashboard-list__item"
            type="button"
            @click="openNotification(item.id, item.routePath, item.routeQuery)"
          >
            <strong>{{ item.title }}</strong>
            <span>{{ item.read ? '已读' : '未读' }} / {{ item.categoryCode }}</span>
          </button>
        </div>
        <el-empty v-else description="当前没有通知消息" />
      </div>

      <div class="panel-card dashboard-todo-summary">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">待办汇总</p>
            <h2>工作概览</h2>
          </div>
          <el-button link type="primary" @click="navigate('/workflow/approval-center')">进入审批中心</el-button>
        </div>
        <el-descriptions v-if="dashboard" :column="2" border>
          <el-descriptions-item label="待审批">{{ dashboard.todoSummary.pendingApprovalCount }}</el-descriptions-item>
          <el-descriptions-item label="未读消息">{{ dashboard.todoSummary.unreadNotificationCount }}</el-descriptions-item>
          <el-descriptions-item label="我的申请">{{ dashboard.todoSummary.myApplicationCount }}</el-descriptions-item>
          <el-descriptions-item label="资格提醒">{{ dashboard.todoSummary.qualificationReminderCount }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <div class="stat-grid dashboard-stat-grid dashboard-metrics">
      <article
        v-for="card in dashboard?.metricCards || []"
        :key="card.code"
        class="stat-card stat-card--action"
        @click="navigate(card.path)"
      >
        <span>{{ card.title }}</span>
        <strong>{{ card.value }}{{ card.unit || '' }}</strong>
        <p>{{ card.description }}</p>
      </article>
    </div>

    <div class="dashboard-approval-grid">
      <div class="panel-card">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">待审批事项</p>
            <h2>我的待办</h2>
          </div>
          <el-button link type="primary" @click="navigate('/workflow/approval-center')">查看全部</el-button>
        </div>
        <div v-if="dashboard?.pendingApprovals.length" class="dashboard-list">
          <button
            v-for="item in dashboard.pendingApprovals"
            :key="item.id"
            class="dashboard-list__item"
            type="button"
            @click="navigate('/workflow/approval-center', { focus: item.id })"
          >
            <strong>{{ item.title }}</strong>
            <span>{{ item.currentNodeName || '待处理' }}</span>
          </button>
        </div>
        <el-empty v-else description="当前没有待办审批" />
      </div>

      <div class="panel-card">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">申请记录</p>
            <h2>我的申请</h2>
          </div>
          <el-button link type="primary" @click="navigate('/profile')">进入个人中心</el-button>
        </div>
        <div v-if="dashboard?.myApplications.length" class="dashboard-list">
          <button
            v-for="item in dashboard.myApplications"
            :key="item.id"
            class="dashboard-list__item"
            type="button"
            @click="navigate('/workflow/approval-center', { focus: item.id })"
          >
            <strong>{{ item.title }}</strong>
            <span>{{ item.status }}</span>
          </button>
        </div>
        <el-empty v-else description="当前没有申请记录" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.dashboard-page {
  gap: 0.75rem;
}

.dashboard-hero {
  padding: 1rem 1.25rem;
}

.dashboard-hero-desc {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.dashboard-metrics {
  gap: 0.75rem;
}

.dashboard-metrics .stat-card {
  padding: 1rem;
}

.dashboard-top-grid {
  align-items: stretch;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.dashboard-top-grid > .panel-card {
  display: flex;
  flex-direction: column;
}

.dashboard-top-grid :deep(.el-descriptions),
.dashboard-top-grid .dashboard-list {
  flex: 1;
  min-height: 0;
}

.stat-card--action {
  cursor: pointer;
}

.stat-card--action p {
  margin: 8px 0 0;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
</style>
