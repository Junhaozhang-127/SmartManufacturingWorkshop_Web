<script setup lang="ts">
import { type CreationStatus, deleteCreationDraft, fetchMyCreationContents, submitCreationContent } from '@web/api/creation';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const loading = ref(false);
const rows = ref<Awaited<ReturnType<typeof fetchMyCreationContents>>['data']['items']>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  statusCode: '' as CreationStatus | '',
});

const statusOptions: Array<{ label: string; value: CreationStatus | '' }> = [
  { label: '全部状态', value: '' },
  { label: '草稿', value: 'DRAFT' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
];

const canEdit = computed(() => (status: CreationStatus) => status === 'DRAFT' || status === 'REJECTED');
const canSubmit = computed(() => (status: CreationStatus) => status === 'DRAFT' || status === 'REJECTED');

function statusLabel(status: CreationStatus) {
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
      return status;
  }
}

function formatDate(value: string | null) {
  return value ? value.slice(0, 19).replace('T', ' ') : '-';
}

async function load() {
  loading.value = true;
  try {
    const response = await fetchMyCreationContents({
      ...query,
      statusCode: query.statusCode || undefined,
      keyword: query.keyword.trim() || undefined,
    });
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '我的创作加载失败');
  } finally {
    loading.value = false;
  }
}

async function openCreate() {
  await router.push('/creation/new');
}

async function openEdit(id: string) {
  await router.push(`/creation/${id}/edit`);
}

async function submit(id: string) {
  await ElMessageBox.confirm('确认提交审核？提交后将进入“待审核”，不可继续编辑。', '提示', { type: 'warning' });
  try {
    await submitCreationContent(id);
    ElMessage.success('已提交审核');
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '提交审核失败');
  }
}

async function removeDraft(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该草稿？删除后不可恢复。', '删除草稿', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  try {
    await deleteCreationDraft(id);
    ElMessage.success('草稿已删除');
    if (rows.value.length <= 1 && query.page > 1) {
      query.page -= 1;
    }
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除草稿失败');
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">创作中心</p>
      <h2>我的创作</h2>
      <p>支持草稿保存、提交审核与状态跟踪；老师/部长审核通过后可进入智库，并可被推荐到首页。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-input
          v-model="query.keyword"
          placeholder="搜索标题/摘要"
          clearable
          @keyup.enter="load"
        />
        <el-select v-model="query.statusCode" style="width: 160px">
          <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button type="success" @click="openCreate">新建内容</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.statusCode === 'APPROVED' ? 'success' : row.statusCode === 'REJECTED' ? 'danger' : row.statusCode === 'PENDING' ? 'warning' : ''">
              {{ statusLabel(row.statusCode) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">{{ formatDate(row.submittedAt) }}</template>
        </el-table-column>
        <el-table-column label="审核时间" width="180">
          <template #default="{ row }">{{ formatDate(row.reviewedAt) }}</template>
        </el-table-column>
        <el-table-column prop="reviewComment" label="驳回原因/审核意见" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.statusCode === 'DRAFT'" link type="danger" @click="removeDraft(row.id)">删除</el-button>
            <el-button link type="primary" @click="openEdit(row.id)">查看</el-button>
            <el-button v-if="canEdit(row.statusCode)" link type="success" @click="openEdit(row.id)">编辑</el-button>
            <el-button v-if="canSubmit(row.statusCode)" link type="warning" @click="submit(row.id)">提交审核</el-button>
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

