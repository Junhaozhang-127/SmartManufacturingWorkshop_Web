<script setup lang="ts">
import { fetchExampleMembers } from '@web/api/examples';
import { useUiStore } from '@web/stores/ui';
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

const uiStore = useUiStore();
const loading = ref(false);
const rows = ref<Awaited<ReturnType<typeof fetchExampleMembers>>['data']['items']>([]);
const total = ref(0);
const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
});

async function load() {
  loading.value = true;
  try {
    const response = await fetchExampleMembers(query.page, query.pageSize, query.keyword);
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '示例列表加载失败');
  } finally {
    loading.value = false;
  }
}

function openRow(row: (typeof rows.value)[number]) {
  uiStore.openDrawer('成员详情预览', row);
}

onMounted(load);
</script>

<template>
  <section class="page-grid">
    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">后端最小数据链路</p>
          <h2>示例列表页</h2>
        </div>
      </div>

      <div class="toolbar-row">
        <el-input
          v-model="query.keyword"
          placeholder="按姓名、账号、组织搜索"
          style="max-width: 22rem"
          @keyup.enter="load"
        />
        <el-button type="primary" @click="load">查询</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column label="姓名" prop="displayName" min-width="120" />
        <el-table-column label="账号" prop="username" min-width="120" />
        <el-table-column label="角色" min-width="140">
          <template #default="{ row }">
            <el-tag v-for="role in row.roles" :key="role" class="tag-spacing">
              {{ role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="组织" prop="orgUnitName" min-width="160" />
        <el-table-column label="岗位" prop="positionCode" min-width="120" />
        <el-table-column label="技能标签" min-width="180">
          <template #default="{ row }">
            <el-tag v-for="tag in row.skillTags" :key="tag" effect="plain" class="tag-spacing">
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openRow(row)">查看</el-button>
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
