<script setup lang="ts">
import { DeviceRepairAction } from '@smw/shared';
import { fetchAchievementUsers } from '@web/api/competition-achievement';
import {
  assignDeviceRepair,
  confirmDeviceRepair,
  fetchDeviceRepairDetail,
  fetchDeviceRepairList,
  resolveDeviceRepair,
} from '@web/api/device';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const detailLoading = ref(false);
const actionLoading = ref(false);
const detailVisible = ref(false);
const users = ref<Array<{ id: string; label: string }>>([]);
const detail = ref<Awaited<ReturnType<typeof fetchDeviceRepairDetail>>['data'] | null>(null);
const assignFormRef = ref<FormInstance>();
const resolveFormRef = ref<FormInstance>();

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  statusCode: '',
  severity: '',
  handlerUserId: '',
});

const assignVisible = ref(false);
const resolveVisible = ref(false);
const confirmVisible = ref(false);

const assignForm = reactive({ handlerUserId: '', comment: '' });
const resolveForm = reactive({ resolutionSummary: '', handlerComment: '', actualCost: undefined as number | undefined });
const confirmForm = reactive({ comment: '' });

const list = ref<Awaited<ReturnType<typeof fetchDeviceRepairList>>['data']['items']>([]);
const total = ref(0);

const statusOptions = ['IN_APPROVAL', 'REJECTED', 'PROCESSING', 'RESOLVED', 'CONFIRMED', 'CANCELLED'];
const severityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const detailTitle = computed(() => (detail.value ? `${detail.value.repairNo} / ${detail.value.deviceName}` : '维修工单'));

async function loadUsers() {
  const response = await fetchAchievementUsers();
  users.value = response.data.map((item) => ({ id: item.id, label: item.label }));
}

async function loadList() {
  loading.value = true;
  try {
    const response = await fetchDeviceRepairList(query);
    list.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '维修工单加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(id: string) {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    const response = await fetchDeviceRepairDetail(id);
    detail.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '维修工单详情加载失败');
  } finally {
    detailLoading.value = false;
  }
}

async function submitAssign() {
  if (!detail.value || !assignFormRef.value) return;
  await assignFormRef.value.validate();

  actionLoading.value = true;
  try {
    await assignDeviceRepair(detail.value.id, assignForm);
    ElMessage.success('处理人已更新');
    assignVisible.value = false;
    await Promise.all([loadList(), openDetail(detail.value.id)]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '处理人分配失败');
  } finally {
    actionLoading.value = false;
  }
}

async function submitResolve() {
  if (!detail.value || !resolveFormRef.value) return;
  await resolveFormRef.value.validate();

  actionLoading.value = true;
  try {
    await resolveDeviceRepair(detail.value.id, resolveForm);
    ElMessage.success('维修结果已提交');
    resolveVisible.value = false;
    await Promise.all([loadList(), openDetail(detail.value.id)]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '维修结果提交失败');
  } finally {
    actionLoading.value = false;
  }
}

async function submitConfirm() {
  if (!detail.value) return;

  actionLoading.value = true;
  try {
    await confirmDeviceRepair(detail.value.id, confirmForm);
    ElMessage.success('维修结果已确认');
    confirmVisible.value = false;
    await Promise.all([loadList(), openDetail(detail.value.id)]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '维修确认失败');
  } finally {
    actionLoading.value = false;
  }
}

function openApproval(approvalInstanceId: string | null) {
  if (!approvalInstanceId) return;
  void router.push({ name: 'workflow.approval-center', query: { focus: approvalInstanceId } });
}

watch(
  () => route.query.focus,
  (focus) => {
    if (typeof focus === 'string' && focus) {
      void openDetail(focus);
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await Promise.all([loadUsers(), loadList()]);
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">DEV-03 Repair Orders</p>
      <h2>维修报修工单</h2>
      <p>工单统一接入审批中心；P0 覆盖发起、处理人分配、处理结果回填、报修人确认和全程状态留痕。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-input v-model="query.keyword" placeholder="搜索工单号 / 故障描述 / 设备" clearable @keyup.enter="loadList" />
        <el-select v-model="query.statusCode" clearable placeholder="工单状态">
          <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.severity" clearable placeholder="紧急程度">
          <el-option v-for="item in severityOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.handlerUserId" clearable filterable placeholder="处理人">
          <el-option v-for="item in users" :key="item.id" :label="item.label" :value="item.id" />
        </el-select>
        <el-button type="primary" @click="loadList">查询</el-button>
      </div>

      <el-table v-loading="loading" :data="list">
        <el-table-column prop="deviceName" label="设备" min-width="180" />
        <el-table-column prop="faultDescription" label="故障描述" min-width="260" show-overflow-tooltip />
        <el-table-column prop="severity" label="紧急程度" min-width="110" />
        <el-table-column prop="statusCode" label="状态" min-width="120" />
        <el-table-column prop="applicantName" label="报修人" min-width="120" />
        <el-table-column prop="handlerName" label="处理人" min-width="120" />
        <el-table-column prop="latestResult" label="当前结果" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            <el-button v-if="row.approvalInstanceId" link type="success" @click="openApproval(row.approvalInstanceId)">
              审批
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          layout="total, prev, pager, next"
          :total="total"
          @current-change="loadList"
          @size-change="loadList"
        />
      </div>
    </div>

    <el-drawer v-model="detailVisible" size="760px">
      <template #header>
        <div>
          <strong>{{ detailTitle }}</strong>
          <div v-if="detail" class="drawer-subtitle">{{ detail.statusCode }} / {{ detail.severity }}</div>
        </div>
      </template>

      <div v-loading="detailLoading" class="device-detail-grid">
        <template v-if="detail">
          <div class="panel-card">
            <div class="panel-card__header">
              <div>
                <p class="panel-card__eyebrow">Work Order</p>
                <h2>工单信息</h2>
              </div>
              <div class="drawer-actions">
                <el-button
                  v-if="detail.availableActions.includes(DeviceRepairAction.ASSIGN)"
                  @click="assignVisible = true"
                >
                  分配处理人
                </el-button>
                <el-button
                  v-if="detail.availableActions.includes(DeviceRepairAction.RESOLVE)"
                  type="primary"
                  @click="resolveVisible = true"
                >
                  提交处理结果
                </el-button>
                <el-button
                  v-if="detail.availableActions.includes(DeviceRepairAction.CONFIRM_RESULT)"
                  type="success"
                  @click="confirmVisible = true"
                >
                  结果确认
                </el-button>
              </div>
            </div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="设备">{{ detail.device.deviceName }}</el-descriptions-item>
              <el-descriptions-item label="设备状态">{{ detail.device.statusCode }}</el-descriptions-item>
              <el-descriptions-item label="报修人">{{ detail.applicantName }}</el-descriptions-item>
              <el-descriptions-item label="处理人">{{ detail.handlerName || '未分配' }}</el-descriptions-item>
              <el-descriptions-item label="审批实例">
                <el-button v-if="detail.approvalInstanceId" link type="primary" @click="openApproval(detail.approvalInstanceId)">
                  {{ detail.approvalInstanceId }}
                </el-button>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="费用预留">
                申请 {{ detail.requestedAmount ?? '-' }} / 预计 {{ detail.costEstimate ?? '-' }} / 实际 {{ detail.actualCost ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="故障描述" :span="2">{{ detail.faultDescription }}</el-descriptions-item>
              <el-descriptions-item label="处理结果" :span="2">{{ detail.resolutionSummary || detail.latestResult || '-' }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="panel-card">
            <div class="panel-card__header">
              <div>
                <p class="panel-card__eyebrow">Trace</p>
                <h2>状态留痕</h2>
              </div>
            </div>
            <el-timeline>
              <el-timeline-item
                v-for="(item, index) in detail.statusLogs"
                :key="`${item.actionType}-${index}`"
                :timestamp="item.createdAt"
              >
                {{ item.actionType }}: {{ item.fromStatus || 'INIT' }} -> {{ item.toStatus || '-' }}
                <span v-if="item.comment">（{{ item.comment }}）</span>
              </el-timeline-item>
            </el-timeline>
          </div>
        </template>
      </div>
    </el-drawer>

    <el-dialog v-model="assignVisible" title="分配处理人" width="480px">
      <el-form ref="assignFormRef" :model="assignForm" label-width="100px">
        <el-form-item label="处理人" prop="handlerUserId" :rules="[{ required: true, message: '请选择处理人' }]">
          <el-select v-model="assignForm.handlerUserId" filterable>
            <el-option v-for="item in users" :key="item.id" :label="item.label" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="assignForm.comment" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitAssign">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resolveVisible" title="提交处理结果" width="520px">
      <el-form ref="resolveFormRef" :model="resolveForm" label-width="100px">
        <el-form-item label="处理结果" prop="resolutionSummary" :rules="[{ required: true, message: '请输入处理结果' }]">
          <el-input v-model="resolveForm.resolutionSummary" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="补充说明">
          <el-input v-model="resolveForm.handlerComment" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="实际费用">
          <el-input-number v-model="resolveForm.actualCost" :min="0" :precision="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitResolve">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="confirmVisible" title="确认维修结果" width="480px">
      <el-form :model="confirmForm" label-width="100px">
        <el-form-item label="确认意见">
          <el-input v-model="confirmForm.comment" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="confirmVisible = false">取消</el-button>
        <el-button type="success" :loading="actionLoading" @click="submitConfirm">确认通过</el-button>
      </template>
    </el-dialog>
  </section>
</template>
