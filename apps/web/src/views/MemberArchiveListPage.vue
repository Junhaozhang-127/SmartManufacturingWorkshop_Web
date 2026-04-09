<script setup lang="ts">
import type { MemberListItem, MemberListResult } from '@smw/shared';
import { http } from '@web/api/client';
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const rows = ref<MemberListItem[]>([]);
const total = ref(0);
const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  statusCode: '',
});

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '实习中', value: 'INTERN' },
  { label: '转正处理中', value: 'REGULARIZATION_PENDING' },
  { label: '转正驳回', value: 'REGULARIZATION_REJECTED' },
  { label: '正式成员', value: 'ACTIVE' },
];

function resolveTagType(statusCode: string) {
  switch (statusCode) {
    case 'ACTIVE':
      return 'success';
    case 'REGULARIZATION_PENDING':
      return 'warning';
    case 'REGULARIZATION_REJECTED':
      return 'danger';
    default:
      return 'info';
  }
}

async function load() {
  loading.value = true;
  try {
    const response = await http.get<never, { data: MemberListResult }>('/members', {
      params: {
        ...query,
        viewAll: true,
        memberStatus: query.statusCode || undefined,
        statusCode: undefined,
      },
    });
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '成员档案列表加载失败');
  } finally {
    loading.value = false;
  }
}

function openDetail(row: MemberListItem) {
  void router.push({ name: 'members.detail', params: { id: row.id } });
}

onMounted(load);
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">成员档案</p>
      <h2>成员档案列表</h2>
      <p>支持搜索、筛选、分页和状态标签，所有身份默认展示全部成员档案列表。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row member-toolbar">
        <el-input v-model="query.keyword" placeholder="搜索姓名、组织、岗位" clearable @keyup.enter="load" />
        <el-select v-model="query.statusCode" style="width: 12rem">
          <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="displayName" label="姓名" min-width="120" />
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-tag :type="resolveTagType(row.statusCode)">{{ row.statusCode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="orgUnitName" label="组织" min-width="150" />
        <el-table-column prop="positionCode" label="岗位" min-width="120" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
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
  </section>
</template>
