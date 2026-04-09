<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue';
import { computed, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';

type PortalNavKey = 'achievements' | 'competitions' | 'members';

interface CarouselItem {
  key: string;
  eyebrow: string;
  title: string;
  summary: string;
  to: string;
  theme: 'blue' | 'gold' | 'teal';
}

interface ListItem {
  key: string;
  title: string;
  date: string;
  tag?: string;
  to: string;
}

interface ShowcaseItem {
  key: string;
  title: string;
  desc: string;
  meta: string;
  to: string;
}

const router = useRouter();
const activeNav = ref<PortalNavKey>('achievements');

const navItems: Array<{ key: PortalNavKey; label: string; anchor: string }> = [
  { key: 'achievements', label: '科技成果', anchor: '#portal-achievements' },
  { key: 'competitions', label: '竞赛风采', anchor: '#portal-competitions' },
  { key: 'members', label: '成员简介', anchor: '#portal-members' },
];

const carouselItems: CarouselItem[] = [
  {
    key: 'hot-achievements',
    eyebrow: '热点成果',
    title: '优秀成果展示入口',
    summary: '集中查看工坊优秀成果、获奖项目与落地案例。',
    to: '/achievements',
    theme: 'blue',
  },
  {
    key: 'hot-competitions',
    eyebrow: '竞赛风采',
    title: '竞赛库与报名入口',
    summary: '查看近期竞赛、报名要求与进度归档。',
    to: '/competitions/library',
    theme: 'gold',
  },
  {
    key: 'hot-members',
    eyebrow: '组织成员',
    title: '成员档案与培养路线',
    summary: '了解成员档案与成长路径，快速定位团队能力。',
    to: '/members/archive',
    theme: 'teal',
  },
];

const latestNews: ListItem[] = [
  {
    key: 'news-1',
    title: '工坊本周热点：成果与竞赛同步推进',
    date: '2026-04-09',
    tag: '资讯',
    to: '/notifications',
  },
  {
    key: 'news-2',
    title: '竞赛库更新：新增报名事项与材料清单',
    date: '2026-04-08',
    tag: '竞赛',
    to: '/competitions/library',
  },
  {
    key: 'news-3',
    title: '成果展示：优秀项目案例整理完成',
    date: '2026-04-07',
    tag: '成果',
    to: '/achievements',
  },
];

const importantNotices: ListItem[] = [
  {
    key: 'notice-1',
    title: '重要通知：本周评审资料提交截止提醒',
    date: '2026-04-09',
    tag: '重要',
    to: '/notifications',
  },
  {
    key: 'notice-2',
    title: '系统公告：账号首次登录请尽快修改密码',
    date: '2026-04-06',
    tag: '公告',
    to: '/login',
  },
  {
    key: 'notice-3',
    title: '提醒：成员档案信息请保持及时更新',
    date: '2026-04-05',
    tag: '提醒',
    to: '/members/archive',
  },
];

const achievementShowcase: ShowcaseItem[] = [
  {
    key: 'show-1',
    title: '智能排产优化',
    desc: '面向多工序场景的排产策略与可视化看板。',
    meta: '项目成果 · 可复用方案',
    to: '/achievements',
  },
  {
    key: 'show-2',
    title: '设备点检与报修闭环',
    desc: '从报修到工单处理的流程化与数据沉淀。',
    meta: '落地案例 · 现场可用',
    to: '/devices/repairs',
  },
  {
    key: 'show-3',
    title: '竞赛项目归档模板',
    desc: '统一文档结构与提交清单，提升复盘效率。',
    meta: '竞赛实践 · 过程沉淀',
    to: '/competitions/library',
  },
  {
    key: 'show-4',
    title: '成员培养路线',
    desc: '以岗位能力为导向的成长路径与评估参考。',
    meta: '团队建设 · 可持续',
    to: '/members/archive',
  },
];

const canScrollSmoothly = computed(() => typeof window !== 'undefined' && 'scrollBehavior' in document.documentElement.style);

function goLogin() {
  router.push('/login');
}

function goRegister() {
  router.push('/register');
}

async function goTo(to: string) {
  if (to.startsWith('#')) {
    await nextTick();
    const el = document.querySelector(to);
    el?.scrollIntoView({ behavior: canScrollSmoothly.value ? 'smooth' : 'auto', block: 'start' });
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

function itemActionLabel(item: ListItem) {
  return item.tag ? `查看${item.tag}` : '查看';
}
</script>

<template>
  <div class="portal-page">
    <header class="topbar portal-topbar">
      <div class="portal-topbar__brand">
        <p class="topbar__eyebrow">智能制造工坊</p>
        <h1 class="topbar__title">门户首页</h1>
      </div>

      <div class="portal-topbar__actions">
        <el-button type="primary" @click="goLogin">登录</el-button>
        <el-button @click="goRegister">注册</el-button>
      </div>
    </header>

    <nav class="portal-nav">
      <el-menu :default-active="activeNav" class="portal-nav__menu" mode="horizontal" @select="onSelect">
        <el-menu-item v-for="item in navItems" :key="item.key" :index="item.key">
          {{ item.label }}
        </el-menu-item>
      </el-menu>
    </nav>

    <main class="portal-content">
      <section class="portal-hero">
        <el-carousel height="360px" indicator-position="outside">
          <el-carousel-item v-for="item in carouselItems" :key="item.key">
            <button class="portal-carousel-item" :class="`portal-carousel-item--${item.theme}`" type="button" @click="goTo(item.to)">
              <div class="portal-carousel-item__inner">
                <div class="portal-carousel-item__text">
                  <p class="portal-carousel-item__eyebrow">{{ item.eyebrow }}</p>
                  <h2>{{ item.title }}</h2>
                  <p class="portal-carousel-item__summary">{{ item.summary }}</p>
                </div>
                <div class="portal-carousel-item__cta">
                  <span>进入</span>
                  <el-icon><ArrowRight /></el-icon>
                </div>
              </div>
            </button>
          </el-carousel-item>
        </el-carousel>
      </section>

      <section class="portal-section portal-section--grid">
        <div class="panel-card portal-panel">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">最新资讯</p>
              <h2>最新资讯</h2>
            </div>
            <el-button link type="primary" @click="goTo('/notifications')">更多</el-button>
          </div>

          <ul class="portal-list">
            <li v-for="item in latestNews" :key="item.key">
              <button class="portal-list__item" type="button" @click="goTo(item.to)">
                <div class="portal-list__main">
                  <div class="portal-list__title">
                    <el-tag v-if="item.tag" class="portal-list__tag" size="small" type="info">{{ item.tag }}</el-tag>
                    <span>{{ item.title }}</span>
                  </div>
                  <small class="portal-list__date">{{ item.date }}</small>
                </div>
                <span class="portal-list__action">{{ itemActionLabel(item) }}</span>
              </button>
            </li>
          </ul>
        </div>

        <div class="panel-card portal-panel">
          <div class="panel-card__header">
            <div>
              <p class="panel-card__eyebrow">重要通知</p>
              <h2>重要通知</h2>
            </div>
            <el-button link type="primary" @click="goTo('/notifications')">更多</el-button>
          </div>

          <ul class="portal-list">
            <li v-for="item in importantNotices" :key="item.key">
              <button class="portal-list__item" type="button" @click="goTo(item.to)">
                <div class="portal-list__main">
                  <div class="portal-list__title">
                    <el-tag v-if="item.tag" class="portal-list__tag" size="small" type="warning">{{ item.tag }}</el-tag>
                    <span>{{ item.title }}</span>
                  </div>
                  <small class="portal-list__date">{{ item.date }}</small>
                </div>
                <span class="portal-list__action">{{ itemActionLabel(item) }}</span>
              </button>
            </li>
          </ul>
        </div>
      </section>

      <section id="portal-achievements" class="panel-card portal-section">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">科技成果</p>
            <h2>优秀成果展示</h2>
          </div>
          <el-button link type="primary" @click="goTo('/achievements')">查看全部</el-button>
        </div>

        <div class="portal-showcase">
          <button
            v-for="item in achievementShowcase"
            :key="item.key"
            class="portal-showcase__card"
            type="button"
            @click="goTo(item.to)"
          >
            <strong>{{ item.title }}</strong>
            <p>{{ item.desc }}</p>
            <small>{{ item.meta }}</small>
          </button>
        </div>
      </section>

      <section id="portal-competitions" class="panel-card portal-section">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">竞赛风采</p>
            <h2>竞赛风采</h2>
          </div>
          <el-button link type="primary" @click="goTo('/competitions/library')">进入竞赛库</el-button>
        </div>
        <div class="portal-kv">
          <p>聚焦竞赛过程沉淀与成果展示，支持快速进入竞赛库查看报名与归档。</p>
          <el-button type="primary" plain @click="goTo('/competitions/library')">查看竞赛入口</el-button>
        </div>
      </section>

      <section id="portal-members" class="panel-card portal-section">
        <div class="panel-card__header">
          <div>
            <p class="panel-card__eyebrow">成员简介</p>
            <h2>成员简介</h2>
          </div>
          <el-button link type="primary" @click="goTo('/members/archive')">进入成员档案</el-button>
        </div>

        <div class="portal-members">
          <div class="portal-members__item">
            <strong>负责人</strong>
            <p>负责方向规划、成果评审与资源协调。</p>
          </div>
          <div class="portal-members__item">
            <strong>组长</strong>
            <p>负责项目推进、竞赛组织与过程管理。</p>
          </div>
          <div class="portal-members__item">
            <strong>成员</strong>
            <p>参与项目实施、竞赛准备与资料沉淀。</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.portal-page {
  min-height: 100vh;
}

.portal-topbar__brand h1 {
  margin: 0;
  font-size: 1.2rem;
}

.portal-topbar__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.portal-nav {
  padding: 0 2rem;
  border-bottom: 1px solid #d7dee8;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(18px);
}

.portal-nav__menu {
  max-width: 1120px;
  margin: 0 auto;
  border-bottom: none;
  background: transparent;
}

.portal-content {
  max-width: 1120px;
  margin: 0 auto;
  padding: 1.5rem 2rem 2.5rem;
}

.portal-hero {
  margin-bottom: 1.5rem;
}

.portal-carousel-item {
  width: 100%;
  height: 360px;
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
  grid-template-columns: 1fr auto;
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
  max-width: 38rem;
  color: #334155;
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

.portal-showcase__card small {
  color: #64748b;
}

.portal-kv {
  display: grid;
  gap: 0.9rem;
  padding: 1rem 0.25rem 0;
  color: #334155;
}

.portal-members {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  padding-top: 0.5rem;
}

.portal-members__item {
  padding: 1.25rem;
  border: 1px solid #d7dee8;
  border-radius: 1.1rem;
  background: #fff;
}

.portal-members__item p {
  margin: 0.5rem 0 0;
  color: #64748b;
}

@media (max-width: 900px) {
  .portal-nav {
    padding: 0 1rem;
  }

  .portal-content {
    padding: 1.25rem 1rem 2rem;
  }

  .portal-section--grid {
    grid-template-columns: 1fr;
  }

  .portal-carousel-item__text h2 {
    font-size: 1.6rem;
  }
}
</style>

