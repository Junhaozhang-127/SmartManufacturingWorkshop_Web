<script setup lang="ts">
import { AchievementStatus, AchievementType, PermissionCodes } from '@smw/shared';
import {
  fetchAchievementList,
  fetchAchievementUsers,
} from '@web/api/competition-achievement';
import { useAuthz } from '@web/composables/useAuthz';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const { hasPermission } = useAuthz();

const loading = ref(false);
const rows = ref<Awaited<ReturnType<typeof fetchAchievementList>>['data']['items']>([]);
const total = ref(0);
const memberOptions = ref<Awaited<ReturnType<typeof fetchAchievementUsers>>['data']>([]);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  achievementType: '',
  statusCode: '',
  levelCode: '',
  projectId: '',
  memberUserId: '',
});

const canCreate = computed(() => hasPermission(PermissionCodes.achievementCreate));
const canUpdate = computed(() => hasPermission(PermissionCodes.achievementUpdate));

const typeOptions = [
  { label: '全部类型', value: '' },
  { label: '论文', value: AchievementType.PAPER },
  { label: '竞赛成果', value: AchievementType.COMPETITION },
  { label: '软著', value: AchievementType.SOFTWARE_COPYRIGHT },
];

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '草稿', value: AchievementStatus.DRAFT },
  { label: '审批中', value: AchievementStatus.IN_APPROVAL },
  { label: '已认定', value: AchievementStatus.RECOGNIZED },
  { label: '已驳回', value: AchievementStatus.REJECTED },
  { label: '已撤回', value: AchievementStatus.WITHDRAWN },
];

async function load() {
  loading.value = true;
  try {
    const response = await fetchAchievementList(query);
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '成果列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadOptions() {
  const response = await fetchAchievementUsers();
  memberOptions.value = response.data;
}

function openCreate() {
  void router.push({ name: 'achievements.create' });
}

function openEdit(id: string) {
  void router.push({ name: 'achievements.edit', params: { id } });
}

function openDetail(id: string) {
  void router.push({ name: 'achievements.detail', params: { id } });
}

function openApproval(approvalInstanceId: string | null) {
  if (!approvalInstanceId) return;
  void router.push({ name: 'workflow.approval-center', query: { focus: approvalInstanceId } });
}

onMounted(async () => {
  await Promise.all([load(), loadOptions()]);
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">成果列表</p>
      <h2>成果列表</h2>
      <p>统一检索论文、竞赛成果与软著，支持按类型、状态、级别、项目和成员筛选，并可直接查看认定审批轨迹。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-input v-model="query.keyword" placeholder="搜索成果标题、项目或成员" clearable @keyup.enter="load" />
        <el-select v-model="query.achievementType">
          <el-option v-for="option in typeOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-select v-model="query.statusCode">
          <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-input v-model="query.levelCode" placeholder="级别，如 NATIONAL" clearable />
        <el-input v-model="query.projectId" placeholder="项目编号" clearable />
        <el-select v-model="query.memberUserId" clearable filterable>
          <el-option v-for="option in memberOptions" :key="option.id" :label="option.label" :value="option.id" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button v-if="canCreate" type="success" @click="openCreate">录入成果</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="title" label="成果标题" min-width="220" />
        <el-table-column prop="achievementType" label="类型" width="160" />
        <el-table-column prop="statusCode" label="状态" width="140" />
        <el-table-column prop="levelCode" label="级别" width="140" />
        <el-table-column prop="recognizedGrade" label="认定等级" min-width="160" />
        <el-table-column prop="projectName" label="关联项目" min-width="160" />
        <el-table-column prop="contributorNames" label="贡献成员" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ row.contributorNames.join('、') }}</template>
        </el-table-column>
        <el-table-column prop="latestResult" label="最近结果" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">查看详情</el-button>
            <el-button link type="primary" @click="openApproval(row.approvalInstanceId)">审批</el-button>
            <el-button
              v-if="canUpdate && row.statusCode === AchievementStatus.DRAFT"
              link
              type="success"
              @click="openEdit(row.id)"
            >
              编辑
            </el-button>
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
