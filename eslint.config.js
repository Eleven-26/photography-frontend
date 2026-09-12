// ESLint 9 扁平配置 —— lint 底线：只拦真实问题，不做风格强制
//
// 目标：把「未使用变量 / 未定义标识符 / debugger 残留 / Vue 基础反模式」这类会造成
// 运行期问题或调试残留的代码拦在提交前。**不启用格式类规则**（不引入 Prettier），
// 避免对既有 13 个页面一次性产生数千行无意义 diff；需要时再单独引入并一次性格式化。
//
// 用法：npm run lint（只报不改） / npm run lint:fix（自动修可修项） / npm run verify（typecheck + lint）
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default tseslint.config(
  // 忽略产物与依赖
  { ignores: ['dist/**', 'node_modules/**', 'public/**', '**/*.d.ts'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  // 只取 Vue 3 essential（基础正确性规则）；不用 recommended，避免风格规则淹没真实问题
  ...pluginVue.configs['flat/essential'],

  {
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // 未使用变量已由 vue-tsc 的 noUnusedLocals/noUnusedParameters 严格把关，这里降为告警
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      // any 允许出现但需显式知晓
      '@typescript-eslint/no-explicit-any': 'warn',
      // 运行期风险 / 调试残留：直接报错
      'no-debugger': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // 本项目的页面组件按页面命名（如 Dashboard.vue），不强制多词
      'vue/multi-word-component-names': 'off',
    },
  },

  // .vue 文件：<script lang="ts"> 交给 TS 解析器处理
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] },
    },
  },

  // 配置与脚本文件按 Node 环境处理
  {
    files: ['*.{js,ts}', 'vite.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
)
