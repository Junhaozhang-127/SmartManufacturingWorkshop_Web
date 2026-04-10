<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import PromotionApplicationPage from './PromotionApplicationPage.vue';
import PromotionEligibilityPage from './PromotionEligibilityPage.vue';

type PromotionManageTab = 'eligibility' | 'applications' | 'results';

const route = useRoute();
const router = useRouter();

const activeTab = computed<PromotionManageTab>({
  get() {
    const tab = route.query.tab;
    if (tab === 'applications' || tab === 'results' || tab === 'eligibility') {
      return tab;
    }
    return 'eligibility';
  },
  set(tab) {
    void router.replace({
      name: 'promotion.manage',
      query: {
        ...route.query,
        tab,
      },
    });
  },
});

watch(
  () => route.query.tab,
  (tab) => {
    if (!tab) {
      void router.replace({
        name: 'promotion.manage',
        query: {
          ...route.query,
          tab: 'eligibility',
        },
      });
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="page-grid">
    <div class="panel-card">
      <div class="panel-card__header">
        <div>
          <p class="panel-card__eyebrow">晋升管理</p>
          <h2>晋升管理</h2>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="promo-tabs">
        <el-tab-pane label="资格看板" name="eligibility">
          <PromotionEligibilityPage v-if="activeTab === 'eligibility'" embedded />
        </el-tab-pane>
        <el-tab-pane label="申请记录" name="applications">
          <PromotionApplicationPage v-if="activeTab === 'applications'" embedded />
        </el-tab-pane>
        <el-tab-pane label="评审结果" name="results">
          <PromotionApplicationPage v-if="activeTab === 'results'" embedded />
        </el-tab-pane>
      </el-tabs>
    </div>
  </section>
</template>
