<script setup lang="ts">
import { createDemoApproval, fetchMyDemoApprovals } from '@web/api/approval';
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

const loading = ref(false);
const submitting = ref(false);
const records = ref<Awaited<ReturnType<typeof fetchMyDemoApprovals>>['data']>([]);

const form = reactive({
  title: '',
  reason: '',
});

async function load() {
  loading.value = true;
  try {
    const response = await fetchMyDemoApprovals();
    records.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '演示审批单加载失败');
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!form.title.trim() || !form.reason.trim()) {
    ElMessage.warning('请先填写标题和申请说明');
    return;
  }

  submitting.value = true;
  try {
    await createDemoApproval(form.title, form.reason);
    ElMessage.success('演示审批单已发起');
    form.title = '';
    form.reason = '';
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '演示审批单提交失败');
  } finally {
    submitting.value = false;
  }
}

function formatStatus(status: string) {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    IN_APPROVAL: '审批中',
    APPROVED: '已通过',
    REJECTED: '已驳回',
    WITHDRAWN: '已撤回',
  };

  return map[status] ?? status;
}

onMounted(load);
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">Workflow Demo</p>
      <h2>通用测试审批单</h2>
      <p>
        这是第一版通用流程引擎的演示业务。提交后会按“组长审批 -> 部长审批”的模板流转，后续成员转正、报修、经费、晋升都复用同一入口。
      </p>
    </div>

    <div class="demo-grid">
      <div class="panel-card">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">Submit Demo</p>
            <h2>发起测试单据</h2>
          </div>
        </div>

        <el-form label-position="top">
          <el-form-item label="单据标题">
            <el-input v-model="form.title" maxlength="128" show-word-limit placeholder="例如：成员转正流程联调单" />
          </el-form-item>
          <el-form-item label="申请说明">
            <el-input
              v-model="form.reason"
              type="textarea"
              :rows="6"
              maxlength="500"
              show-word-limit
              placeholder="填写需要审批的申请说明，作为统一流程引擎演示数据"
            />
          </el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit">发起审批</el-button>
        </el-form>
      </div>

      <div class="panel-card">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">My Demo Forms</p>
            <h2>我的演示单据</h2>
          </div>
          <el-button link type="primary" @click="load">刷新</el-button>
        </div>

        <el-table v-loading="loading" :data="records" border stripe>
          <el-table-column label="标题" prop="title" min-width="180" />
          <el-table-column label="说明" prop="reason" min-width="220" show-overflow-tooltip />
          <el-table-column label="状态" min-width="120">
            <template #default="{ row }">
              <el-tag>{{ formatStatus(row.statusCode) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="审批实例" prop="approvalInstanceId" min-width="140" />
          <el-table-column label="更新时间" min-width="180">
            <template #default="{ row }">
              {{ new Date(row.updatedAt).toLocaleString() }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </section>
</template>
