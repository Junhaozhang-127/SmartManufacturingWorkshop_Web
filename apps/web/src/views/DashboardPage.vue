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
    ElMessage.error(error instanceof Error ? error.message : '首页聚合数据加载失败');
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
    // Keep navigation responsive even if read status update fails.
  }
  await navigate(path ?? '/notifications', query);
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section v-loading="loading" class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">PUB-02 Dashboard</p>
      <h2>{{ dashboard?.roleName || '角色化驾驶舱' }}</h2>
      <p>首页统一由后端聚合项目、成果、库存预警、待审批、资格提醒和通知消息，前端只负责展示与跳转。</p>
    </div>

    <div class="stat-grid dashboard-stat-grid">
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
            <p class="panel-card__eyebrow">Todo Summary</p>
            <h2>待办聚合</h2>
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

      <div class="panel-card">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">Shortcuts</p>
            <h2>快捷入口</h2>
          </div>
        </div>
        <div class="shortcut-grid">
          <button
            v-for="entry in dashboard?.shortcutGroups?.[0]?.entries || []"
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
    </div>

    <div class="dashboard-approval-grid">
      <div class="panel-card">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">Pending Approvals</p>
            <h2>我的待办</h2>
          </div>
          <el-button link type="primary" @click="navigate('/workflow/approval-center')">全部查看</el-button>
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
            <p class="panel-card__eyebrow">My Applications</p>
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

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">Notifications</p>
          <h2>通知消息</h2>
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
  </section>
</template>

<style scoped>
.stat-card--action {
  cursor: pointer;
}

.stat-card--action p {
  margin: 8px 0 0;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
</style>
