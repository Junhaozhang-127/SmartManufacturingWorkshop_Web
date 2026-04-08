<script setup lang="ts">
import { PermissionCodes } from '@smw/shared';
import { fetchEvaluationSchemes, fetchPromotionEligibility } from '@web/api/evaluation-promotion';
import { useAuthz } from '@web/composables/useAuthz';
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const { hasPermission } = useAuthz();

const loading = ref(false);
const schemes = ref<Awaited<ReturnType<typeof fetchEvaluationSchemes>>['data']>([]);
const rows = ref<Awaited<ReturnType<typeof fetchPromotionEligibility>>['data']['items']>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
  schemeId: '',
  keyword: '',
  targetPositionCode: '',
  qualified: undefined as boolean | undefined,
});

const canCreate = hasPermission(PermissionCodes.promotionCreate);

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
    const response = await fetchPromotionEligibility(query);
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '资格看板加载失败');
  } finally {
    loading.value = false;
  }
}

function goApply(row: (typeof rows.value)[number]) {
  void router.push({
    name: 'promotion.applications',
    query: {
      memberProfileId: row.memberProfileId,
      schemeId: row.schemeId,
      targetPositionCode: row.targetPositionCode,
      openCreate: '1',
    },
  });
}

onMounted(async () => {
  await loadSchemes();
  await load();
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">晋升资格看板</p>
      <h2>晋升资格看板</h2>
      <p>结合最近考核结果、成果等级与项目经历进行资格校验，输出可申请名单、未达标原因和目标岗位建议。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-select v-model="query.schemeId" @change="load">
          <el-option v-for="item in schemes" :key="item.id" :label="`${item.schemeName}（${item.periodKey}）`" :value="item.id" />
        </el-select>
        <el-input v-model="query.keyword" placeholder="搜索成员或组织" clearable @keyup.enter="load" />
        <el-select v-model="query.targetPositionCode" clearable>
          <el-option label="组长" value="GROUP_LEADER" />
          <el-option label="部长" value="MINISTER" />
        </el-select>
        <el-select v-model="query.qualified" clearable>
          <el-option label="仅看可申请" :value="true" />
          <el-option label="仅看未达标" :value="false" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="displayName" label="成员" min-width="140" />
        <el-table-column prop="orgUnitName" label="组织" min-width="140" />
        <el-table-column prop="currentPositionCode" label="当前岗位" width="120" />
        <el-table-column prop="targetPositionCode" label="建议晋升岗位" width="140" />
        <el-table-column prop="latestEvaluationTotalScore" label="最近总分" width="120" />
        <el-table-column prop="latestEvaluationResult" label="考核结果" width="120" />
        <el-table-column prop="achievementCount" label="成果数" width="90" />
        <el-table-column prop="projectCount" label="项目数" width="90" />
        <el-table-column label="资格" width="110">
          <template #default="{ row }">
            <el-tag :type="row.qualified ? 'success' : 'danger'">{{ row.qualified ? '通过' : '未通过' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="原因" min-width="320" show-overflow-tooltip>
          <template #default="{ row }">{{ row.reasons.length ? row.reasons.join('；') : '满足当前规则，可发起晋升申请' }}</template>
        </el-table-column>
        <el-table-column prop="latestPromotionStatus" label="最近申请状态" width="150" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canCreate && row.qualified" link type="primary" @click="goApply(row)">发起申请</el-button>
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
  </section>
</template>
