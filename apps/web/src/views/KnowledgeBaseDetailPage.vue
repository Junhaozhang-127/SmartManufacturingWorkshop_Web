<script setup lang="ts">
import { type AttachmentItem, listBusinessAttachments } from '@web/api/attachments';
import { fetchKnowledgeDetail } from '@web/api/creation';
import AttachmentUploader from '@web/components/attachments/AttachmentUploader.vue';
import RichTextViewer from '@web/components/RichTextViewer.vue';
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const detail = ref<Awaited<ReturnType<typeof fetchKnowledgeDetail>>['data'] | null>(null);
const attachments = ref<AttachmentItem[]>([]);

const CREATION_ATTACHMENT_USAGE_TYPE = 'CREATION_ATTACHMENT';
const KNOWLEDGE_BUSINESS_TYPE = 'KNOWLEDGE_CONTENT';

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
    const attachmentResponse = await listBusinessAttachments({
      businessType: KNOWLEDGE_BUSINESS_TYPE,
      businessId: id,
      usageType: CREATION_ATTACHMENT_USAGE_TYPE,
    });
    attachments.value = attachmentResponse.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '智库详情加载失败');
    attachments.value = [];
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

      <section class="attachments">
        <h3>附件</h3>
        <AttachmentUploader v-model="attachments" readonly />
      </section>
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

.attachments {
  margin-top: 16px;
}

</style>

