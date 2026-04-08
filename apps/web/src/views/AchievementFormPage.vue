<script setup lang="ts">
import { AchievementStatus, AchievementType } from '@smw/shared';
import {
  createAchievement,
  fetchAchievementDetail,
  fetchAchievementUsers,
  fetchCompetitionOptions,
  updateAchievement,
} from '@web/api/competition-achievement';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const submitting = ref(false);
const userOptions = ref<Awaited<ReturnType<typeof fetchAchievementUsers>>['data']>([]);
const competitionOptions = ref<Awaited<ReturnType<typeof fetchCompetitionOptions>>['data']>([]);
const currentStatus = ref<string>(AchievementStatus.DRAFT);
const approvalInstanceId = ref<string | null>(null);

const isEdit = computed(() => Boolean(route.params.id));
const pageTitle = computed(() => (isEdit.value ? '成果编辑' : '成果录入'));

const form = reactive({
  title: '',
  achievementType: AchievementType.PAPER,
  levelCode: '',
  projectId: '',
  projectName: '',
  sourceCompetitionId: '',
  sourceTeamId: '',
  description: '',
  contributors: [
    {
      userId: '',
      contributorName: '',
      contributorRole: 'OWNER',
      contributionRank: 1,
      isInternal: true,
      contributionDescription: '',
    },
  ],
  paper: {
    journalName: '',
    publishDate: '',
    doi: '',
    indexedBy: '',
    authorOrder: '',
    correspondingAuthor: '',
  },
  ipAsset: {
    assetType: AchievementType.SOFTWARE_COPYRIGHT,
    certificateNo: '',
    registrationNo: '',
    authorizedDate: '',
    ownerUnit: '',
    remarks: '',
  },
});

async function loadOptions() {
  const [users, competitions] = await Promise.all([fetchAchievementUsers(), fetchCompetitionOptions()]);
  userOptions.value = users.data;
  competitionOptions.value = competitions.data;
}

async function loadDetail() {
  if (!route.params.id) return;
  loading.value = true;
  try {
    const response = await fetchAchievementDetail(String(route.params.id));
    const detail = response.data;
    currentStatus.value = detail.statusCode;
    approvalInstanceId.value = detail.approvalInstanceId;
    Object.assign(form, {
      title: detail.title,
      achievementType: detail.achievementType,
      levelCode: detail.levelCode ?? '',
      projectId: detail.projectId ?? '',
      projectName: detail.projectName ?? '',
      sourceCompetitionId: detail.sourceCompetitionId ?? '',
      sourceTeamId: detail.sourceTeamId ?? '',
      description: detail.description ?? '',
      contributors: detail.contributors.length
        ? detail.contributors.map((item) => ({
            userId: item.userId ?? '',
            contributorName: item.contributorName,
            contributorRole: item.contributorRole,
            contributionRank: item.contributionRank,
            isInternal: item.isInternal,
            contributionDescription: item.contributionDescription ?? '',
          }))
        : [
            {
              userId: '',
              contributorName: '',
              contributorRole: 'OWNER',
              contributionRank: 1,
              isInternal: true,
              contributionDescription: '',
            },
          ],
      paper: {
        journalName: detail.paper?.journalName ?? '',
        publishDate: detail.paper?.publishDate ?? '',
        doi: detail.paper?.doi ?? '',
        indexedBy: detail.paper?.indexedBy ?? '',
        authorOrder: detail.paper?.authorOrder ?? '',
        correspondingAuthor: detail.paper?.correspondingAuthor ?? '',
      },
      ipAsset: {
        assetType: detail.ipAsset?.assetType ?? AchievementType.SOFTWARE_COPYRIGHT,
        certificateNo: detail.ipAsset?.certificateNo ?? '',
        registrationNo: detail.ipAsset?.registrationNo ?? '',
        authorizedDate: detail.ipAsset?.authorizedDate ?? '',
        ownerUnit: detail.ipAsset?.ownerUnit ?? '',
        remarks: detail.ipAsset?.remarks ?? '',
      },
    });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '成果详情加载失败');
  } finally {
    loading.value = false;
  }
}

function addContributor() {
  form.contributors.push({
    userId: '',
    contributorName: '',
    contributorRole: 'PARTICIPANT',
    contributionRank: form.contributors.length + 1,
    isInternal: true,
    contributionDescription: '',
  });
}

function removeContributor(index: number) {
  if (form.contributors.length === 1) return;
  form.contributors.splice(index, 1);
}

async function submit(submitForApproval: boolean) {
  submitting.value = true;
  try {
    const payload = {
      title: form.title,
      achievementType: form.achievementType,
      levelCode: form.levelCode || undefined,
      projectId: form.projectId || undefined,
      projectName: form.projectName || undefined,
      sourceCompetitionId: form.sourceCompetitionId || undefined,
      sourceTeamId: form.sourceTeamId || undefined,
      description: form.description || undefined,
      contributors: form.contributors.map((item) => ({
        userId: item.userId || undefined,
        contributorName: item.contributorName,
        contributorRole: item.contributorRole,
        contributionRank: item.contributionRank,
        isInternal: item.isInternal,
        contributionDescription: item.contributionDescription || undefined,
      })),
      paper:
        form.achievementType === AchievementType.PAPER
          ? {
              journalName: form.paper.journalName || undefined,
              publishDate: form.paper.publishDate || undefined,
              doi: form.paper.doi || undefined,
              indexedBy: form.paper.indexedBy || undefined,
              authorOrder: form.paper.authorOrder || undefined,
              correspondingAuthor: form.paper.correspondingAuthor || undefined,
            }
          : undefined,
      ipAsset:
        form.achievementType === AchievementType.SOFTWARE_COPYRIGHT
          ? {
              assetType: form.ipAsset.assetType || undefined,
              certificateNo: form.ipAsset.certificateNo || undefined,
              registrationNo: form.ipAsset.registrationNo || undefined,
              authorizedDate: form.ipAsset.authorizedDate || undefined,
              ownerUnit: form.ipAsset.ownerUnit || undefined,
              remarks: form.ipAsset.remarks || undefined,
            }
          : undefined,
      submitForApproval,
    };

    if (isEdit.value) {
      await updateAchievement(String(route.params.id), payload);
      ElMessage.success(submitForApproval ? '成果已更新并提交认定审批' : '成果草稿已更新');
    } else {
      await createAchievement(payload);
      ElMessage.success(submitForApproval ? '成果已提交认定审批' : '成果草稿已保存');
    }

    void router.push({ name: 'achievements.list' });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '成果保存失败');
  } finally {
    submitting.value = false;
  }
}

function openApproval() {
  if (!approvalInstanceId.value) return;
  void router.push({ name: 'workflow.approval-center', query: { focus: approvalInstanceId.value } });
}

onMounted(async () => {
  await loadOptions();
  await loadDetail();
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">{{ pageTitle }}</p>
      <h2>{{ isEdit ? '成果录入/编辑' : '成果录入' }}</h2>
      <p>统一录入论文、竞赛成果、软著，自动生成认定等级与分值映射占位，并保留审批入口与轨迹。</p>
    </div>

    <div v-loading="loading" class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">认定表单</p>
          <h2>{{ form.title || '未命名成果' }}</h2>
        </div>
        <div class="topbar__actions">
          <el-tag>{{ currentStatus }}</el-tag>
          <el-button v-if="approvalInstanceId" link type="primary" @click="openApproval">查看审批轨迹</el-button>
        </div>
      </div>

      <el-form label-position="top">
        <div class="grid-two">
          <el-form-item label="成果标题"><el-input v-model="form.title" /></el-form-item>
          <el-form-item label="成果类型">
            <el-select v-model="form.achievementType" style="width: 100%">
              <el-option label="论文" :value="AchievementType.PAPER" />
              <el-option label="竞赛成果" :value="AchievementType.COMPETITION" />
              <el-option label="软著" :value="AchievementType.SOFTWARE_COPYRIGHT" />
            </el-select>
          </el-form-item>
          <el-form-item label="成果级别"><el-input v-model="form.levelCode" placeholder="如 NATIONAL / PROVINCIAL" /></el-form-item>
          <el-form-item label="关联项目编号"><el-input v-model="form.projectId" /></el-form-item>
          <el-form-item label="关联项目名称"><el-input v-model="form.projectName" /></el-form-item>
          <el-form-item label="关联赛事">
            <el-select v-model="form.sourceCompetitionId" clearable filterable style="width: 100%">
              <el-option v-for="option in competitionOptions" :key="option.id" :label="option.label" :value="option.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="关联队伍编号"><el-input v-model="form.sourceTeamId" placeholder="如已有报名队伍可填写 ID" /></el-form-item>
        </div>

        <el-form-item label="成果说明"><el-input v-model="form.description" type="textarea" :rows="4" /></el-form-item>

        <div class="achievement-section">
          <div class="achievement-section__header">
            <h3>贡献成员</h3>
            <el-button type="primary" plain @click="addContributor">新增成员</el-button>
          </div>
          <div v-for="(item, index) in form.contributors" :key="index" class="achievement-contributor-card">
            <div class="grid-two">
              <el-form-item :label="`成员 ${index + 1}`">
                <el-select v-model="item.userId" clearable filterable style="width: 100%">
                  <el-option v-for="option in userOptions" :key="option.id" :label="option.label" :value="option.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="姓名"><el-input v-model="item.contributorName" /></el-form-item>
              <el-form-item label="角色"><el-input v-model="item.contributorRole" /></el-form-item>
              <el-form-item label="贡献排序">
                <el-input-number v-model="item.contributionRank" :min="1" style="width: 100%" />
              </el-form-item>
            </div>
            <el-form-item label="贡献说明"><el-input v-model="item.contributionDescription" /></el-form-item>
            <div class="achievement-contributor-card__footer">
              <el-switch v-model="item.isInternal" active-text="内部成员" inactive-text="外部成员" />
              <el-button text type="danger" @click="removeContributor(index)">移除</el-button>
            </div>
          </div>
        </div>

        <div v-if="form.achievementType === AchievementType.PAPER" class="achievement-section">
          <h3>论文信息</h3>
          <div class="grid-two">
            <el-form-item label="期刊/会议"><el-input v-model="form.paper.journalName" /></el-form-item>
            <el-form-item label="发表日期">
              <el-date-picker v-model="form.paper.publishDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
            <el-form-item label="DOI"><el-input v-model="form.paper.doi" /></el-form-item>
            <el-form-item label="收录情况"><el-input v-model="form.paper.indexedBy" /></el-form-item>
            <el-form-item label="作者顺序"><el-input v-model="form.paper.authorOrder" /></el-form-item>
            <el-form-item label="通讯作者"><el-input v-model="form.paper.correspondingAuthor" /></el-form-item>
          </div>
        </div>

        <div v-if="form.achievementType === AchievementType.SOFTWARE_COPYRIGHT" class="achievement-section">
          <h3>软著信息</h3>
          <div class="grid-two">
            <el-form-item label="资产类型"><el-input v-model="form.ipAsset.assetType" /></el-form-item>
            <el-form-item label="证书号"><el-input v-model="form.ipAsset.certificateNo" /></el-form-item>
            <el-form-item label="登记号"><el-input v-model="form.ipAsset.registrationNo" /></el-form-item>
            <el-form-item label="授权日期">
              <el-date-picker v-model="form.ipAsset.authorizedDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
            <el-form-item label="权属单位"><el-input v-model="form.ipAsset.ownerUnit" /></el-form-item>
          </div>
          <el-form-item label="备注"><el-input v-model="form.ipAsset.remarks" type="textarea" :rows="3" /></el-form-item>
        </div>

        <div class="approval-detail__actions">
          <el-button @click="router.push({ name: 'achievements.list' })">返回列表</el-button>
          <el-button
            type="primary"
            plain
            :loading="submitting"
            :disabled="isEdit && currentStatus !== AchievementStatus.DRAFT"
            @click="submit(false)"
          >
            保存草稿
          </el-button>
          <el-button
            type="success"
            :loading="submitting"
            :disabled="isEdit && currentStatus !== AchievementStatus.DRAFT"
            @click="submit(true)"
          >
            保存并提交认定
          </el-button>
        </div>
      </el-form>
    </div>
  </section>
</template>
