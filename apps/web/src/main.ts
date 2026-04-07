import 'element-plus/dist/index.css';
import './styles/index.css';

import ElementPlus from 'element-plus';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import { vPermission } from './directives/permission';
import { router } from './router';
import { useAuthStore } from './stores/auth';

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();

  app.use(pinia);

  const authStore = useAuthStore();
  await authStore.initialize();

  app.directive('permission', vPermission);
  app.use(router);
  app.use(ElementPlus);
  app.mount('#app');
}

void bootstrap();
