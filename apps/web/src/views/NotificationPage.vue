<script setup lang="ts">
import { RoleCode } from '@smw/shared';
import { fetchOrgOverview } from '@web/api/member';
import { fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead, publishNotification } from '@web/api/system';
import { useIsMobile } from '@web/composables/useIsMobile';
import { useAuthStore } from '@web/stores/auth';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const { isMobile } = useIsMobile();
const loading = ref(false);
const rows = ref<Awaited<ReturnType<typeof fetchNotifications>>['data']['items']>([]);
const total = ref(0);
const unreadCount = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
  readStatus: '' as '' | 'READ' | 'UNREAD',
});

const canPublish = computed(() => [RoleCode.TEACHER, RoleCode.MINISTER].includes(authStore.activeRoleCode ?? RoleCode.MEMBER));
const departmentOptions = ref<Array<{ id: string; label: string }>>([]);

async function loadDepartmentOptions() {
  if (authStore.activeRoleCode !== RoleCode.TEACHER) {
    departmentOptions.value = [];
    return;
  }

  try {
    const response = await fetchOrgOverview();
    const list: Array<{ id: string; label: string }> = [];
    const walk = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.unitType === 'DEPARTMENT') {
          list.push({ id: node.id, label: node.unitName });
        }
        if (Array.isArray(node.children) && node.children.length) {
          walk(node.children);
        }
      }
    };
    walk(response.data.tree as any[]);
    departmentOptions.value = list;
  } catch {
    departmentOptions.value = [];
  }
}

async function load() {
  loading.value = true;
  try {
    const response = await fetchNotifications(query);
    rows.value = response.data.items;
    total.value = response.data.meta.total;
    unreadCount.value = response.data.meta.unreadCount;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '通知消息加载失败');
  } finally {
    loading.value = false;
  }
}

async function openNotification(id: string, path: string | null, routeQuery: Record<string, string> | null) {
  try {
    await markNotificationAsRead(id);
  } catch {
    // Ignore read status errors and continue navigation.
  }
  await load();
  if (path) {
    await router.push({ path, query: routeQuery ?? undefined });
  }
}

async function readAll() {
  try {
    await markAllNotificationsAsRead();
    ElMessage.success('已全部标记为已读');
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '批量已读失败');
  }
}

const publishVisible = ref(false);
const publishSaving = ref(false);
const publishForm = reactive({
  title: '',
  content: '',
  scope: 'DEPARTMENT' as 'GLOBAL' | 'DEPARTMENT',
  departmentId: '',
  levelCode: 'INFO' as 'INFO' | 'WARN' | 'ERROR',
  categoryCode: 'GENERAL',
});

function openPublish() {
  publishForm.title = '';
  publishForm.content = '';
  publishForm.levelCode = 'INFO';
  publishForm.categoryCode = 'GENERAL';
  publishForm.scope = authStore.activeRoleCode === RoleCode.TEACHER ? 'GLOBAL' : 'DEPARTMENT';
  publishForm.departmentId = authStore.activeRoleCode === RoleCode.TEACHER ? '' : (authStore.orgProfile?.departmentId || '');
  publishVisible.value = true;
}

async function submitPublish() {
  if (!publishForm.title.trim() || !publishForm.content.trim()) {
    ElMessage.error('请填写通知标题与内容');
    return;
  }

  if (authStore.activeRoleCode === RoleCode.TEACHER && publishForm.scope === 'DEPARTMENT' && !publishForm.departmentId) {
    ElMessage.error('请选择部门');
    return;
  }

  publishSaving.value = true;
  try {
    const response = await publishNotification({
      title: publishForm.title.trim(),
      content: publishForm.content.trim(),
      categoryCode: publishForm.categoryCode,
      levelCode: publishForm.levelCode,
      scope: authStore.activeRoleCode === RoleCode.MINISTER ? 'DEPARTMENT' : publishForm.scope,
      departmentId: authStore.activeRoleCode === RoleCode.MINISTER ? (authStore.orgProfile?.departmentId || undefined) : (publishForm.departmentId || undefined),
      routePath: '/notifications',
    });

    ElMessage.success(`已发布通知（${response.data.createdCount} 人）`);
    publishVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '发布失败');
  } finally {
    publishSaving.value = false;
  }
}

onMounted(() => {
  void Promise.all([loadDepartmentOptions(), load()]);
});
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">通知中心</p>
      <h2>通知消息</h2>
      <p>统一查看审批消息、资格提醒和系统公告，支持已读/未读状态管理与关联业务跳转。</p>
    </div>

    <div class="panel-card">
      <div class="toolbar-row">
        <el-select v-model="query.readStatus" style="width: 12rem">
          <el-option label="全部状态" value="" />
          <el-option label="未读" value="UNREAD" />
          <el-option label="已读" value="READ" />
        </el-select>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button v-if="canPublish" type="success" @click="openPublish">发布通知</el-button>
        <el-button :disabled="!unreadCount" @click="readAll">全部标记已读</el-button>
        <el-tag type="warning">未读 {{ unreadCount }}</el-tag>
      </div>

      <div class="table-scroll">
        <el-table v-loading="loading" :data="rows" border stripe>
          <el-table-column label="标题" prop="title" min-width="220" />
          <el-table-column label="分类" prop="categoryCode" width="140" />
          <el-table-column label="级别" prop="levelCode" width="120" />
          <el-table-column label="内容" prop="content" min-width="280" show-overflow-tooltip />
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="row.read ? 'info' : 'danger'">{{ row.read ? '已读' : '未读' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="时间" min-width="180">
            <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openNotification(row.id, row.routePath, row.routeQuery)">
                查看业务
              </el-button>
              <el-button
                v-if="!row.read"
                link
                @click="openNotification(row.id, row.routePath || '/notifications', row.routeQuery)"
              >
                标记已读
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

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

    <el-dialog v-model="publishVisible" title="发布通知" :width="isMobile ? '92%' : '640px'" destroy-on-close>
      <el-form label-width="110px">
        <el-form-item label="标题">
          <el-input v-model="publishForm.title" maxlength="128" show-word-limit />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="publishForm.content" type="textarea" :rows="6" maxlength="1000" show-word-limit />
        </el-form-item>
        <el-form-item label="级别">
          <el-select v-model="publishForm.levelCode" style="width: 10rem">
            <el-option label="INFO" value="INFO" />
            <el-option label="WARN" value="WARN" />
            <el-option label="ERROR" value="ERROR" />
          </el-select>
        </el-form-item>
        <el-form-item label="范围">
          <template v-if="authStore.activeRoleCode === RoleCode.MINISTER">
            <el-tag type="info">本部门</el-tag>
          </template>
          <template v-else>
            <el-radio-group v-model="publishForm.scope">
              <el-radio-button label="GLOBAL">全局</el-radio-button>
              <el-radio-button label="DEPARTMENT">部门</el-radio-button>
            </el-radio-group>
          </template>
        </el-form-item>
        <el-form-item v-if="authStore.activeRoleCode === RoleCode.TEACHER && publishForm.scope === 'DEPARTMENT'" label="目标部门">
          <el-select v-model="publishForm.departmentId" filterable clearable style="width: 100%">
            <el-option v-for="item in departmentOptions" :key="item.id" :label="item.label" :value="item.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="publishSaving" @click="publishVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishSaving" @click="submitPublish">发布</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.table-scroll {
  width: 100%;
  overflow-x: auto;
}

.table-scroll :deep(.el-table) {
  min-width: 1040px;
}

@media (max-width: 768px) {
  .toolbar-row {
    flex-wrap: wrap;
    gap: 12px;
  }

  .toolbar-row :deep(.el-select) {
    width: 100% !important;
  }

  .table-scroll :deep(.el-table) {
    min-width: 980px;
  }
}
</style>
