<script setup lang="ts">
import { fetchPortalContentDetail, fetchPortalContentList, type PortalContentType } from '@web/api/portal';
import RichTextViewer from '@web/components/RichTextViewer.vue';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const pageTitle = computed(() => (typeof route.meta.title === 'string' ? route.meta.title : '展示'));
const contentType = computed(() => route.meta.contentType as PortalContentType);

const loading = ref(false);
const rows = ref<Awaited<ReturnType<typeof fetchPortalContentList>>['data']['items']>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 12,
});

const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<Awaited<ReturnType<typeof fetchPortalContentDetail>>['data'] | null>(null);

async function load() {
  loading.value = true;
  try {
    const response = await fetchPortalContentList({
      contentType: contentType.value,
      page: query.page,
      pageSize: query.pageSize,
    });
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(id: string) {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    const response = await fetchPortalContentDetail(id);
    detail.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载详情失败');
    detailVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
}

function goPortalHome() {
  void router.push('/portal');
}

watch(
  () => contentType.value,
  async () => {
    query.page = 1;
    await load();
  },
);

onMounted(load);
</script>

<template>
  <div class="portal-showcase-page">
    <header class="portal-showcase-page__top">
      <div class="portal-showcase-page__top-inner">
        <div>
          <p class="portal-showcase-page__eyebrow">门户展示</p>
          <h1 class="portal-showcase-page__title">{{ pageTitle }}</h1>
        </div>
        <el-button @click="goPortalHome">返回首页</el-button>
      </div>
    </header>

    <main class="portal-showcase-page__content">
      <div v-loading="loading" class="portal-showcase-page__grid">
        <button v-for="item in rows" :key="item.id" class="portal-showcase-card" type="button" @click="openDetail(item.id)">
          <div v-if="item.coverUrl" class="portal-showcase-card__cover">
            <img :src="item.coverUrl" alt="" />
          </div>
          <div class="portal-showcase-card__body">
            <strong class="portal-showcase-card__title">{{ item.title }}</strong>
            <p v-if="item.summary" class="portal-showcase-card__summary">{{ item.summary }}</p>
            <small class="portal-showcase-card__meta">{{ item.publishedAt }}</small>
          </div>
        </button>
      </div>

      <div class="pagination-row portal-showcase-page__pager">
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
    </main>

    <el-dialog v-model="detailVisible" :title="detail?.title || '详情'" width="860px" destroy-on-close>
      <div v-loading="detailLoading" class="detail-body">
        <el-image v-if="detail?.coverUrl" :src="detail.coverUrl" fit="cover" class="detail-cover" />
        <p v-if="detail?.summary" class="detail-summary">{{ detail.summary }}</p>
        <RichTextViewer :content="detail?.body" />
        <el-link v-if="detail?.linkUrl" :href="detail.linkUrl" target="_blank" type="primary">打开跳转链接</el-link>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.portal-showcase-page {
  min-height: 100vh;
  background: #f4f7fb;
}

.portal-showcase-page__top {
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid #d7dee8;
}

.portal-showcase-page__top-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

.portal-showcase-page__eyebrow {
  margin: 0 0 0.25rem;
  color: #64748b;
}

.portal-showcase-page__title {
  margin: 0;
  font-size: 1.6rem;
}

.portal-showcase-page__content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 2.5rem;
}

.portal-showcase-page__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.portal-showcase-card {
  display: grid;
  grid-template-rows: auto 1fr;
  padding: 0;
  border-radius: 1rem;
  border: 1px solid #d7dee8;
  background: #fff;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
}

.portal-showcase-card__cover img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}

.portal-showcase-card__body {
  padding: 1rem;
  display: grid;
  gap: 0.35rem;
}

.portal-showcase-card__title {
  color: #0d2235;
}

.portal-showcase-card__summary {
  margin: 0;
  color: #334155;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.portal-showcase-card__meta {
  color: #64748b;
}

.portal-showcase-page__pager {
  margin-top: 1rem;
}

.detail-body {
  display: grid;
  gap: 0.75rem;
}

.detail-cover {
  width: 100%;
  height: 240px;
  border-radius: 12px;
  border: 1px solid #e7edf4;
}

.detail-summary {
  margin: 0;
  color: #334155;
}

.detail-text {
  margin: 0;
  padding: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f8fbfd;
  border: 1px solid #e7edf4;
  border-radius: 12px;
  font-family: inherit;
  color: #0d2235;
}

.muted {
  color: #64748b;
}

@media (max-width: 720px) {
  .portal-showcase-page__top-inner,
  .portal-showcase-page__content {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>

