<script setup lang="ts">
import {
  Bell,
  Collection,
  DataAnalysis,
  DocumentAdd,
  EditPen,
  Finished,
  Histogram,
  House,
  Medal,
  Money,
  Monitor,
  Picture,
  Promotion,
  Setting,
  Share,
  Tools,
  Trophy,
  User,
  UserFilled,
} from '@element-plus/icons-vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import BreadcrumbBar from '../components/layout/BreadcrumbBar.vue';
import GlobalDrawerHost from '../components/layout/GlobalDrawerHost.vue';
import IcpBeianFooter from '../components/layout/IcpBeianFooter.vue';
import TopBar from '../components/layout/TopBar.vue';
import { adminMenu, type AppMenuItem,filterMenuByAccess } from '../router/menu';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const iconMap = {
  Bell,
  Collection,
  DataAnalysis,
  EditPen,
  House,
  Histogram,
  Finished,
  DocumentAdd,
  Medal,
  Money,
  Monitor,
  Picture,
  Promotion,
  Share,
  Setting,
  Tools,
  Trophy,
  User,
  UserFilled,
};

const menuItems = computed(() =>
  filterMenuByAccess(adminMenu, authStore.permissions, authStore.activeRoleCode),
);

const activeMenuPath = computed(() => {
  const meta = route.meta as { activeMenu?: string };
  return typeof meta.activeMenu === 'string' && meta.activeMenu ? meta.activeMenu : route.path;
});

function findOpenKeys(items: AppMenuItem[], targetPath: string): string[] {
  for (const item of items) {
    if (item.children?.length) {
      const directMatch = item.children.some((child) => child.path === targetPath);
      if (directMatch) return [item.key];
      const childMatch = findOpenKeys(item.children, targetPath);
      if (childMatch.length) return [item.key, ...childMatch];
    } else if (item.path === targetPath) {
      return [];
    }
  }
  return [];
}

const defaultOpeneds = computed(() => findOpenKeys(menuItems.value, activeMenuPath.value));

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
          <p>{{ authStore.activeRole?.roleName || '未登录' }}</p>
        </div>
      </div>
      <el-menu
        :key="activeMenuPath"
        :default-active="activeMenuPath"
        :default-openeds="defaultOpeneds"
        class="sidebar__menu"
      >
        <template v-for="item in menuItems" :key="item.key">
          <el-sub-menu v-if="item.children?.length" :index="item.key">
            <template #title>
              <el-icon v-if="item.icon">
                <component :is="iconMap[item.icon as keyof typeof iconMap]" />
              </el-icon>
              <span>{{ item.label }}</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.key"
              :index="child.path"
              @click="navigate(child.path)"
            >
              <el-icon v-if="child.icon">
                <component :is="iconMap[child.icon as keyof typeof iconMap]" />
              </el-icon>
              <span>{{ child.label }}</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item
            v-else
            :key="item.key"
            :index="item.path"
            @click="navigate(item.path)"
          >
            <el-icon v-if="item.icon">
              <component :is="iconMap[item.icon as keyof typeof iconMap]" />
            </el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </template>
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
      <IcpBeianFooter />
    </main>
    <GlobalDrawerHost />
  </div>
</template>
