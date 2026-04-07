<script setup lang="ts">
import { fetchHealth } from '@web/api/health';
import { onMounted, ref } from 'vue';

const loading = ref(false);
const health = ref<Awaited<ReturnType<typeof fetchHealth>>['data'] | null>(null);

async function load() {
  loading.value = true;
  try {
    const response = await fetchHealth();
    health.value = response.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="page-grid">
    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">联通验证</p>
          <h2>系统健康检查页</h2>
        </div>
        <el-button :loading="loading" type="primary" plain @click="load">刷新</el-button>
      </div>

      <el-skeleton :loading="loading" animated>
        <template #default>
          <div v-if="health" class="health-grid">
            <article class="health-card">
              <span>应用状态</span>
              <strong>{{ health.app.status }}</strong>
              <small>{{ health.app.now }}</small>
            </article>
            <article class="health-card">
              <span>数据库</span>
              <strong>{{ health.dependencies.database.status }}</strong>
              <small>{{ health.dependencies.database.message }}</small>
            </article>
            <article class="health-card">
              <span>Redis 配置</span>
              <strong>{{ health.dependencies.redis.configured ? '已预留' : '未配置' }}</strong>
              <small>{{ health.dependencies.redis.host || '未设置' }}</small>
            </article>
            <article class="health-card">
              <span>MinIO 配置</span>
              <strong>{{ health.dependencies.minio.configured ? '已预留' : '未配置' }}</strong>
              <small>{{ health.dependencies.minio.bucket || '未设置' }}</small>
            </article>
          </div>
        </template>
      </el-skeleton>
    </div>
  </section>
</template>
