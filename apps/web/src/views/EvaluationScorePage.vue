<script setup lang="ts">
import { EvaluationResultCode, PermissionCodes } from '@smw/shared';
import {
  fetchEvaluationSchemes,
  fetchEvaluationScoreDetail,
  fetchEvaluationScores,
  refreshEvaluationScores,
  updateEvaluationManualScore,
} from '@web/api/evaluation-promotion';
import { useAuthz } from '@web/composables/useAuthz';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';

const { hasPermission } = useAuthz();

const loading = ref(false);
const refreshing = ref(false);
const editVisible = ref(false);
const submitting = ref(false);
const schemes = ref<Awaited<ReturnType<typeof fetchEvaluationSchemes>>['data']>([]);
const rows = ref<Awaited<ReturnType<typeof fetchEvaluationScores>>['data']['items']>([]);
const total = ref(0);
const currentDetail = ref<Awaited<ReturnType<typeof fetchEvaluationScoreDetail>>['data'] | null>(null);

const query = reactive({
  page: 1,
  pageSize: 10,
  schemeId: '',
  keyword: '',
  resultCode: '',
});

const editForm = reactive({
  manualScore: 0,
  manualComment: '',
});

const canUpdate = computed(() => hasPermission(PermissionCodes.evaluationUpdate));

const resultOptions = [
  { label: '全部结果', value: '' },
  { label: '优秀', value: EvaluationResultCode.EXCELLENT },
  { label: '良好', value: EvaluationResultCode.GOOD },
  { label: '通过', value: EvaluationResultCode.PASS },
  { label: '不通过', value: EvaluationResultCode.FAIL },
];

async function loadSchemes() {
  const response = await fetchEvaluationSchemes();
  schemes.value = response.data;
  const firstScheme = response.data[0];
  if (!query.schemeId && firstScheme) {
    query.schemeId = firstScheme.id;
  }
}

async function load() {
  if (!query.schemeId) return;
  loading.value = true;
  try {
    const response = await fetchEvaluationScores(query);
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '考核评分列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function refreshCurrentScheme() {
  if (!query.schemeId) return;
  refreshing.value = true;
  try {
    await refreshEvaluationScores(query.schemeId);
    ElMessage.success('自动汇总分已重新计算');
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '自动汇总失败');
  } finally {
    refreshing.value = false;
  }
}

async function openManualEditor(id: string) {
  try {
    const response = await fetchEvaluationScoreDetail(id);
    currentDetail.value = response.data;
    editForm.manualScore = response.data.manualScore;
    editForm.manualComment = response.data.manualComment ?? '';
    editVisible.value = true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '评分详情加载失败');
  }
}

async function submitManualScore() {
  if (!currentDetail.value) return;
  submitting.value = true;
  try {
    await updateEvaluationManualScore(currentDetail.value.id, editForm);
    ElMessage.success('人工补充分已保存');
    editVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '人工补充分保存失败');
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await loadSchemes();
  await load();
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">考核评分</p>
      <h2>考核评分与结果</h2>
      <p>按考核周期自动汇总成果、项目与奖惩数据生成基础分，再由评审人补充人工分，最终形成总分和结果。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-select v-model="query.schemeId" @change="load">
          <el-option v-for="item in schemes" :key="item.id" :label="`${item.schemeName}（${item.periodKey}）`" :value="item.id" />
        </el-select>
        <el-input v-model="query.keyword" placeholder="搜索成员或组织" clearable @keyup.enter="load" />
        <el-select v-model="query.resultCode">
          <el-option v-for="item in resultOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button v-if="canUpdate" :loading="refreshing" @click="refreshCurrentScheme">重算自动分</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="displayName" label="成员" min-width="140" />
        <el-table-column prop="orgUnitName" label="组织" min-width="140" />
        <el-table-column prop="positionCode" label="岗位" width="130" />
        <el-table-column prop="achievementCount" label="成果数" width="100" />
        <el-table-column prop="projectCount" label="项目经历" width="100" />
        <el-table-column prop="rewardPenaltyCount" label="奖惩数" width="100" />
        <el-table-column prop="autoScore" label="自动汇总分" width="120" />
        <el-table-column prop="manualScore" label="人工补充分" width="120" />
        <el-table-column prop="totalScore" label="总分" width="100" />
        <el-table-column prop="resultCode" label="结果" width="120" />
        <el-table-column prop="latestResult" label="说明" min-width="260" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openManualEditor(row.id)">查看/补分</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-row">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50]"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          @change="load"
        />
      </div>
    </div>

    <el-dialog v-model="editVisible" title="评分详情" width="42rem">
      <div v-if="currentDetail" class="drawer-descriptions">
        <dt>成员</dt>
        <dd>{{ currentDetail.displayName }}</dd>
        <dt>周期</dt>
        <dd>{{ currentDetail.schemeName }} / {{ currentDetail.periodKey }}</dd>
        <dt>自动汇总分</dt>
        <dd>{{ currentDetail.autoScore }}</dd>
        <dt>人工补充分</dt>
        <dd>{{ currentDetail.manualScore }}</dd>
      </div>
      <el-form label-position="top" class="manual-score-form">
        <el-form-item label="人工补充分">
          <el-input-number v-model="editForm.manualScore" :min="-30" :max="30" />
        </el-form-item>
        <el-form-item label="补分说明">
          <el-input v-model="editForm.manualComment" type="textarea" :rows="4" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button v-if="canUpdate" type="primary" :loading="submitting" @click="submitManualScore">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>
