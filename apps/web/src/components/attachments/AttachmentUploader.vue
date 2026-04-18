<script setup lang="ts">
import {
  type AttachmentItem,
  deleteMyTempAttachment,
  downloadAttachment,
  uploadAttachmentWithProgress,
} from '@web/api/attachments';
import type { UploadRawFile, UploadRequestOptions } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';

type UploadStatus = 'uploading' | 'success' | 'error';

interface PendingUploadItem {
  uid: number | string;
  file: File;
  name: string;
  size: number;
  status: Exclude<UploadStatus, 'success'>;
  percent?: number;
  errorMessage?: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: AttachmentItem[];
    readonly?: boolean;
    multiple?: boolean;
    accept?: string;
    maxCount?: number;
    uploadRequest?: (_file: File, _onProgress?: (_percent: number) => void) => Promise<{ data: AttachmentItem }>;
    downloadRequest?: (_attachment: AttachmentItem) => Promise<Blob>;
    removeRequest?: (_attachment: AttachmentItem) => Promise<void>;
  }>(),
  {
    readonly: false,
    multiple: true,
    accept: undefined,
    maxCount: undefined,
    uploadRequest: (file: File, onProgress?: (_percent: number) => void) =>
      uploadAttachmentWithProgress(file, {
        onUploadProgress: (event) => {
          const total = event.total;
          if (!total) return;
          const percent = Math.min(99, Math.max(0, Math.round((event.loaded / total) * 100)));
          onProgress?.(percent);
        },
      }),
    downloadRequest: (attachment: AttachmentItem) => downloadAttachment(attachment.fileId, attachment.originalName),
    removeRequest: (attachment: AttachmentItem) => deleteMyTempAttachment(attachment.fileId).then(() => undefined),
  },
);

const emit = defineEmits<{
  'update:modelValue': [AttachmentItem[]];
}>();

const attachments = computed({
  get: () => props.modelValue ?? [],
  set: (value: AttachmentItem[]) => emit('update:modelValue', value),
});

const pendingUploads = ref<PendingUploadItem[]>([]);

const totalCount = computed(() => attachments.value.length + pendingUploads.value.length);
const canUpload = computed(() => {
  if (props.readonly) return false;
  if (!props.maxCount) return true;
  return totalCount.value < props.maxCount;
});

watch(
  () => attachments.value.length,
  (next, prev) => {
    if (prev > 0 && next === 0) {
      pendingUploads.value = [];
    }
  },
);

function formatBytes(bytes: number | undefined) {
  if (bytes == null) return '-';
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

function statusText(status: UploadStatus) {
  if (status === 'uploading') return '上传中';
  if (status === 'success') return '上传成功';
  return '上传失败';
}

function statusTagType(status: UploadStatus) {
  if (status === 'uploading') return 'info';
  if (status === 'success') return 'success';
  return 'danger';
}

function getUid(file: UploadRawFile) {
  return (file as unknown as { uid?: number | string }).uid ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function removePending(uid: PendingUploadItem['uid']) {
  pendingUploads.value = pendingUploads.value.filter((item) => item.uid !== uid);
}

function updatePendingPercent(uid: PendingUploadItem['uid'], percent: number) {
  pendingUploads.value = pendingUploads.value.map((item) => (item.uid === uid ? { ...item, percent } : item));
}

async function handleUpload(option: UploadRequestOptions) {
  if (!canUpload.value) {
    const message = props.maxCount ? `最多只能上传 ${props.maxCount} 个附件` : '暂不可上传';
    ElMessage.warning(message);
    option.onError?.(Object.assign(new Error(message), { status: 400, method: 'POST', url: '/attachments/upload' }));
    return;
  }

  const file = option.file as UploadRawFile;
  const uid = getUid(file);

  pendingUploads.value = [
    ...pendingUploads.value,
    {
      uid,
      file,
      name: file.name,
      size: file.size,
      status: 'uploading',
      percent: undefined,
    },
  ];

  try {
    const response = await props.uploadRequest(file, (percent) => {
      updatePendingPercent(uid, percent);
      option.onProgress?.({ percent } as any);
    });
    removePending(uid);
    attachments.value = [...attachments.value, response.data];
    ElMessage.success('附件上传成功');
    option.onSuccess?.(response.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '附件上传失败';
    pendingUploads.value = pendingUploads.value.map((item) =>
      item.uid === uid ? { ...item, status: 'error', errorMessage: message } : item,
    );
    ElMessage.error(message);
    option.onError?.(Object.assign(new Error(message), { status: 500, method: 'POST', url: '/attachments/upload' }));
  }
}

async function handleDownload(item: AttachmentItem) {
  try {
    const blob = await props.downloadRequest(item);
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

async function handleRemoveAttachment(index: number) {
  const target = attachments.value[index];
  if (!target) return;

  try {
    await props.removeRequest(target);
    const next = attachments.value.slice();
    next.splice(index, 1);
    attachments.value = next;
    ElMessage.success('附件已删除');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '附件删除失败');
  }
}

async function retryPendingUpload(uid: PendingUploadItem['uid']) {
  const target = pendingUploads.value.find((item) => item.uid === uid);
  if (!target) return;
  pendingUploads.value = pendingUploads.value.map((item) =>
    item.uid === uid ? { ...item, status: 'uploading', percent: undefined } : item,
  );

  try {
    const response = await props.uploadRequest(target.file, (percent) => updatePendingPercent(uid, percent));
    removePending(uid);
    attachments.value = [...attachments.value, response.data];
    ElMessage.success('附件上传成功');
  } catch (error) {
    const message = error instanceof Error ? error.message : '附件上传失败';
    pendingUploads.value = pendingUploads.value.map((item) =>
      item.uid === uid ? { ...item, status: 'error', errorMessage: message } : item,
    );
    ElMessage.error(message);
  }
}
</script>

<template>
  <div class="attachment-uploader">
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

    <el-empty v-if="!attachments.length && !pendingUploads.length" description="暂无附件" />

    <div v-else class="attachment-list">
      <div v-for="item in pendingUploads" :key="`pending-${item.uid}`" class="attachment-list__item">
        <div class="attachment-list__meta">
          <span class="attachment-list__name">{{ item.name }}</span>
          <span class="attachment-list__size">{{ formatBytes(item.size) }}</span>
        </div>
        <div class="attachment-list__actions">
          <el-tag size="small" :type="statusTagType(item.status)">
            {{ statusText(item.status) }}<span v-if="item.status === 'uploading' && item.percent != null"> {{ item.percent }}%</span>
          </el-tag>
          <el-button v-if="!readonly && item.status === 'error'" link type="primary" @click="retryPendingUpload(item.uid)">
            重试
          </el-button>
          <el-button v-if="!readonly" link type="danger" @click="removePending(item.uid)">移除</el-button>
        </div>
      </div>

      <div v-for="(item, index) in attachments" :key="item.fileId" class="attachment-list__item">
        <div class="attachment-list__meta">
          <el-button link type="primary" @click="handleDownload(item)">{{ item.originalName }}</el-button>
          <span class="attachment-list__size">{{ formatBytes(item.fileSize) }}</span>
        </div>
        <div class="attachment-list__actions">
          <el-tag size="small" :type="statusTagType('success')">{{ statusText('success') }}</el-tag>
          <el-button v-if="!readonly" link type="danger" @click="handleRemoveAttachment(index)">删除</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.attachment-uploader {
  width: 100%;
}

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

.attachment-list__meta {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1 1 auto;
}

.attachment-list__name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.attachment-list__size {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.attachment-list__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}
</style>
