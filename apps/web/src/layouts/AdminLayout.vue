<script setup lang="ts">
import { House, List,Monitor } from '@element-plus/icons-vue';
import { adminMenu, filterMenuByPermissions } from '@web/router/menu';
import { useAuthStore } from '@web/stores/auth';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import BreadcrumbBar from '../components/layout/BreadcrumbBar.vue';
import GlobalDrawerHost from '../components/layout/GlobalDrawerHost.vue';
import TopBar from '../components/layout/TopBar.vue';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const iconMap = {
  House,
  Monitor,
  List,
};

const menuItems = computed(() => filterMenuByPermissions(adminMenu, authStore.permissions));

async function navigate(path: string) {
  await router.push(path);
}
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar__brand">
        <span class="sidebar__brand-mark">SMW</span>
        <div>
          <strong>Lab Admin</strong>
          <p>一期基线</p>
        </div>
      </div>
      <el-menu :default-active="route.path" class="sidebar__menu">
        <el-menu-item
          v-for="item in menuItems"
          :key="item.key"
          :index="item.path"
          @click="navigate(item.path)"
        >
          <el-icon>
            <component :is="iconMap[item.icon as keyof typeof iconMap]" />
          </el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </aside>
    <main class="main-shell">
      <TopBar />
      <div class="content-shell">
        <div class="content-shell__header">
          <BreadcrumbBar />
        </div>
        <div class="content-shell__body">
          <router-view />
        </div>
      </div>
    </main>
    <GlobalDrawerHost />
  </div>
</template>
