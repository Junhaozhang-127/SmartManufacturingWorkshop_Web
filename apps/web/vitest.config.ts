import path from 'node:path';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@web': path.resolve(__dirname, './src'),
      '@smw/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@smw/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
