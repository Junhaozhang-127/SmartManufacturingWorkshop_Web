<script setup lang="ts">
import type { OrgTreeNode } from '@smw/shared';
import { fetchOrgOverview } from '@web/api/member';
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';

const loading = ref(false);
const tree = ref<OrgTreeNode[]>([]);
const summary = ref({
  orgUnitCount: 0,
  memberCount: 0,
  internCount: 0,
  regularizationPendingCount: 0,
});

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

onMounted(load);
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">ORG-01 Organization Overview</p>
      <h2>组织架构总览</h2>
      <p>展示部门、组别、负责人和成员规模，并按当前角色自动收敛可见范围。</p>
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
        <span>实习生</span>
        <strong>{{ summary.internCount }}</strong>
      </article>
      <article class="stat-card">
        <span>转正处理中</span>
        <strong>{{ summary.regularizationPendingCount }}</strong>
      </article>
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">Tree View</p>
          <h2>组织树</h2>
        </div>
      </div>

      <el-tree v-loading="loading" :data="tree" node-key="id" default-expand-all>
        <template #default="{ data }">
          <div class="org-tree-node">
            <div>
              <strong>{{ data.unitName }}</strong>
              <p>{{ data.unitType }} · 负责人：{{ data.leaderName || '未设置' }}</p>
            </div>
            <div class="org-tree-node__meta">
              <el-tag effect="plain">成员 {{ data.memberCount }}</el-tag>
              <el-tag type="success" effect="plain">正式 {{ data.activeMemberCount }}</el-tag>
              <el-tag type="warning" effect="plain">转正中 {{ data.regularizationPendingCount }}</el-tag>
            </div>
          </div>
        </template>
      </el-tree>
    </div>
  </section>
</template>
