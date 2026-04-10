<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue';
import { fetchPortalContentDetail, fetchPortalHome, type PortalHomeResponse } from '@web/api/portal';
import RichTextViewer from '@web/components/RichTextViewer.vue';
import { ElMessage } from 'element-plus';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

type PortalNavKey = 'achievements' | 'competitions' | 'members';

const router = useRouter();
const activeNav = ref<PortalNavKey>('achievements');

const navItems: Array<{ key: PortalNavKey; label: string; anchor: string }> = [
  { key: 'achievements', label: '优秀成果展示', anchor: '#portal-achievements' },
  { key: 'competitions', label: '竞赛风采', anchor: '#portal-competitions' },
  { key: 'members', label: '成员简介', anchor: '#portal-members' },
];

const loadingHome = ref(false);
const homeData = ref<PortalHomeResponse | null>(null);

const carouselItems = computed(() => homeData.value?.carousel ?? []);
const latestNews = computed(() => homeData.value?.news ?? []);
const importantNotices = computed(() => homeData.value?.notices ?? []);
const achievementShowcase = computed(() => homeData.value?.achievements ?? []);
const competitionShowcase = computed(() => homeData.value?.competitions ?? []);
const memberShowcase = computed(() => homeData.value?.members ?? []);

const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<Awaited<ReturnType<typeof fetchPortalContentDetail>>['data'] | null>(null);

const canScrollSmoothly = computed(
  () => typeof window !== 'undefined' && 'scrollBehavior' in document.documentElement.style,
);

function goLogin() {
  router.push('/login');
}

function goRegister() {
  router.push('/register');
}

function formatDate(value: string) {
  return value ? value.slice(0, 10) : '';
}

async function goTo(to: string) {
  if (to.startsWith('#')) {
    await nextTick();
    const el = document.querySelector(to);
    el?.scrollIntoView({ behavior: canScrollSmoothly.value ? 'smooth' : 'auto', block: 'start' });
    return;
  }

  if (/^https?:\/\//i.test(to)) {
    window.open(to, '_blank');
    return;
  }

  await router.push(to);
}

async function onSelect(key: string) {
  const item = navItems.find((nav) => nav.key === key);
  if (!item) return;
  activeNav.value = item.key;
  await goTo(item.anchor);
}

async function openContentDetail(id: string) {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    const response = await fetchPortalContentDetail(id);
    detail.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '内容加载失败');
    detailVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
}

async function loadHome() {
  loadingHome.value = true;
  try {
    const response = await fetchPortalHome();
    homeData.value = response.data;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '首页数据加载失败');
  } finally {
    loadingHome.value = false;
  }
}

onMounted(loadHome);
</script>

<template>
  <div class="portal-page">
    <header class="topbar portal-topbar">
      <div class="portal-topbar__inner">
        <div class="portal-topbar__brand">
          <p class="topbar__eyebrow">智能制造工作坊</p>
          <h1 class="topbar__title">门户首页</h1>
        </div>

        <div class="portal-topbar__actions">
          <el-button type="primary" @click="goLogin">登录</el-button>
          <el-button @click="goRegister">注册</el-button>
        </div>
      </div>
    </header>

    <nav class="portal-nav">
      <el-menu :default-active="activeNav" class="portal-nav__menu" mode="horizontal" @select="onSelect">
        <el-menu-item v-for="item in navItems" :key="item.key" :index="item.key">
          {{ item.label }}
        </el-menu-item>
      </el-menu>
    </nav>

    <main v-loading="loadingHome" class="portal-content">
      <section class="portal-hero">
        <el-carousel v-if="carouselItems.length" indicator-position="outside">
          <el-carousel-item v-for="item in carouselItems" :key="item.id">
            <button
              class="portal-carousel-item"
              :class="`portal-carousel-item--${item.themeCode}`"
              type="button"
              @click="item.targetUrl ? goTo(item.targetUrl) : undefined"
            >
              <div class="portal-carousel-item__inner">
                <div class="portal-carousel-item__text">
                  <p class="portal-carousel-item__eyebrow">首页推荐</p>
                  <h2>{{ item.title }}</h2>
                  <p v-if="item.summary" class="portal-carousel-item__summary">{{ item.summary }}</p>
                </div>
                <div class="portal-carousel-item__aside">
                  <div v-if="item.imageUrl" class="portal-carousel-item__media">
                    <img :src="item.imageUrl" alt="" />
                  </div>
                  <div class="portal-carousel-item__cta">
                    <span>进入</span>
                    <el-icon><ArrowRight /></el-icon>
                  </div>
                </div>
              </div>
            </button>
          </el-carousel-item>
        </el-carousel>

        <div v-else class="portal-empty">
          <span class="muted">暂无轮播内容</span>
        </div>
      </section>

      <section class="portal-section portal-section--grid">
        <div class="panel-card portal-panel">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">最新资讯</p>
              <h2>最新资讯</h2>
            </div>
          </div>

          <ul class="portal-list">
            <li v-for="item in latestNews" :key="item.id">
              <button class="portal-list__item" type="button" @click="openContentDetail(item.id)">
                <div class="portal-list__main">
                  <div class="portal-list__title">
                    <span>{{ item.title }}</span>
                  </div>
                  <small class="portal-list__date">{{ formatDate(item.publishedAt) }}</small>
                </div>
                <span class="portal-list__action">查看</span>
              </button>
            </li>
            <li v-if="!latestNews.length" class="portal-list__empty muted">暂无资讯</li>
          </ul>
        </div>

        <div class="panel-card portal-panel">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">重要通知</p>
              <h2>重要通知</h2>
            </div>
          </div>

          <ul class="portal-list">
            <li v-for="item in importantNotices" :key="item.id">
              <button class="portal-list__item" type="button" @click="openContentDetail(item.id)">
                <div class="portal-list__main">
                  <div class="portal-list__title">
                    <span>{{ item.title }}</span>
                  </div>
                  <small class="portal-list__date">{{ formatDate(item.publishedAt) }}</small>
                </div>
                <span class="portal-list__action">查看</span>
              </button>
            </li>
            <li v-if="!importantNotices.length" class="portal-list__empty muted">暂无通知</li>
          </ul>
        </div>
      </section>

      <section id="portal-achievements" class="panel-card portal-section">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">优秀成果展示</p>
            <h2>优秀成果展示</h2>
          </div>
          <el-button link type="primary" @click="goTo('/portal/achievements')">查看全部</el-button>
        </div>

        <div class="portal-showcase">
          <button
            v-for="item in achievementShowcase"
            :key="item.id"
            class="portal-showcase__card"
            type="button"
            @click="openContentDetail(item.id)"
          >
            <div v-if="item.coverUrl" class="portal-showcase__cover">
              <img :src="item.coverUrl" alt="" />
            </div>
            <strong>{{ item.title }}</strong>
            <p v-if="item.summary">{{ item.summary }}</p>
          </button>
          <p v-if="!achievementShowcase.length" class="muted">暂无内容</p>
        </div>
      </section>

      <section id="portal-competitions" class="panel-card portal-section">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">竞赛风采</p>
            <h2>竞赛风采</h2>
          </div>
          <el-button link type="primary" @click="goTo('/portal/competitions')">查看全部</el-button>
        </div>

        <div class="portal-showcase">
          <button
            v-for="item in competitionShowcase"
            :key="item.id"
            class="portal-showcase__card"
            type="button"
            @click="openContentDetail(item.id)"
          >
            <div v-if="item.coverUrl" class="portal-showcase__cover">
              <img :src="item.coverUrl" alt="" />
            </div>
            <strong>{{ item.title }}</strong>
            <p v-if="item.summary">{{ item.summary }}</p>
          </button>
          <p v-if="!competitionShowcase.length" class="muted">暂无内容</p>
        </div>
      </section>

      <section id="portal-members" class="panel-card portal-section">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">成员简介</p>
            <h2>成员简介</h2>
          </div>
          <el-button link type="primary" @click="goTo('/portal/members')">查看全部</el-button>
        </div>

        <div class="portal-showcase">
          <button
            v-for="item in memberShowcase"
            :key="item.id"
            class="portal-showcase__card"
            type="button"
            @click="openContentDetail(item.id)"
          >
            <div v-if="item.coverUrl" class="portal-showcase__cover">
              <img :src="item.coverUrl" alt="" />
            </div>
            <strong>{{ item.title }}</strong>
            <p v-if="item.summary">{{ item.summary }}</p>
          </button>
          <p v-if="!memberShowcase.length" class="muted">暂无内容</p>
        </div>
      </section>
    </main>

    <el-dialog v-model="detailVisible" :title="detail?.title || '详情'" width="860px" destroy-on-close>
      <div v-loading="detailLoading" class="detail-body">
        <el-image v-if="detail?.coverUrl" :src="detail.coverUrl" fit="cover" class="detail-cover" />
        <p v-if="detail?.summary" class="detail-summary">{{ detail.summary }}</p>
        <RichTextViewer :content="detail?.body" />
        <el-link v-if="detail?.linkUrl" :href="detail.linkUrl" target="_blank" type="primary">打开跳转链接</el-link>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.portal-page {
  min-height: 100vh;
  overflow-x: hidden;
  background: #f4f7fb;
  --portal-max-width: 1280px;
  --portal-side-padding: clamp(1rem, 2vw, 1.75rem);
  --portal-carousel-height: clamp(240px, 30vw, 380px);
}

.portal-page,
.portal-page * {
  box-sizing: border-box;
}

.portal-topbar {
  display: block;
  padding: 0;
}

.portal-topbar__inner {
  max-width: calc(var(--portal-max-width) + var(--portal-side-padding) * 2);
  margin: 0 auto;
  padding: 1.25rem var(--portal-side-padding);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.portal-topbar__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.portal-nav {
  padding: 0 var(--portal-side-padding);
  border-bottom: 1px solid #d7dee8;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(18px);
}

.portal-nav__menu {
  max-width: var(--portal-max-width);
  margin: 0 auto;
  border-bottom: none;
  background: transparent;
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-gutter: stable;
}

.portal-nav__menu :deep(.el-menu-item) {
  flex: 0 0 auto;
}

.portal-content {
  max-width: calc(var(--portal-max-width) + var(--portal-side-padding) * 2);
  margin: 0 auto;
  padding: 1.5rem var(--portal-side-padding) 2.5rem;
}

.portal-hero {
  margin-bottom: 1.5rem;
}

.portal-hero :deep(.el-carousel__container),
.portal-hero :deep(.el-carousel__item) {
  height: var(--portal-carousel-height);
}

.portal-empty {
  height: var(--portal-carousel-height);
  display: grid;
  place-items: center;
  border: 1px dashed #d7dee8;
  border-radius: 1.2rem;
  background: rgba(255, 255, 255, 0.7);
}

.portal-carousel-item {
  width: 100%;
  height: 100%;
  padding: 0;
  border: 1px solid #d7dee8;
  border-radius: 1.2rem;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 40px rgba(15, 36, 53, 0.08);
  cursor: pointer;
  text-align: left;
}

.portal-carousel-item__inner {
  height: 100%;
  display: grid;
  grid-template-columns: 1fr minmax(180px, 320px);
  gap: 1.5rem;
  align-items: end;
  padding: 2rem;
  border-radius: 1.2rem;
  color: #0d2235;
}

.portal-carousel-item--blue .portal-carousel-item__inner {
  background:
    radial-gradient(circle at top right, rgba(15, 76, 129, 0.22), transparent 42%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.82));
}

.portal-carousel-item--gold .portal-carousel-item__inner {
  background:
    radial-gradient(circle at top right, rgba(198, 127, 25, 0.26), transparent 46%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.82));
}

.portal-carousel-item--teal .portal-carousel-item__inner {
  background:
    radial-gradient(circle at top right, rgba(24, 153, 143, 0.22), transparent 46%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.82));
}

.portal-carousel-item__eyebrow {
  margin: 0 0 0.4rem;
  color: #0f4c81;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
}

.portal-carousel-item__text h2 {
  margin: 0;
  font-size: 2rem;
  line-height: 1.1;
}

.portal-carousel-item__summary {
  margin: 0.75rem 0 0;
  max-width: 42rem;
  color: #334155;
}

.portal-carousel-item__aside {
  display: grid;
  gap: 0.9rem;
  justify-items: end;
}

.portal-carousel-item__media {
  width: 100%;
  height: clamp(120px, 18vw, 200px);
  border-radius: 1rem;
  overflow: hidden;
  border: 1px solid rgba(13, 34, 53, 0.1);
  background: rgba(255, 255, 255, 0.6);
}

.portal-carousel-item__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.portal-carousel-item__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 0.9rem;
  border: 1px solid rgba(13, 34, 53, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  color: #0d2235;
  font-weight: 600;
}

.portal-section {
  padding: 1.5rem;
  margin-top: 1.25rem;
}

.portal-section--grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 0;
}

.portal-panel {
  padding: 1.5rem;
}

.portal-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.65rem;
}

.portal-list__empty {
  padding: 0.75rem 0;
}

.portal-list__item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border: 1px solid #e7edf4;
  border-radius: 0.9rem;
  background: #f8fbfd;
  cursor: pointer;
  text-align: left;
}

.portal-list__main {
  min-width: 0;
  display: grid;
  gap: 0.3rem;
}

.portal-list__title {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  min-width: 0;
}

.portal-list__title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.portal-list__date {
  color: #64748b;
}

.portal-list__action {
  color: #0f4c81;
  font-weight: 600;
  white-space: nowrap;
}

.portal-showcase {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.portal-showcase__card {
  display: grid;
  gap: 0.35rem;
  padding: 1.25rem;
  border: 1px solid #d7dee8;
  border-radius: 1.1rem;
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.portal-showcase__card p {
  margin: 0;
  color: #334155;
}

.portal-showcase__cover {
  width: 100%;
  height: 140px;
  border-radius: 0.9rem;
  overflow: hidden;
  border: 1px solid #e7edf4;
  background: #f8fbfd;
  margin-bottom: 0.35rem;
}

.portal-showcase__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.detail-body {
  display: grid;
  gap: 0.75rem;
}

.detail-cover {
  width: 100%;
  height: 240px;
  border-radius: 12px;
  border: 1px solid #e7edf4;
}

.detail-summary {
  margin: 0;
  color: #334155;
}

.detail-text {
  margin: 0;
  padding: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f8fbfd;
  border: 1px solid #e7edf4;
  border-radius: 12px;
  font-family: inherit;
  color: #0d2235;
}

.muted {
  color: #64748b;
}

@media (max-width: 900px) {
  .portal-section--grid {
    grid-template-columns: 1fr;
  }

  .portal-carousel-item__text h2 {
    font-size: 1.6rem;
  }
}

@media (max-width: 720px) {
  .portal-carousel-item__inner {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 1rem;
    padding: 1.25rem;
  }

  .portal-carousel-item__aside {
    justify-items: start;
  }
}

@media (max-width: 640px) {
  .portal-topbar__actions {
    width: 100%;
  }

  .portal-topbar__actions :deep(.el-button) {
    flex: 1 1 auto;
    min-width: 8.5rem;
  }

  .portal-list__item {
    flex-direction: column;
    align-items: flex-start;
  }

  .portal-list__title {
    align-items: flex-start;
  }

  .portal-list__title span {
    white-space: normal;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .portal-list__action {
    align-self: flex-end;
  }
}
</style>

