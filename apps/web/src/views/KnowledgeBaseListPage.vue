<script setup lang="ts">
import { fetchKnowledgeContents } from '@web/api/creation';
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const loading = ref(false);
const rows = ref<Awaited<ReturnType<typeof fetchKnowledgeContents>>['data']['items']>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 12,
  keyword: '',
});

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : '-';
}

async function load() {
  loading.value = true;
  try {
    const response = await fetchKnowledgeContents({
      ...query,
      keyword: query.keyword.trim() || undefined,
    });
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '智库加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(id: string) {
  await router.push(`/knowledge/contents/${id}`);
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">智库</p>
      <h2>智库内容</h2>
      <p>展示审核通过并标记进入智库的创作内容；未被首页推荐的通过内容至少可在此查看。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-input v-model="query.keyword" placeholder="搜索标题/摘要" clearable @keyup.enter="load" />
        <el-button type="primary" @click="load">查询</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="title" label="标题" min-width="240" show-overflow-tooltip />
        <el-table-column prop="author.displayName" label="作者" width="180" />
        <el-table-column label="审核通过日期" width="160">
          <template #default="{ row }">{{ formatDate(row.reviewedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-row">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :page-sizes="[12, 24, 48]"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          @change="load"
        />
      </div>
    </div>
  </section>
</template>

