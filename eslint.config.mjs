import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import vueParser from 'vue-eslint-parser';
import prettier from 'eslint-config-prettier';

const tsFiles = ['**/*.{ts,tsx,mts,cts}'];
const vueFiles = ['**/*.vue'];
const jsFiles = ['**/*.{js,mjs,cjs}'];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/public/**',
      'apps/web/e2e/**',
      'apps/web/playwright.config.ts',
      'eslint.config.mjs',
      'apps/api/jest.config.ts',
      'packages/shared/test/**',
      'prisma/seed.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: config.files ?? tsFiles,
  })),
  ...pluginVue.configs['flat/recommended'],
  {
    files: jsFiles,
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: tsFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        allowDefaultProject: [
          'apps/api/jest.config.ts',
          'apps/web/e2e/**/*.ts',
          'apps/web/playwright.config.ts',
          'packages/shared/test/**/*.ts',
          'prisma/*.ts',
        ],
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: vueFiles,
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        extraFileExtensions: ['.vue'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  {
    files: ['apps/web/**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
      },
    },
  },
  prettier,
);
