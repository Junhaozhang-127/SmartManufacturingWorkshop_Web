<script setup lang="ts">
import { fetchNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '@web/api/system';
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const rows = ref<Awaited<ReturnType<typeof fetchNotifications>>['data']['items']>([]);
const total = ref(0);
const unreadCount = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
  readStatus: '' as '' | 'READ' | 'UNREAD',
});

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

onMounted(() => {
  void load();
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
        <el-button :disabled="!unreadCount" @click="readAll">全部标记已读</el-button>
        <el-tag type="warning">未读 {{ unreadCount }}</el-tag>
      </div>

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
