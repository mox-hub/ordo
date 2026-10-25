import { defineConfig } from 'vitest/config';

// 移动端单测：纯逻辑层（session store / api 模块 / 决策拍板映射）。
// 组件测试（RN Testing Library）按测试策略 L3 在后续批次引入。
export default defineConfig({
  esbuild: {
    // expo/tsconfig.base extends 链是 TS 专属解析（tsc 可解、vite tsconfck 不可解）；
    // 单测为纯逻辑层不需要 tsconfig 的 paths/jsx，直接给空编译选项绕开
    tsconfigRaw: '{}',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
