<script setup lang="ts">
import { fetchApprovalDashboardSummary } from '@web/api/approval';
import { fetchDeviceDashboardSummary } from '@web/api/device';
import { useAuthStore } from '@web/stores/auth';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);
const approvalSummary = ref<Awaited<ReturnType<typeof fetchApprovalDashboardSummary>>['data'] | null>(null);
const deviceSummary = ref<Awaited<ReturnType<typeof fetchDeviceDashboardSummary>>['data'] | null>(null);

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
    label: '待审批',
    value: String(approvalSummary.value?.pendingCount ?? 0),
  },
  {
    label: '异常设备',
    value: String(deviceSummary.value?.abnormalDeviceCount ?? 0),
  },
  {
    label: '待处理报修',
    value: String(deviceSummary.value?.pendingRepairCount ?? 0),
  },
  {
    label: '维修处理中',
    value: String(deviceSummary.value?.processingRepairCount ?? 0),
  },
]);

async function load() {
  loading.value = true;
  try {
    const [approvalResponse, deviceResponse] = await Promise.all([
      fetchApprovalDashboardSummary(),
      fetchDeviceDashboardSummary(),
    ]);
    approvalSummary.value = approvalResponse.data;
    deviceSummary.value = deviceResponse.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '首页聚合数据加载失败');
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
      <h2>系统驾驶舱</h2>
      <p>首页同时聚合审批中心和设备维修模块数据，P0 可直接看到异常设备、待处理报修和最近工单动态。</p>
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
            <p class="panel-card__eyebrow">Device Repairs</p>
            <h2>最近报修</h2>
          </div>
          <el-button link type="primary" @click="navigate('/devices/repairs')">查看工单</el-button>
        </div>
        <el-skeleton :loading="loading" animated :rows="4">
          <template #default>
            <div v-if="deviceSummary?.recentRepairs.length" class="dashboard-list">
              <button
                v-for="item in deviceSummary.recentRepairs"
                :key="item.id"
                class="dashboard-list__item"
                type="button"
                @click="navigate(`/devices/repairs?focus=${item.id}`)"
              >
                <strong>{{ item.deviceName }}</strong>
                <span>{{ item.statusCode }} / {{ item.severity }}</span>
              </button>
            </div>
            <el-empty v-else description="当前没有异常报修" />
          </template>
        </el-skeleton>
      </div>
    </div>
  </section>
</template>
