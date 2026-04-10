<script setup lang="ts">
import {
  createCreationDraft,
  deleteCreationDraft,
  fetchCreationDetail,
  submitCreationContent,
  updateCreationContent,
  uploadCreationCover,
} from '@web/api/creation';
import RichTextEditor from '@web/components/RichTextEditor.vue';
import { ElMessage, ElMessageBox, type UploadRequestOptions } from 'element-plus';
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const saving = ref(false);
const submitting = ref(false);
const deleting = ref(false);
const bodyTextLength = ref(0);

const contentId = ref<string | null>(null);
const detail = ref<Awaited<ReturnType<typeof fetchCreationDetail>>['data'] | null>(null);

const form = reactive({
  title: '',
  summary: '',
  body: '',
  coverStorageKey: '',
  coverFileName: '',
  coverUrl: '',
});

const canEdit = computed(() => {
  const status = detail.value?.statusCode;
  return status === 'DRAFT' || status === 'REJECTED' || !status;
});

const canSubmit = computed(() => {
  const status = detail.value?.statusCode;
  return status === 'DRAFT' || status === 'REJECTED';
});

const canDelete = computed(() => {
  const status = detail.value?.statusCode;
  return status === 'DRAFT';
});

function looksLikeHtml(value: string) {
  if (!value) return false;
  if (!/[<>]/.test(value)) return false;
  return /<\/(p|div|span|h1|h2|h3|ul|ol|li|pre|code|blockquote|img|hr|a)\b/i.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeBodyForEditor(value: string) {
  const raw = value ?? '';
  if (!raw) return '';
  if (looksLikeHtml(raw)) return raw;
  return `<p>${escapeHtml(raw).replace(/\n/g, '<br>')}</p>`;
}

function getBodyTextLength(value: string) {
  if (!value) return 0;
  if (!looksLikeHtml(value)) return value.length;
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .length;
}

function statusLabel(status: string | null | undefined) {
  switch (status) {
    case 'DRAFT':
      return '草稿';
    case 'PENDING':
      return '待审核';
    case 'APPROVED':
      return '已通过';
    case 'REJECTED':
      return '已驳回';
    default:
      return '-';
  }
}

function formatDate(value: string | null | undefined) {
  return value ? value.slice(0, 19).replace('T', ' ') : '-';
}

async function load(id: string) {
  loading.value = true;
  try {
    const response = await fetchCreationDetail(id);
    detail.value = response.data;
    contentId.value = response.data.id;

    form.title = response.data.title || '';
    form.summary = response.data.summary || '';
    form.body = normalizeBodyForEditor(response.data.body || '');
    form.coverStorageKey = response.data.coverStorageKey || '';
    form.coverFileName = response.data.coverFileName || '';
    form.coverUrl = response.data.coverUrl || '';
    bodyTextLength.value = getBodyTextLength(response.data.body || '');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '内容加载失败');
  } finally {
    loading.value = false;
  }
}

async function ensureDraft() {
  const idParam = route.params.id;
  const id = typeof idParam === 'string' ? idParam : null;
  if (id) {
    await load(id);
    return;
  }

  loading.value = true;
  try {
    const response = await createCreationDraft();
    await nextTick();
    await router.replace(`/creation/${response.data.id}/edit`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '新建草稿失败');
  } finally {
    loading.value = false;
  }
}

async function save() {
  const id = contentId.value;
  if (!id) return;
  if (!canEdit.value) {
    ElMessage.warning('当前状态不可编辑');
    return;
  }

  saving.value = true;
  try {
    await updateCreationContent(id, {
      title: form.title.trim() || '未命名',
      summary: form.summary.trim() || undefined,
      body: form.body,
      coverStorageKey: form.coverStorageKey || undefined,
      coverFileName: form.coverFileName || undefined,
    });
    ElMessage.success('已保存');
    await load(id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    saving.value = false;
  }
}

async function submit() {
  const id = contentId.value;
  if (!id) return;
  if (!canSubmit.value) {
    ElMessage.warning('当前状态不可提交审核');
    return;
  }

  await ElMessageBox.confirm('确认提交审核？提交后将进入“待审核”，不可继续编辑。', '提示', { type: 'warning' });
  submitting.value = true;
  try {
    await submitCreationContent(id);
    ElMessage.success('已提交审核');
    await router.push('/creation');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '提交审核失败');
  } finally {
    submitting.value = false;
  }
}

async function handleUpload(option: UploadRequestOptions) {
  try {
    const response = await uploadCreationCover(option.file as File);
    form.coverStorageKey = response.data.storageKey;
    form.coverFileName = response.data.fileName;
    form.coverUrl = response.data.downloadUrl;
    ElMessage.success('封面已上传');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '封面上传失败');
  }
}

async function removeDraft() {
  const id = contentId.value;
  if (!id) return;
  if (!canDelete.value) {
    ElMessage.warning('仅草稿可删除');
    return;
  }

  try {
    await ElMessageBox.confirm('确认删除该草稿？删除后不可恢复。', '删除草稿', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  deleting.value = true;
  try {
    await deleteCreationDraft(id);
    ElMessage.success('草稿已删除');
    await router.push('/creation');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除草稿失败');
  } finally {
    deleting.value = false;
  }
}

onMounted(() => {
  void ensureDraft();
});
</script>

<template>
  <section v-loading="loading" class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">创作中心</p>
      <h2>内容编辑</h2>
      <p>
        状态：<strong>{{ statusLabel(detail?.statusCode) }}</strong>
        <span class="muted">（提交审核后进入待审核，审核通过后可进入智库/被推荐到首页）</span>
      </p>
      <p v-if="detail?.reviewComment" class="danger">审核意见/驳回原因：{{ detail.reviewComment }}</p>
      <p class="muted">提交时间：{{ formatDate(detail?.submittedAt) }}；审核时间：{{ formatDate(detail?.reviewedAt) }}</p>
    </div>

    <div class="panel-card">
      <el-form label-width="100px">
        <el-form-item label="标题">
          <el-input v-model="form.title" :disabled="!canEdit" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="form.summary" :disabled="!canEdit" type="textarea" :rows="3" maxlength="1000" show-word-limit />
        </el-form-item>
        <el-form-item label="封面">
          <div class="upload-row">
            <el-upload :http-request="handleUpload" :show-file-list="false" accept="image/*" :disabled="!canEdit">
              <el-button>上传封面</el-button>
            </el-upload>
            <el-image v-if="form.coverUrl" :src="form.coverUrl" fit="cover" class="upload-preview" />
            <span v-else class="muted">可选：用于列表展示与首页分发时的封面/轮播图。</span>
          </div>
        </el-form-item>
        <el-form-item label="正文">
          <div class="body-editor">
            <RichTextEditor v-model="form.body" :disabled="!canEdit" @text-length-change="(v) => (bodyTextLength = v)" />
            <div class="body-editor__meta">
              <span class="muted">字数：{{ bodyTextLength }}</span>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <div class="toolbar-row toolbar-row--right">
        <el-button v-if="canDelete" type="danger" :loading="deleting" @click="removeDraft">删除草稿</el-button>
        <el-button @click="router.push('/creation')">返回</el-button>
        <el-button type="primary" :loading="saving" :disabled="!canEdit" @click="save">保存草稿</el-button>
        <el-button type="warning" :loading="submitting" :disabled="!canSubmit" @click="submit">提交审核</el-button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.muted {
  color: #64748b;
}

.danger {
  color: #dc2626;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.upload-preview {
  width: 120px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
}

.toolbar-row--right {
  justify-content: flex-end;
}

.body-editor {
  width: 100%;
}

.body-editor__meta {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>

