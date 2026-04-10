<script setup lang="ts">
import { type AttachmentItem, downloadAttachment, uploadAttachment } from '@web/api/attachments';
import type { UploadRequestOptions } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: AttachmentItem[];
    readonly?: boolean;
    multiple?: boolean;
    accept?: string;
    maxCount?: number;
  }>(),
  {
    readonly: false,
    multiple: true,
    accept: undefined,
    maxCount: undefined,
  },
);

const emit = defineEmits<{
  'update:modelValue': [AttachmentItem[]];
}>();

const attachments = computed({
  get: () => props.modelValue ?? [],
  set: (value: AttachmentItem[]) => emit('update:modelValue', value),
});

const canUpload = computed(() => {
  if (props.readonly) return false;
  if (!props.maxCount) return true;
  return attachments.value.length < props.maxCount;
});

function formatBytes(bytes: number | undefined) {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const display = unitIndex === 0 ? String(Math.round(value)) : value.toFixed(value >= 10 ? 1 : 2);
  return `${display} ${units[unitIndex]}`;
}

async function handleUpload(option: UploadRequestOptions) {
  try {
    const response = await uploadAttachment(option.file as File);
    attachments.value = [...attachments.value, response.data];
    ElMessage.success('附件上传成功');
    option.onSuccess?.(response.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '附件上传失败';
    ElMessage.error(message);
    option.onError?.(Object.assign(new Error(message), { status: 500, method: 'POST', url: '/attachments/upload' }));
  }
}

function removeAttachment(index: number) {
  const next = attachments.value.slice();
  next.splice(index, 1);
  attachments.value = next;
}

async function handleDownload(item: AttachmentItem) {
  try {
    const blob = await downloadAttachment(item.fileId, item.originalName);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.originalName || 'attachment';
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '附件下载失败');
  }
}
</script>

<template>
  <div>
    <el-upload
      v-if="!readonly"
      :http-request="handleUpload"
      :show-file-list="false"
      :multiple="multiple"
      :accept="accept"
      :disabled="!canUpload"
    >
      <el-button :disabled="!canUpload">上传附件</el-button>
    </el-upload>

    <el-empty v-if="!attachments.length" description="暂无附件" />
    <div v-else class="attachment-list">
      <div v-for="(item, index) in attachments" :key="item.fileId" class="attachment-list__item">
        <el-button link type="primary" @click="handleDownload(item)">{{ item.originalName }}</el-button>
        <span class="attachment-list__size">{{ formatBytes(item.fileSize) }}</span>
        <el-button v-if="!readonly" link type="danger" @click="removeAttachment(index)">删除</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.attachment-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.attachment-list__size {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>

