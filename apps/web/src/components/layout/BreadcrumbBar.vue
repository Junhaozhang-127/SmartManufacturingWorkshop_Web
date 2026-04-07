<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const breadcrumbItems = computed(() => {
  const values = route.meta.breadcrumb;

  if (Array.isArray(values)) {
    return values.map((item) => String(item));
  }

  return [typeof route.meta.title === 'string' ? route.meta.title : '未命名页面'];
});
</script>

<template>
  <el-breadcrumb separator="/">
    <el-breadcrumb-item v-for="item in breadcrumbItems" :key="String(item)">
      {{ item }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>
