import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// 移动端 ESLint 最小集（对标前端 flat config，但不含 Tailwind/CSS 类治理——RN 无 CSS 产物）。
// RN 设计治理脚本（check-tokens 等）按工程接入方案 §五 在后续批次接入。
export default [
  {
    ignores: ['dist', '.expo', 'node_modules', '**/*.gen.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
