<script setup lang="ts">
import { RoleCode } from '@smw/shared';
import { fetchOrgOverview } from '@web/api/member';
import { useAuthStore } from '@web/stores/auth';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref } from 'vue';

const authStore = useAuthStore();
const loading = ref(false);
const tree = ref<Awaited<ReturnType<typeof fetchOrgOverview>>['data']['tree']>([]);
const summary = ref({
  orgUnitCount: 0,
  memberCount: 0,
  internCount: 0,
  regularizationPendingCount: 0,
});

const scopeTitle = computed(() => {
  switch (authStore.activeRoleCode) {
    case RoleCode.TEACHER:
      return '实验室组织树';
    case RoleCode.MINISTER:
      return authStore.orgProfile?.departmentName
        ? `${authStore.orgProfile.departmentName}组织树`
        : '当前部门组织树';
    default:
      return '组织树';
  }
});

const scopeDescription = computed(() => {
  switch (authStore.activeRoleCode) {
    case RoleCode.TEACHER:
      return '显示实验室整体组织结构、负责人和成员统计。';
    case RoleCode.MINISTER:
      return '仅显示当前部长所属部门及下属小组的组织结构。';
    default:
      return '显示当前可见范围内的组织结构。';
  }
});

function formatUnitType(unitType: string) {
  switch (unitType) {
    case 'LAB':
      return '实验室';
    case 'DEPARTMENT':
      return '部门';
    case 'GROUP':
      return '小组';
    default:
      return unitType;
  }
}

async function load() {
  loading.value = true;
  try {
    const response = await fetchOrgOverview();
    tree.value = response.data.tree;
    summary.value = response.data.summary;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '组织架构加载失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">组织架构</p>
      <h2>{{ scopeTitle }}</h2>
      <p>{{ scopeDescription }}</p>
    </div>

    <div class="stat-grid dashboard-stat-grid">
      <article class="stat-card">
        <span>组织节点</span>
        <strong>{{ summary.orgUnitCount }}</strong>
      </article>
      <article class="stat-card">
        <span>成员总数</span>
        <strong>{{ summary.memberCount }}</strong>
      </article>
      <article class="stat-card">
        <span>实习成员</span>
        <strong>{{ summary.internCount }}</strong>
      </article>
      <article class="stat-card">
        <span>待转正成员</span>
        <strong>{{ summary.regularizationPendingCount }}</strong>
      </article>
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">树形结构</p>
          <h2>{{ scopeTitle }}</h2>
        </div>
      </div>

      <el-empty v-if="!loading && !tree.length" description="当前范围内暂无组织数据" />
      <el-tree v-else v-loading="loading" :data="tree" node-key="id" default-expand-all>
        <template #default="{ data }">
          <div class="org-tree-card">
            <div class="org-tree-card__content">
              <strong>{{ data.unitName }}</strong>
              <p>{{ formatUnitType(data.unitType) }} | 负责人：{{ data.leaderName || '未设置' }}</p>
            </div>
            <div class="org-tree-card__meta">
              <el-tag effect="plain">成员 {{ data.memberCount }}</el-tag>
              <el-tag type="success" effect="plain">正式 {{ data.activeMemberCount }}</el-tag>
              <el-tag type="warning" effect="plain">待转正 {{ data.regularizationPendingCount }}</el-tag>
            </div>
          </div>
        </template>
      </el-tree>
    </div>
  </section>
</template>

<style scoped>
:deep(.el-tree-node__content) {
  align-items: flex-start;
  min-height: 3.5rem;
  height: auto;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

:deep(.el-tree-node__expand-icon) {
  margin-top: 0.4rem;
}

:deep(.el-tree-node__children .el-tree-node__content) {
  min-height: 3.75rem;
}
</style>
