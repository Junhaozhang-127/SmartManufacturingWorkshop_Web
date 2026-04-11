<script setup lang="ts">
import type { AchievementDetail } from '@smw/shared';
import { AchievementStatus, AchievementType, ApprovalBusinessType } from '@smw/shared';
import { type AttachmentItem,downloadAttachment, listBusinessAttachments } from '@web/api/attachments';
import { fetchAchievementDetail } from '@web/api/competition-achievement';
import { ElMessage } from 'element-plus';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const detail = ref<AchievementDetail | null>(null);
const attachments = ref<AttachmentItem[]>([]);

const imageUrls = ref<Record<string, string>>({});

const ACHIEVEMENT_ATTACHMENT_BUSINESS_TYPE = ApprovalBusinessType.ACHIEVEMENT_RECOGNITION;
const ACHIEVEMENT_ATTACHMENT_USAGE_TYPE = 'ACHIEVEMENT_PROOF';

const imageAttachments = computed(() => attachments.value.filter((item) => item.fileCategory === 'IMAGE'));
const fileAttachments = computed(() => attachments.value.filter((item) => item.fileCategory !== 'IMAGE'));
const previewSrcList = computed(() => imageAttachments.value.map((item) => imageUrls.value[item.fileId]).filter(Boolean));

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return value;
}

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

async function triggerDownload(item: AttachmentItem) {
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

async function loadImagePreviews(items: AttachmentItem[]) {
  const nextUrls: Record<string, string> = { ...imageUrls.value };
  for (const item of items) {
    if (nextUrls[item.fileId]) continue;
    try {
      const blob = await downloadAttachment(item.fileId, item.originalName);
      nextUrls[item.fileId] = window.URL.createObjectURL(blob);
    } catch {
      // ignore: image preview is best-effort
    }
  }
  imageUrls.value = nextUrls;
}

async function load() {
  const id = String(route.params.id || '');
  if (!id) return;

  loading.value = true;
  try {
    const response = await fetchAchievementDetail(id);
    detail.value = response.data;

    const attachmentResponse = await listBusinessAttachments({
      businessType: ACHIEVEMENT_ATTACHMENT_BUSINESS_TYPE,
      businessId: id,
      usageType: ACHIEVEMENT_ATTACHMENT_USAGE_TYPE,
    });
    attachments.value = attachmentResponse.data;
    await loadImagePreviews(attachmentResponse.data.filter((item) => item.fileCategory === 'IMAGE'));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '成果详情加载失败');
    detail.value = null;
    attachments.value = [];
  } finally {
    loading.value = false;
  }
}

function openApproval() {
  if (!detail.value?.approvalInstanceId) return;
  void router.push({ name: 'workflow.approval-center', query: { focus: detail.value.approvalInstanceId } });
}

function goEdit() {
  if (!detail.value) return;
  void router.push({ name: 'achievements.edit', params: { id: detail.value.id } });
}

function goBack() {
  void router.push({ name: 'achievements.list' });
}

watch(
  () => route.params.id,
  () => {
    void load();
  },
);

onBeforeUnmount(() => {
  for (const url of Object.values(imageUrls.value)) {
    if (url) window.URL.revokeObjectURL(url);
  }
});

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">成果详情</p>
      <h2>{{ detail?.title || '成果详情' }}</h2>
      <p>展示成果基础信息、贡献成员、审核/认定信息与附件，支持附件下载。</p>
    </div>

    <div v-loading="loading" class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">基础信息</p>
          <h2>成果信息</h2>
        </div>
        <div class="toolbar-row">
          <el-button @click="goBack">返回列表</el-button>
          <el-button v-if="detail?.approvalInstanceId" type="primary" plain @click="openApproval">查看审批轨迹</el-button>
          <el-button v-if="detail && detail.statusCode === AchievementStatus.DRAFT" type="success" plain @click="goEdit">
            编辑
          </el-button>
        </div>
      </div>

      <el-empty v-if="!detail" description="暂无数据" />

      <template v-else>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="成果标题" :span="2">{{ detail.title }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ detail.achievementType }}</el-descriptions-item>
          <el-descriptions-item label="级别">{{ detail.levelCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="关联项目编号">{{ detail.projectId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="关联项目名称">{{ detail.projectName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="关联比赛">{{ detail.sourceCompetitionName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="关联队伍">{{ detail.sourceTeamName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="负责人/申请人">{{ detail.applicantName }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(detail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="成果说明" :span="2">{{ detail.description || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="detail.achievementType === AchievementType.PAPER" class="achievement-section">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">扩展信息</p>
              <h2>论文信息</h2>
            </div>
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="期刊/会议">{{ detail.paper?.journalName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="发表日期">{{ formatDate(detail.paper?.publishDate) }}</el-descriptions-item>
            <el-descriptions-item label="DOI">{{ detail.paper?.doi || '-' }}</el-descriptions-item>
            <el-descriptions-item label="收录情况">{{ detail.paper?.indexedBy || '-' }}</el-descriptions-item>
            <el-descriptions-item label="作者顺序">{{ detail.paper?.authorOrder || '-' }}</el-descriptions-item>
            <el-descriptions-item label="通讯作者">{{ detail.paper?.correspondingAuthor || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div v-if="detail.achievementType === AchievementType.SOFTWARE_COPYRIGHT" class="achievement-section">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">扩展信息</p>
              <h2>软著信息</h2>
            </div>
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="资产类型">{{ detail.ipAsset?.assetType || '-' }}</el-descriptions-item>
            <el-descriptions-item label="证书号">{{ detail.ipAsset?.certificateNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="登记号">{{ detail.ipAsset?.registrationNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="授权日期">{{ formatDate(detail.ipAsset?.authorizedDate) }}</el-descriptions-item>
            <el-descriptions-item label="权属单位">{{ detail.ipAsset?.ownerUnit || '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注">{{ detail.ipAsset?.remarks || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="achievement-section">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">成员信息</p>
              <h2>负责人/贡献成员</h2>
            </div>
          </div>
          <el-empty v-if="!detail.contributors.length" description="暂无成员" />
          <el-table v-else :data="detail.contributors" border stripe>
            <el-table-column prop="contributionRank" label="排序" width="80" />
            <el-table-column prop="contributorName" label="姓名" min-width="140" />
            <el-table-column prop="contributorRole" label="角色" min-width="120" />
            <el-table-column prop="isInternal" label="内部成员" width="120">
              <template #default="{ row }">{{ row.isInternal ? '是' : '否' }}</template>
            </el-table-column>
            <el-table-column prop="contributionDescription" label="贡献说明" min-width="240" show-overflow-tooltip />
          </el-table>
        </div>

        <div class="achievement-section">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">审核信息</p>
              <h2>审核/认定信息</h2>
            </div>
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="状态">{{ detail.statusCode }}</el-descriptions-item>
            <el-descriptions-item label="最近结果">{{ detail.latestResult || '-' }}</el-descriptions-item>
            <el-descriptions-item label="认定等级">{{ detail.recognizedGrade || '-' }}</el-descriptions-item>
            <el-descriptions-item label="提审时间">{{ formatDateTime(detail.submittedAt) }}</el-descriptions-item>
            <el-descriptions-item label="认定时间">{{ formatDateTime(detail.recognizedAt) }}</el-descriptions-item>
            <el-descriptions-item label="审批实例">{{ detail.approvalInstanceId || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="achievement-section">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">附件</p>
              <h2>附件列表</h2>
            </div>
          </div>

          <el-empty v-if="!attachments.length" description="暂无附件" />

          <template v-else>
            <div v-if="imageAttachments.length" class="achievement-section">
              <h3>图片</h3>
              <div class="image-grid">
                <div v-for="item in imageAttachments" :key="item.fileId" class="image-grid__item">
                  <el-image
                    v-if="imageUrls[item.fileId]"
                    :src="imageUrls[item.fileId]"
                    :preview-src-list="previewSrcList"
                    :initial-index="imageAttachments.findIndex((x) => x.fileId === item.fileId)"
                    fit="cover"
                    style="width: 160px; height: 120px"
                  />
                  <div v-else class="image-grid__placeholder">预览加载中</div>
                  <div class="image-grid__meta">
                    <span class="image-grid__name" :title="item.originalName">{{ item.originalName }}</span>
                    <el-button link type="primary" @click="triggerDownload(item)">下载</el-button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="fileAttachments.length" class="achievement-section">
              <h3>文件</h3>
              <el-table :data="fileAttachments" border stripe>
                <el-table-column prop="originalName" label="文件名" min-width="260" show-overflow-tooltip />
                <el-table-column prop="fileCategory" label="类型" width="120" />
                <el-table-column prop="fileSize" label="大小" width="120">
                  <template #default="{ row }">{{ formatBytes(row.fileSize) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="120" fixed="right">
                  <template #default="{ row }">
                    <el-button link type="primary" @click="triggerDownload(row)">下载</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.image-grid__item {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 10px;
  background: var(--el-bg-color);
}

.image-grid__placeholder {
  width: 160px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  border-radius: 6px;
}

.image-grid__meta {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.image-grid__name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
