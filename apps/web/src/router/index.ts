import { useAuthStore } from '@web/stores/auth';
import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'auth.login',
      component: () => import('@web/views/LoginPage.vue'),
      meta: {
        title: '假登录页',
      },
    },
    {
      path: '/',
      component: () => import('@web/layouts/AdminLayout.vue'),
      children: [
        {
          path: '',
          name: 'system.dashboard',
          component: () => import('@web/views/DashboardPage.vue'),
          meta: {
            title: '工作台',
            breadcrumb: ['工作台'],
          },
        },
        {
          path: 'system/health',
          name: 'system.health',
          component: () => import('@web/views/HealthCheckPage.vue'),
          meta: {
            title: '系统健康检查',
            breadcrumb: ['系统基线', '系统健康检查'],
          },
        },
        {
          path: 'system/examples',
          name: 'system.examples',
          component: () => import('@web/views/ExampleListPage.vue'),
          meta: {
            title: '示例列表',
            breadcrumb: ['系统基线', '示例列表'],
          },
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.path === '/login') {
    if (authStore.isAuthenticated) {
      return { path: '/' };
    }

    return true;
  }

  if (!authStore.isAuthenticated) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    };
  }

  return true;
});
