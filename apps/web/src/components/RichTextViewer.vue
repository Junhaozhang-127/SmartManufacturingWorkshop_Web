<script setup lang="ts">
import DOMPurify from 'dompurify';
import { computed } from 'vue';

const props = defineProps<{
  content?: string | null;
}>();

function looksLikeHtml(value: string) {
  if (!value) return false;
  if (!/[<>]/.test(value)) return false;
  return /<\/(p|div|span|h1|h2|h3|ul|ol|li|pre|code|blockquote|img|hr|a)\b/i.test(value);
}

const isHtml = computed(() => (typeof props.content === 'string' ? looksLikeHtml(props.content) : false));

const sanitizedHtml = computed(() => {
  const html = props.content ?? '';
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
});
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div v-if="content && isHtml" class="viewer viewer--html" v-html="sanitizedHtml" />
  <pre v-else-if="content" class="viewer viewer--plain">{{ content }}</pre>
  <p v-else class="muted">暂无正文</p>
</template>

<style scoped>
.muted {
  color: #64748b;
}

.viewer {
  color: #0f172a;
  line-height: 1.7;
  font-size: 14px;
}

.viewer--plain {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}

.viewer--html :deep(img) {
  max-width: 100%;
  height: auto;
}

.viewer--html :deep(pre) {
  padding: 10px 12px;
  border-radius: 8px;
  background: #0b1220;
  color: #e2e8f0;
  overflow: auto;
}

.viewer--html :deep(blockquote) {
  margin: 10px 0;
  padding: 8px 12px;
  border-left: 4px solid #d7dee8;
  background: #f8fafc;
  color: #334155;
}

.viewer--html :deep(hr) {
  border: none;
  border-top: 1px solid #d7dee8;
  margin: 14px 0;
}
</style>
