/**
 * AI 就绪度横幅组件测试（CAP-A-18 三件套 ③，GAP-T-72 测试义务）：
 * 三态渲染 / 硬度分级（unavailable 无暂关、软态可暂关）/ 暂关持久化（sessionStorage，
 * 状态变化重现）/ CTA 深链 /app/settings/ai / 断线不渲染（让位连接横幅）。
 * i18n mock 透传键名（onboarding-wizard.test 同款），断言直接对着键写；
 * eventClient 走仓库测试 mock（vitest alias → src/__mocks__/event-client）。
 */
import { act, render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const readinessMock = vi.hoisted(() => vi.fn());
vi.mock('../hooks/use-ai-readiness', () => ({
  useAiReadiness: () => readinessMock(),
}));

const navigateMock = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

/** 连接事件注册表：横幅订阅 eventClient 三事件，测试里手动触发模拟断线/重连 */
const connectionHandlers = vi.hoisted(() => new Map<string, () => void>());
vi.mock('@/infrastructure/event-client', () => ({
  eventClient: {
    on: vi.fn((event: string, handler: () => void) => {
      connectionHandlers.set(event, handler);
    }),
    off: vi.fn((event: string, handler?: () => void) => {
      if (!handler || connectionHandlers.get(event) === handler) {
        connectionHandlers.delete(event);
      }
    }),
  },
}));

import { AiReadinessBanner } from './ai-readiness-banner';

const setState = (state: string, detail: string | null = null) =>
  readinessMock.mockReturnValue({ state, detail });

/** 触发横幅挂上的连接事件（模拟 socket 断线/重连） */
const fireConnectionEvent = (event: string) => {
  act(() => {
    connectionHandlers.get(event)?.();
  });
};

describe('AiReadinessBanner', () => {
  beforeEach(() => {
    readinessMock.mockReset();
    connectionHandlers.clear();
    sessionStorage.clear();
  });

  it.each(['ready', 'loading', 'unknown'])('%s 态不渲染', (state) => {
    setState(state);
    const { container } = render(<AiReadinessBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('unavailable：硬提醒渲染、无暂关按钮、CTA 为去配置并深链设置 AI 页', () => {
    setState('unavailable');
    render(<AiReadinessBanner />);

    const banner = screen.getByTestId('ai-readiness-banner');
    expect(banner).toHaveAttribute('data-readiness-state', 'unavailable');
    expect(
      screen.getByText('aiHub.readiness.unavailableTitle'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'aiHub.readiness.later' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ai-readiness-cta'));
    expect(navigateMock).toHaveBeenCalledWith('/app/settings/ai');
  });

  it.each(['unconfigured', 'unverified'])('%s：软提醒带暂关按钮', (state) => {
    setState(state);
    render(<AiReadinessBanner />);
    expect(
      screen.getByRole('button', { name: 'aiHub.readiness.later' }),
    ).toBeInTheDocument();
  });

  it('unverified 时 CTA 文案为去检查、详情带后端 errorMessage', () => {
    setState('unverified', 'chat completions 401');
    render(<AiReadinessBanner />);
    expect(screen.getByText('aiHub.readiness.goCheck')).toBeInTheDocument();
    expect(
      screen.getByText(/aiHub\.readiness\.unverifiedDesc（chat completions 401）/),
    ).toBeInTheDocument();
  });

  it('暂关后同态不再渲染；状态变化（暂关记忆不匹配）重现', () => {
    setState('unconfigured');
    const first = render(<AiReadinessBanner />);
    fireEvent.click(
      screen.getByRole('button', { name: 'aiHub.readiness.later' }),
    );
    expect(sessionStorage.getItem('ordo.ai-readiness.dismissed')).toBe(
      'unconfigured',
    );
    first.unmount();

    // 同态：重挂（模拟路由切换）后仍被暂关
    const second = render(<AiReadinessBanner />);
    expect(second.container).toBeEmptyDOMElement();
    second.unmount();

    // 状态变化：暂关记忆不匹配，横幅重现（硬提醒）
    setState('unavailable');
    render(<AiReadinessBanner />);
    expect(screen.getByTestId('ai-readiness-banner')).toHaveAttribute(
      'data-readiness-state',
      'unavailable',
    );
  });

  it('断线（offline）时不渲染——连接横幅优先且防误报；重连恢复', () => {
    setState('unavailable');
    const { container } = render(<AiReadinessBanner />);
    expect(screen.getByTestId('ai-readiness-banner')).toBeInTheDocument();

    fireConnectionEvent('disconnected');
    expect(container).toBeEmptyDOMElement();

    fireConnectionEvent('connected');
    expect(screen.getByTestId('ai-readiness-banner')).toBeInTheDocument();
  });
});
