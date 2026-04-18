<script setup lang="ts">
import { RoleCode } from '@smw/shared';
import { type AttachmentItem, listBusinessAttachments } from '@web/api/attachments';
import {
  approveCreationContent,
  fetchCreationDetail,
  fetchReviewApproved,
  fetchReviewPending,
  type HomeSection,
  publishCreationContent,
  rejectCreationContent,
} from '@web/api/creation';
import AttachmentUploader from '@web/components/attachments/AttachmentUploader.vue';
import RichTextViewer from '@web/components/RichTextViewer.vue';
import { useAuthStore } from '@web/stores/auth';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

type ReviewTab = 'PENDING' | 'APPROVED';

const authStore = useAuthStore();
const router = useRouter();
const canReview = computed(() => [RoleCode.TEACHER, RoleCode.MINISTER].includes(authStore.activeRoleCode ?? RoleCode.MEMBER));

const activeTab = ref<ReviewTab>('PENDING');

const pendingLoading = ref(false);
const pendingRows = ref<Awaited<ReturnType<typeof fetchReviewPending>>['data']['items']>([]);
const pendingTotal = ref(0);
const pendingQuery = reactive({ page: 1, pageSize: 10, keyword: '' });

const approvedLoading = ref(false);
const approvedRows = ref<Awaited<ReturnType<typeof fetchReviewApproved>>['data']['items']>([]);
const approvedTotal = ref(0);
const approvedQuery = reactive({ page: 1, pageSize: 10, keyword: '' });

const approveDialogVisible = ref(false);
const approveSaving = ref(false);
const approveTargetId = ref<string | null>(null);
const approveForm = reactive({
  publishMode: 'KNOWLEDGE' as 'KNOWLEDGE' | 'HOME' | 'BOTH',
  homeSection: '' as '' | HomeSection,
  reviewComment: '',
});

const rejectDialogVisible = ref(false);
const rejectSaving = ref(false);
const rejectTargetId = ref<string | null>(null);
const rejectReason = ref('');

const publishDialogVisible = ref(false);
const publishSaving = ref(false);
const publishTargetId = ref<string | null>(null);
const publishForm = reactive({
  inKnowledgeBase: false,
  recommendToHome: false,
  homeSection: '' as '' | HomeSection,
});

const viewDialogVisible = ref(false);
const viewLoading = ref(false);
const viewDetail = ref<Awaited<ReturnType<typeof fetchCreationDetail>>['data'] | null>(null);
const viewAttachments = ref<AttachmentItem[]>([]);

const CREATION_ATTACHMENT_USAGE_TYPE = 'CREATION_ATTACHMENT';
const CREATION_BUSINESS_TYPE = 'CREATION_CONTENT';

const homeSectionOptions: Array<{ label: string; value: HomeSection }> = [
  { label: '首页轮播', value: 'CAROUSEL' },
  { label: '最新资讯', value: 'NEWS' },
  { label: '重要通知', value: 'NOTICE' },
  { label: '优秀成果展示', value: 'ACHIEVEMENT' },
  { label: '竞赛风采', value: 'COMPETITION' },
  { label: '成员简介', value: 'MEMBER_INTRO' },
];

function goWorkflowApproval() {
  void router.push({ name: 'workflow.approval-center' });
}

function goCreationReview() {
  void router.push({ name: 'workflow.approval-center.creation-review' });
}

function formatDate(value: string | null) {
  return value ? value.slice(0, 19).replace('T', ' ') : '-';
}

async function loadPending() {
  if (!canReview.value) return;
  pendingLoading.value = true;
  try {
    const response = await fetchReviewPending({
      ...pendingQuery,
      keyword: pendingQuery.keyword.trim() || undefined,
    });
    pendingRows.value = response.data.items;
    pendingTotal.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '待审核列表加载失败');
  } finally {
    pendingLoading.value = false;
  }
}

async function loadApproved() {
  if (!canReview.value) return;
  approvedLoading.value = true;
  try {
    const response = await fetchReviewApproved({
      ...approvedQuery,
      keyword: approvedQuery.keyword.trim() || undefined,
    });
    approvedRows.value = response.data.items;
    approvedTotal.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '已通过列表加载失败');
  } finally {
    approvedLoading.value = false;
  }
}

async function loadActive() {
  if (activeTab.value === 'PENDING') return loadPending();
  return loadApproved();
}

async function openView(id: string) {
  viewDialogVisible.value = true;
  viewLoading.value = true;
  try {
    const response = await fetchCreationDetail(id);
    viewDetail.value = response.data;
    const attachmentResponse = await listBusinessAttachments({
      businessType: CREATION_BUSINESS_TYPE,
      businessId: id,
      usageType: CREATION_ATTACHMENT_USAGE_TYPE,
    });
    viewAttachments.value = attachmentResponse.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '内容加载失败');
    viewDialogVisible.value = false;
    viewAttachments.value = [];
  } finally {
    viewLoading.value = false;
  }
}

function openApprove(id: string) {
  approveTargetId.value = id;
  approveForm.publishMode = 'KNOWLEDGE';
  approveForm.homeSection = '';
  approveForm.reviewComment = '';
  approveDialogVisible.value = true;
}

async function submitApprove() {
  const id = approveTargetId.value;
  if (!id) return;
  if ((approveForm.publishMode === 'HOME' || approveForm.publishMode === 'BOTH') && !approveForm.homeSection) {
    ElMessage.error('请选择首页栏目');
    return;
  }

  approveSaving.value = true;
  try {
    await approveCreationContent(id, {
      publishMode: approveForm.publishMode,
      homeSection: approveForm.homeSection || undefined,
      reviewComment: approveForm.reviewComment.trim() || undefined,
    });
    ElMessage.success('已审核通过');
    approveDialogVisible.value = false;
    await loadActive();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审核通过失败');
  } finally {
    approveSaving.value = false;
  }
}

function openReject(id: string) {
  rejectTargetId.value = id;
  rejectReason.value = '';
  rejectDialogVisible.value = true;
}

async function submitReject() {
  const id = rejectTargetId.value;
  if (!id) return;
  if (!rejectReason.value.trim()) {
    ElMessage.error('请填写驳回原因');
    return;
  }

  rejectSaving.value = true;
  try {
    await rejectCreationContent(id, { reviewComment: rejectReason.value.trim() });
    ElMessage.success('已驳回');
    rejectDialogVisible.value = false;
    await loadActive();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '驳回失败');
  } finally {
    rejectSaving.value = false;
  }
}

function openPublish(row: (typeof approvedRows.value)[number]) {
  publishTargetId.value = row.id;
  publishForm.inKnowledgeBase = row.inKnowledgeBase;
  publishForm.recommendToHome = row.recommendToHome;
  publishForm.homeSection = (row.homeSection as HomeSection) || '';
  publishDialogVisible.value = true;
}

async function submitPublish() {
  const id = publishTargetId.value;
  if (!id) return;

  const wantsRecommend = publishForm.recommendToHome === true;
  if (wantsRecommend && !publishForm.homeSection) {
    ElMessage.error('请选择首页栏目');
    return;
  }

  publishSaving.value = true;
  try {
    await publishCreationContent(id, {
      inKnowledgeBase: publishForm.inKnowledgeBase ? true : undefined,
      recommendToHome: wantsRecommend ? true : undefined,
      homeSection: wantsRecommend ? (publishForm.homeSection as HomeSection) : undefined,
    });
    ElMessage.success('已更新发布设置');
    publishDialogVisible.value = false;
    await loadApproved();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '发布设置更新失败');
  } finally {
    publishSaving.value = false;
  }
}

onMounted(() => {
  void loadActive();
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">创作审核</p>
      <h2>审核与首页分发</h2>
      <p>仅老师/部长可操作：审核通过/驳回，并对已通过内容设置“进入智库/推荐到首页”。</p>
      <div class="hero-card__actions">
        <el-button-group>
          <el-button @click="goWorkflowApproval">工作流审批</el-button>
          <el-button type="primary" @click="goCreationReview">创作审核</el-button>
        </el-button-group>
      </div>
    </div>

    <div v-if="!canReview" class="panel-card">
      <p class="muted">无权限：仅老师/部长可访问创作审核。</p>
    </div>

    <div v-else class="panel-card">
      <div class="toolbar-row">
        <el-radio-group v-model="activeTab" @change="loadActive">
          <el-radio-button label="PENDING">待审核</el-radio-button>
          <el-radio-button label="APPROVED">已通过</el-radio-button>
        </el-radio-group>
      </div>

      <div v-if="activeTab === 'PENDING'">
        <div class="toolbar-row">
          <el-input v-model="pendingQuery.keyword" placeholder="搜索标题/摘要" clearable @keyup.enter="loadPending" />
          <el-button type="primary" @click="loadPending">查询</el-button>
        </div>

        <el-table v-loading="pendingLoading" :data="pendingRows" border stripe>
          <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
          <el-table-column prop="author.displayName" label="作者" width="160" />
          <el-table-column label="提交时间" width="180">
            <template #default="{ row }">{{ formatDate(row.submittedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="260" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openView(row.id)">查看</el-button>
              <el-button link type="success" @click="openApprove(row.id)">通过</el-button>
              <el-button link type="danger" @click="openReject(row.id)">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="pendingQuery.page"
            v-model:page-size="pendingQuery.pageSize"
            :page-sizes="[10, 20, 50]"
            background
            layout="total, sizes, prev, pager, next"
            :total="pendingTotal"
            @change="loadPending"
          />
        </div>
      </div>

      <div v-else>
        <div class="toolbar-row">
          <el-input v-model="approvedQuery.keyword" placeholder="搜索标题/摘要" clearable @keyup.enter="loadApproved" />
          <el-button type="primary" @click="loadApproved">查询</el-button>
        </div>

        <el-table v-loading="approvedLoading" :data="approvedRows" border stripe>
          <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
          <el-table-column prop="author.displayName" label="作者" width="160" />
          <el-table-column label="审核时间" width="180">
            <template #default="{ row }">{{ formatDate(row.reviewedAt) }}</template>
          </el-table-column>
          <el-table-column label="进入智库" width="120">
            <template #default="{ row }">
              <el-tag :type="row.inKnowledgeBase ? 'success' : 'info'">{{ row.inKnowledgeBase ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="推荐首页" width="120">
            <template #default="{ row }">
              <el-tag :type="row.recommendToHome ? 'warning' : 'info'">{{ row.recommendToHome ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="homeSection" label="首页栏目" width="160" />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openView(row.id)">查看</el-button>
              <el-button link type="primary" @click="openPublish(row)">发布设置</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="approvedQuery.page"
            v-model:page-size="approvedQuery.pageSize"
            :page-sizes="[10, 20, 50]"
            background
            layout="total, sizes, prev, pager, next"
            :total="approvedTotal"
            @change="loadApproved"
          />
        </div>
      </div>
    </div>

    <el-dialog v-model="viewDialogVisible" title="正文预览" width="860px" destroy-on-close>
      <div v-loading="viewLoading" class="view-body">
        <el-image v-if="viewDetail?.coverUrl" :src="viewDetail.coverUrl" fit="cover" class="view-cover" />
        <p v-if="viewDetail?.summary" class="muted">摘要：{{ viewDetail.summary }}</p>
        <RichTextViewer :content="viewDetail?.body" />
        <div class="view-attachments">
          <h4>附件</h4>
          <AttachmentUploader v-model="viewAttachments" readonly />
        </div>
      </div>
      <template #footer>
        <el-button @click="viewDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="approveDialogVisible" title="审核通过" width="520px" destroy-on-close>
      <el-form label-width="120px">
        <el-form-item label="发布方式">
          <el-select v-model="approveForm.publishMode" style="width: 240px">
            <el-option label="默认进入智库" value="KNOWLEDGE" />
            <el-option label="推荐到首页" value="HOME" />
            <el-option label="同时进智库+首页" value="BOTH" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="approveForm.publishMode !== 'KNOWLEDGE'" label="首页栏目">
          <el-select v-model="approveForm.homeSection" style="width: 240px">
            <el-option v-for="option in homeSectionOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input v-model="approveForm.reviewComment" type="textarea" :rows="3" maxlength="1000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="approveSaving" @click="submitApprove">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rejectDialogVisible" title="驳回" width="520px" destroy-on-close>
      <el-form label-width="120px">
        <el-form-item label="驳回原因">
          <el-input v-model="rejectReason" type="textarea" :rows="4" maxlength="1000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="rejectSaving" @click="submitReject">确认驳回</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="publishDialogVisible" title="发布设置（仅支持从否到是）" width="560px" destroy-on-close>
      <el-form label-width="140px">
        <el-form-item label="进入智库">
          <el-switch v-model="publishForm.inKnowledgeBase" />
          <span class="muted">（仅支持从“否”设置为“是”）</span>
        </el-form-item>
        <el-form-item label="推荐到首页">
          <el-switch v-model="publishForm.recommendToHome" />
          <span class="muted">（仅支持从“否”设置为“是”）</span>
        </el-form-item>
        <el-form-item v-if="publishForm.recommendToHome" label="首页栏目">
          <el-select v-model="publishForm.homeSection" style="width: 240px">
            <el-option v-for="option in homeSectionOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishSaving" @click="submitPublish">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.hero-card__actions {
  margin-top: 0.75rem;
}

.muted {
  color: #64748b;
}

.view-body {
  display: grid;
  gap: 12px;
}

.view-cover {
  width: 100%;
  max-height: 360px;
  border-radius: 12px;
  overflow: hidden;
}

.view-attachments {
  margin-top: 8px;
}
</style>

