<script setup lang="ts">
import { fetchAchievementUsers } from '@web/api/competition-achievement';
import { createDeviceRepair, fetchDeviceDetail, fetchDeviceList } from '@web/api/device';
import DeviceDetailDrawer from '@web/components/device/DeviceDetailDrawer.vue';
import type { FormInstance } from 'element-plus';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const detailLoading = ref(false);
const submitLoading = ref(false);
const drawerVisible = ref(false);
const reportVisible = ref(false);
const reportFormRef = ref<FormInstance>();
const users = ref<Array<{ id: string; label: string }>>([]);
const detail = ref<Awaited<ReturnType<typeof fetchDeviceDetail>>['data'] | null>(null);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  statusCode: '',
  responsibleUserId: '',
});

const reportForm = reactive({
  deviceId: '',
  faultDescription: '',
  severity: 'MEDIUM',
  handlerUserId: '',
  requestedAmount: undefined as number | undefined,
  costEstimate: undefined as number | undefined,
  fundLinkCode: '',
});

const list = ref<Awaited<ReturnType<typeof fetchDeviceList>>['data']['items']>([]);
const total = ref(0);

const statusOptions = ['IDLE', 'IN_USE', 'REPAIRING', 'SCRAP_PENDING', 'SCRAPPED'];
const severityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const reportTitle = computed(() => (detail.value ? `发起报修 / ${detail.value.deviceName}` : '发起报修'));

async function loadUsers() {
  const response = await fetchAchievementUsers();
  users.value = response.data.map((item) => ({ id: item.id, label: item.label }));
}

async function loadList() {
  loading.value = true;
  try {
    const response = await fetchDeviceList(query);
    list.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '设备台账加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(id: string) {
  drawerVisible.value = true;
  detailLoading.value = true;
  try {
    const response = await fetchDeviceDetail(id);
    detail.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '设备详情加载失败');
  } finally {
    detailLoading.value = false;
  }
}

function openReport(deviceId: string) {
  reportForm.deviceId = deviceId;
  reportForm.faultDescription = '';
  reportForm.severity = 'MEDIUM';
  reportForm.handlerUserId = '';
  reportForm.requestedAmount = undefined;
  reportForm.costEstimate = undefined;
  reportForm.fundLinkCode = '';
  reportVisible.value = true;
}

async function submitRepair() {
  if (!reportFormRef.value) return;
  await reportFormRef.value.validate();

  submitLoading.value = true;
  try {
    const response = await createDeviceRepair({
      ...reportForm,
      handlerUserId: reportForm.handlerUserId || undefined,
      fundLinkCode: reportForm.fundLinkCode || undefined,
    });
    ElMessage.success('报修工单已提交审批');
    reportVisible.value = false;
    await loadList();
    if (detail.value?.id === reportForm.deviceId) {
      await openDetail(reportForm.deviceId);
    }
    void router.push({ name: 'devices.repairs', query: { focus: response.data.id } });
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '报修提交失败');
  } finally {
    submitLoading.value = false;
  }
}

function openRepair(id: string) {
  void router.push({ name: 'devices.repairs', query: { focus: id } });
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadList()]);
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">设备台账</p>
      <h2>设备台账</h2>
      <p>聚合设备基础档案、责任人、状态筛选和维修历史入口。P0 版本保持只读台账，报修通过通用审批中心进入处理流程。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-input v-model="query.keyword" placeholder="搜索设备编码 / 名称 / 类别 / 位置" clearable @keyup.enter="loadList" />
        <el-select v-model="query.statusCode" clearable placeholder="设备状态">
          <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.responsibleUserId" clearable filterable placeholder="责任人">
          <el-option v-for="item in users" :key="item.id" :label="item.label" :value="item.id" />
        </el-select>
        <el-button type="primary" @click="loadList">查询</el-button>
      </div>

      <el-table v-loading="loading" :data="list">
        <el-table-column prop="deviceCode" label="设备编码" min-width="140" />
        <el-table-column prop="deviceName" label="设备名称" min-width="180" />
        <el-table-column prop="categoryName" label="分类" min-width="120" />
        <el-table-column prop="statusCode" label="状态" min-width="120" />
        <el-table-column prop="responsibleUserName" label="责任人" min-width="120" />
        <el-table-column prop="locationLabel" label="位置" min-width="160" />
        <el-table-column prop="latestRepairStatus" label="最新维修状态" min-width="140" />
        <el-table-column prop="abnormalRepairCount" label="异常工单数" min-width="110" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
            <el-button link type="danger" @click="openReport(row.id)">报修</el-button>
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

    <DeviceDetailDrawer
      :visible="drawerVisible"
      :loading="detailLoading"
      :detail="detail"
      @close="drawerVisible = false"
      @report="openReport"
      @open-repair="openRepair"
    />

    <el-dialog v-model="reportVisible" :title="reportTitle" width="640px">
      <el-form ref="reportFormRef" :model="reportForm" label-width="100px">
        <el-form-item label="故障描述" prop="faultDescription" :rules="[{ required: true, message: '请输入故障描述' }]">
          <el-input v-model="reportForm.faultDescription" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="紧急程度" prop="severity" :rules="[{ required: true, message: '请选择紧急程度' }]">
          <el-select v-model="reportForm.severity">
            <el-option v-for="item in severityOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理人">
          <el-select v-model="reportForm.handlerUserId" clearable filterable placeholder="可选，审批通过后可再分配">
            <el-option v-for="item in users" :key="item.id" :label="item.label" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="预计费用">
          <el-input-number v-model="reportForm.requestedAmount" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="预算预估">
          <el-input-number v-model="reportForm.costEstimate" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="经费联动">
          <el-input v-model="reportForm.fundLinkCode" placeholder="预留经费模块关联编码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reportVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitRepair">提交报修</el-button>
      </template>
    </el-dialog>
  </section>
</template>
