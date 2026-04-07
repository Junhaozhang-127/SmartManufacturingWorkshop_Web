<script setup lang="ts">
import { useUiStore } from '@web/stores/ui';
import { computed } from 'vue';

const uiStore = useUiStore();
const payload = computed(() => uiStore.payload as Record<string, unknown> | null);
</script>

<template>
  <el-drawer
    :model-value="uiStore.visible"
    :title="uiStore.title"
    size="32rem"
    @close="uiStore.closeDrawer"
  >
    <template v-if="payload">
      <dl class="drawer-descriptions">
        <template v-for="[key, value] in Object.entries(payload)" :key="key">
          <dt>{{ key }}</dt>
          <dd>{{ Array.isArray(value) ? value.join(' / ') : value }}</dd>
        </template>
      </dl>
    </template>
    <el-empty v-else description="当前没有抽屉内容" />
  </el-drawer>
</template>
