<script setup lang="ts">
import { fetchKnowledgeDetail } from '@web/api/creation';
import RichTextViewer from '@web/components/RichTextViewer.vue';
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const detail = ref<Awaited<ReturnType<typeof fetchKnowledgeDetail>>['data'] | null>(null);

function formatDateTime(value: string | null) {
  return value ? value.slice(0, 19).replace('T', ' ') : '-';
}

async function load() {
  const id = typeof route.params.id === 'string' ? route.params.id : '';
  if (!id) return;
  loading.value = true;
  try {
    const response = await fetchKnowledgeDetail(id);
    detail.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '智库详情加载失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section v-loading="loading" class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">智库详情</p>
      <h2>{{ detail?.title || '-' }}</h2>
      <p class="muted">
        作者：{{ detail?.author.displayName || '-' }}；审核人：{{ detail?.reviewer?.displayName || '-' }}；通过时间：{{
          formatDateTime(detail?.reviewedAt || null)
        }}
      </p>
      <p v-if="detail?.summary" class="muted">摘要：{{ detail.summary }}</p>
      <div class="toolbar-row toolbar-row--right">
        <el-button @click="router.push('/knowledge/contents')">返回列表</el-button>
      </div>
    </div>

    <div class="panel-card">
      <div v-if="detail?.coverUrl" class="cover">
        <img :src="detail.coverUrl" alt="" />
      </div>
      <article class="body">
        <RichTextViewer :content="detail?.body" />
      </article>
    </div>
  </section>
</template>

<style scoped>
.muted {
  color: #64748b;
}

.toolbar-row--right {
  justify-content: flex-end;
}

.cover {
  width: 100%;
  max-height: 360px;
  overflow: hidden;
  border-radius: 12px;
  margin-bottom: 16px;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

</style>

