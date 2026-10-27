import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DesignSystemPage } from './design-system-page';
import { DesignSystemSectionPage } from './design-system-section-page';
import { COMPONENT_REGISTRY } from '../registry';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {};
};

// jsdom 未实现 scrollIntoView，cmdk 渲染选中项时会调用（Command Palette 演示段为真实原语）
Element.prototype.scrollIntoView = vi.fn();

// jsdom 未实现 matchMedia，Logo（auth-surface 演示段的 MemberCard 内）按主题取色时会调用；
// framer-motion useReducedMotion（高密度卡段）还需要 MediaQueryList 事件 API
window.matchMedia = vi.fn().mockReturnValue({
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {},
});

function renderWithRoutes(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/app/design-system" element={<DesignSystemPage />} />
          <Route path="/app/design-system/section/:sectionId" element={<DesignSystemSectionPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// 2026-10-27 展示层路由化批：7505 行巨型单页拆为「索引卡片页 + 每分区单页路由」。
// 旧「整页渲染全部 demo」的 27s 大用例退役，改为索引快测 + 按分区单页渲染
// （高密度与治理分区单独渲染，保住原有两个关键断言面）。
describe('DesignSystemPage（索引）', () => {
  it('renders group nav and gallery cards without errors', () => {
    const consoleError = vi.spyOn(console, 'error');
    renderWithRoutes('/app/design-system');

    // 侧栏与主区按 SECTION_GROUPS 分组渲染（同文双命中：侧栏组标题 + 主区组标题）
    expect(screen.getAllByText('AI Execution').length).toBe(2);

    // 裁决面置顶卡（侧栏项与置顶卡双命中；人类原话：组件仍然不删除，但要在 design-system 页面标记，看过后再删）
    expect(screen.getAllByText('组件裁决面').length).toBeGreaterThan(0);

    // 卡片网格：分区标签渲染（如高密度卡分区卡）
    expect(screen.getAllByText('AI High-Density Cards [AI]').length).toBeGreaterThan(0);

    const nestedButtonErrors = consoleError.mock.calls.filter((args) =>
      String(args[0]).includes('cannot contain a nested <button>'),
    );
    expect(nestedButtonErrors).toHaveLength(0);
    consoleError.mockRestore();
    // 首个用例承担 kit+gen 巨型模块的首次 transform，放宽超时
  }, 60_000);
});

describe('DesignSystemSectionPage（单页）', () => {
  // 高密度 AI 卡分区：整页最复杂的 demo 簇，原整页测试的核心断言面平移到单页
  it('renders AI High-Density Cards section with the four AI card groups', () => {
    const consoleError = vi.spyOn(console, 'error');
    renderWithRoutes('/app/design-system/section/ai-density-cards');

    expect(screen.getAllByText('AI High-Density Cards [AI]').length).toBeGreaterThan(0);
    // 验证 4 类 AI 专属卡片渲染挂载（① 思考折叠核 ThinkingStream 已随批 9 清退，2026-09-30）
    expect(screen.getByText(/工具与命令执行胶囊 \(AssistantToolCard\)/)).toBeInTheDocument();
    expect(screen.getByText(/多 Agent 协作交接卡 \(AgentHandoffCard\)/)).toBeInTheDocument();
    expect(screen.getByText(/决策证据抽屉卡 \(DecisionCardShell\)/)).toBeInTheDocument();
    expect(screen.getByText(/双轨成本与执行微徽章 \(DualTrackMetricPill\)/)).toBeInTheDocument();

    const nestedButtonErrors = consoleError.mock.calls.filter((args) =>
      String(args[0]).includes('cannot contain a nested <button>'),
    );
    expect(nestedButtonErrors).toHaveLength(0);
    consoleError.mockRestore();
    // 高密度分区含图表与动效，放宽超时
  }, 60_000);

  // 批 4（2026-09-27）「组件裁决面必须真的在 design-system 页面上」断言面平移到单页
  it('renders component review board aligned with registry review entries', () => {
    renderWithRoutes('/app/design-system/section/component-review');

    expect(screen.getByText('组件裁决面 (Component Review Board)')).toBeInTheDocument();
    const reviewEntries = COMPONENT_REGISTRY.filter((e) => e.status === 'review');
    for (const entry of reviewEntries) {
      expect(
        screen.getByText(`${entry.file} · 登记分区 ${entry.section}`),
      ).toBeInTheDocument();
    }
  });

  it('redirects unknown section ids back to the index', () => {
    renderWithRoutes('/app/design-system/section/__nonexistent__');
    expect(screen.getByText('组件画廊')).toBeInTheDocument();
  });
});
