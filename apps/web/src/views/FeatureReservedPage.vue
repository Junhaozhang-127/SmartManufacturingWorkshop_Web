<script setup lang="ts">
import { fetchReservedExitFeature, fetchReservedTransferFeature } from '@web/api/member';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const loading = ref(false);
const message = ref('');

const isTransfer = computed(() => route.name === 'members.transfers');

async function load() {
  loading.value = true;
  try {
    const response = isTransfer.value ? await fetchReservedTransferFeature() : await fetchReservedExitFeature();
    message.value = response.data.message;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '预留能力加载失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="page-grid">
    <div class="hero-card">
      <p class="hero-card__eyebrow">P1 Reserved</p>
      <h2>{{ isTransfer ? '调岗流程预留' : '退出流程预留' }}</h2>
      <p>{{ message }}</p>
    </div>

    <div v-loading="loading" class="panel-card">
      <el-empty :description="isTransfer ? '当前版本只开放调岗菜单与接口占位。' : '当前版本只开放退出菜单与接口占位。'" />
    </div>
  </section>
</template>
