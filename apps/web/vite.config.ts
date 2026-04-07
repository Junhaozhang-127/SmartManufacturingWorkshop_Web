import path from 'node:path';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@web': path.resolve(__dirname, './src'),
      '@smw/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@smw/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    proxy: {
      '/api': {
        target: process.env.APP_BASE_URL ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
