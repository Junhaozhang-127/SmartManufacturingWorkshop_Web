<script setup lang="ts">
import type { ApprovalCenterTab, ApprovalDetail, ApprovalListItem } from '@smw/shared';
import { ApprovalCenterTab as ApprovalCenterTabEnum } from '@smw/shared';
import {
  approveApproval,
  commentApproval,
  fetchApprovalDetail,
  fetchApprovalList,
  fetchTransferCandidates,
  rejectApproval,
  transferApproval,
  withdrawApproval,
} from '@web/api/approval';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const detailLoading = ref(false);
const submitting = ref(false);
const drawerVisible = ref(false);
const rows = ref<ApprovalListItem[]>([]);
const total = ref(0);
const selectedDetail = ref<ApprovalDetail | null>(null);
const transferCandidates = ref<Array<{ id: string; username: string; displayName: string }>>([]);

const query = reactive({
  tab: ApprovalCenterTabEnum.PENDING as ApprovalCenterTab,
  page: 1,
  pageSize: 10,
  keyword: '',
});

const opinionForm = reactive({
  comment: '',
  transferUserId: '',
});

const tabOptions = [
  { label: '待审批', value: ApprovalCenterTabEnum.PENDING },
  { label: '已审批', value: ApprovalCenterTabEnum.PROCESSED },
  { label: '退回记录', value: ApprovalCenterTabEnum.RETURNED },
];

function goWorkflowApproval() {
  void router.push({ name: 'workflow.approval-center' });
}

function goCreationReview() {
  void router.push({ name: 'workflow.approval-center.creation-review' });
}

const actionButtons = computed(() => selectedDetail.value?.availableActions ?? []);

async function load() {
  loading.value = true;
  try {
    const response = await fetchApprovalList(query.tab, query.page, query.pageSize, query.keyword);
    rows.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审批列表加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(row: ApprovalListItem) {
  drawerVisible.value = true;
  detailLoading.value = true;
  opinionForm.comment = '';
  opinionForm.transferUserId = '';
  transferCandidates.value = [];

  try {
    const response = await fetchApprovalDetail(row.id);
    selectedDetail.value = response.data;

    if (response.data.availableActions.includes('transfer')) {
      const transferResponse = await fetchTransferCandidates(row.id);
      transferCandidates.value = transferResponse.data;
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审批详情加载失败');
    drawerVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
}

async function submitAction(action: 'approve' | 'reject' | 'transfer' | 'comment' | 'withdraw') {
  if (!selectedDetail.value) {
    return;
  }

  if (action === 'reject' && !opinionForm.comment.trim()) {
    ElMessage.warning('驳回时必须填写审批意见');
    return;
  }

  if (action === 'transfer' && !opinionForm.transferUserId) {
    ElMessage.warning('请选择转交对象');
    return;
  }

  if (action === 'comment' && !opinionForm.comment.trim()) {
    ElMessage.warning('补充说明时必须填写内容');
    return;
  }

  if (action === 'withdraw') {
    await ElMessageBox.confirm('撤回后流程会立即终止，是否继续？', '撤回确认', {
      type: 'warning',
    });
  }

  submitting.value = true;
  try {
    switch (action) {
      case 'approve':
        await approveApproval(selectedDetail.value.id, opinionForm.comment);
        break;
      case 'reject':
        await rejectApproval(selectedDetail.value.id, opinionForm.comment);
        break;
      case 'transfer':
        await transferApproval(selectedDetail.value.id, opinionForm.transferUserId, opinionForm.comment);
        break;
      case 'comment':
        await commentApproval(selectedDetail.value.id, opinionForm.comment);
        break;
      case 'withdraw':
        await withdrawApproval(selectedDetail.value.id, opinionForm.comment);
        break;
    }

    ElMessage.success('审批动作已提交');
    await openDetail(selectedDetail.value);
    await load();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error instanceof Error ? error.message : '审批动作执行失败');
    }
  } finally {
    submitting.value = false;
  }
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    PENDING: '审批中',
    APPROVED: '已通过',
    REJECTED: '已驳回',
    WITHDRAWN: '已撤回',
  };

  return map[status] ?? status;
}

watch(
  () => query.tab,
  () => {
    query.page = 1;
    void load();
  },
);

onMounted(load);

watch(
  () => [route.query.focus, rows.value.length] as const,
  async ([focus]) => {
    if (!focus || !rows.value.length) {
      return;
    }

    const target = rows.value.find((item) => item.id === String(focus));
    if (target) {
      await openDetail(target);
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">审批中心</p>
      <h2>统一审批中心</h2>
      <p>
        所有业务单据通过统一的 `businessType + businessId` 进入审批中心。当前首版已打通待审批、已审批、退回记录、轨迹查看和意见处理。
      </p>
      <div class="hero-card__actions">
        <el-button-group>
          <el-button type="primary" @click="goWorkflowApproval">工作流审批</el-button>
          <el-button @click="goCreationReview">创作审核</el-button>
        </el-button-group>
      </div>
    </div>

    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">流程队列</p>
          <h2>审批工作台</h2>
        </div>
      </div>

      <div class="toolbar-row approval-toolbar">
        <el-segmented v-model="query.tab" :options="tabOptions" />
        <div class="approval-toolbar__search">
          <el-input
            v-model="query.keyword"
            placeholder="按标题或申请人搜索"
            clearable
            @keyup.enter="load"
          />
          <el-button type="primary" @click="load">查询</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="rows" border stripe>
        <el-table-column label="单据标题" prop="title" min-width="220" />
        <el-table-column label="业务类型" prop="businessType" min-width="140" />
        <el-table-column label="申请人" prop="applicantName" min-width="120" />
        <el-table-column label="当前节点" prop="currentNodeName" min-width="140" />
        <el-table-column label="状态" min-width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'warning'">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最近意见" prop="latestComment" min-width="180" show-overflow-tooltip />
        <el-table-column label="更新时间" min-width="180">
          <template #default="{ row }">
            {{ new Date(row.updatedAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
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

    <el-drawer v-model="drawerVisible" size="52%" destroy-on-close>
      <template #header>
        <div>
          <strong>{{ selectedDetail?.title || '审批详情' }}</strong>
          <p class="drawer-caption">{{ selectedDetail?.businessType }}</p>
        </div>
      </template>

      <div v-loading="detailLoading" class="approval-detail">
        <template v-if="selectedDetail">
          <div class="approval-detail__section">
            <h3>申请信息</h3>
            <dl class="drawer-descriptions">
              <dt>申请人</dt>
              <dd>{{ selectedDetail.applicantName }}</dd>
              <dt>状态</dt>
              <dd>{{ formatStatus(selectedDetail.status) }}</dd>
              <dt>当前节点</dt>
              <dd>{{ selectedDetail.currentNodeName || '流程已结束' }}</dd>
              <dt>业务标识</dt>
              <dd>{{ selectedDetail.businessType }} / {{ selectedDetail.businessId }}</dd>
            </dl>
          </div>

          <div v-if="selectedDetail.businessSnapshot" class="approval-detail__section">
            <h3>业务数据</h3>
            <pre class="approval-detail__snapshot">{{ JSON.stringify(selectedDetail.businessSnapshot, null, 2) }}</pre>
          </div>

          <div class="approval-detail__section">
            <div class="approval-detail__section-header">
              <h3>审批意见</h3>
              <span>支持通过、驳回、转交、补充说明、撤回</span>
            </div>
            <el-form label-position="top">
              <el-form-item label="意见说明">
                <el-input
                  v-model="opinionForm.comment"
                  type="textarea"
                  :rows="4"
                  maxlength="500"
                  show-word-limit
                  placeholder="请输入审批意见或补充说明"
                />
              </el-form-item>
              <el-form-item v-if="actionButtons.includes('transfer')" label="转交对象">
                <el-select v-model="opinionForm.transferUserId" placeholder="请选择可转交人员" style="width: 100%">
                  <el-option
                    v-for="candidate in transferCandidates"
                    :key="candidate.id"
                    :label="`${candidate.displayName} (${candidate.username})`"
                    :value="candidate.id"
                  />
                </el-select>
              </el-form-item>
            </el-form>

            <div class="approval-detail__actions">
              <el-button
                v-if="actionButtons.includes('approve')"
                type="success"
                :loading="submitting"
                @click="submitAction('approve')"
              >
                通过
              </el-button>
              <el-button
                v-if="actionButtons.includes('reject')"
                type="danger"
                :loading="submitting"
                @click="submitAction('reject')"
              >
                驳回
              </el-button>
              <el-button
                v-if="actionButtons.includes('transfer')"
                :loading="submitting"
                @click="submitAction('transfer')"
              >
                转交
              </el-button>
              <el-button
                v-if="actionButtons.includes('comment')"
                :loading="submitting"
                @click="submitAction('comment')"
              >
                补充说明
              </el-button>
              <el-button
                v-if="actionButtons.includes('withdraw')"
                type="warning"
                plain
                :loading="submitting"
                @click="submitAction('withdraw')"
              >
                撤回
              </el-button>
            </div>
          </div>

          <div class="approval-detail__section">
            <h3>审批轨迹</h3>
            <el-timeline>
              <el-timeline-item
                v-for="log in selectedDetail.logs"
                :key="log.id"
                :timestamp="new Date(log.createdAt).toLocaleString()"
              >
                <div class="approval-log">
                  <strong>{{ log.actionType }}</strong>
                  <span>{{ log.nodeName || '流程事件' }}</span>
                  <p>{{ log.actorName }}{{ log.targetUserName ? ` -> ${log.targetUserName}` : '' }}</p>
                  <p v-if="log.comment">{{ log.comment }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </template>
      </div>
    </el-drawer>
  </section>
</template>

<style scoped>
.hero-card__actions {
  margin-top: 0.75rem;
}
</style>
