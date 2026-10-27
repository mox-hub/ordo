import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatCompact, formatCurrency } from '@/lib/format'

import { CostFigure } from './cost-figure'

/**
 * CostFigure（semantic 层）组件测试
 *
 * 断言重心（宪法 §22.2 成本一等公民律）：双轨显示与 §14.1 格式化入口接线、
 * 单边缺席、双缺席「—」诚实占位（禁 0）、running 动效类（滚动轨道 + 微光带）、
 * reduced-motion 直出终值、运行中值更新后的可访问读数跟随。
 */

function queryRoot(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>('[data-slot="cost-figure"]')
}

function stubMatchMedia(matches: boolean) {
  const impl = ((query: string) => ({
    media: query,
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })) as unknown as typeof window.matchMedia
  vi.stubGlobal('matchMedia', impl)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CostFigure（semantic 层）', () => {
  it('双轨完整态：金额走 formatCurrency、token 走 formatCompact，并显「·」分隔；根为 font-mono tabular-nums', () => {
    const { container } = render(<CostFigure amount={0.51} tokens={17400} />)
    const root = queryRoot(container)
    expect(root).not.toBeNull()
    expect(root?.className).toContain('font-mono')
    expect(root?.className).toContain('tabular-nums')
    expect(root?.textContent).toContain(formatCurrency(0.51))
    expect(root?.textContent).toContain(formatCompact(17400))
    // 分隔符存在且 aria-hidden（非可访问内容）
    expect(container.querySelector('span[aria-hidden="true"]')?.textContent).toBe('·')
  })

  it('size 三档对齐字阶 §3.1：xs=text-2xs / sm=text-xs（默认）/ md=text-sm', () => {
    const sm = render(<CostFigure amount={1} />)
    expect(queryRoot(sm.container)?.className).toContain('text-xs')
    sm.unmount()

    const xs = render(<CostFigure amount={1} size="xs" />)
    expect(queryRoot(xs.container)?.className).toContain('text-2xs')
    xs.unmount()

    const md = render(<CostFigure amount={1} size="md" />)
    expect(queryRoot(md.container)?.className).toContain('text-sm')
  })

  it('单边态：仅金额时不渲染 token 与分隔符；仅 token 时同理（单边缺席只显示另一边）', () => {
    const onlyAmount = render(<CostFigure amount={1.23} />)
    expect(onlyAmount.container.textContent).toContain(formatCurrency(1.23))
    expect(onlyAmount.container.textContent).not.toContain('·')
    expect(onlyAmount.container.querySelector('[data-slot="cost-figure-empty"]')).toBeNull()
    onlyAmount.unmount()

    const onlyTokens = render(<CostFigure tokens={17400} />)
    expect(onlyTokens.container.textContent).toContain(formatCompact(17400))
    expect(onlyTokens.container.textContent).not.toContain('·')
    expect(onlyTokens.container.querySelector('[data-slot="cost-figure-empty"]')).toBeNull()
  })

  it('缺席占位：双轨均缺席（未传 / null）渲染「—」诚实降级——不渲染 0、不整件消失', () => {
    for (const props of [
      { amount: null, tokens: null },
      {},
    ] as const) {
      const { container, unmount } = render(<CostFigure {...props} />)
      const root = queryRoot(container)
      expect(root?.textContent).toBe('—')
      expect(container.querySelector('[data-slot="cost-figure-empty"]')).not.toBeNull()
      expect(root?.textContent?.includes('0')).toBe(false)
      unmount()
    }
  })

  it('running 动效态：data-running 标记 + 滚动轨道（aria-hidden）+ sr-only 读数 + 微光带', () => {
    const { container } = render(<CostFigure amount={0.5} tokens={1200} running />)
    expect(queryRoot(container)?.getAttribute('data-running')).toBe('true')
    // 滚动轨道存在且对读屏隐藏
    const roll = container.querySelector('[data-slot="cost-figure-roll"]')
    expect(roll).not.toBeNull()
    expect(roll?.getAttribute('aria-hidden')).toBe('true')
    // 可访问读数：sr-only 承载稳定终值
    expect(screen.getByText(formatCurrency(0.5))).toBeTruthy()
    expect(screen.getByText(formatCompact(1200))).toBeTruthy()
    // 微光带挂载
    expect(container.querySelector('[data-slot="cost-figure-shine"]')).not.toBeNull()
  })

  it('reduced-motion：直出终值——不渲染滚动轨道与微光带（motion-safe 红线）', () => {
    stubMatchMedia(true)
    const { container } = render(<CostFigure amount={0.5} tokens={1200} running />)
    expect(container.querySelector('[data-slot="cost-figure-roll"]')).toBeNull()
    expect(container.querySelector('[data-slot="cost-figure-shine"]')).toBeNull()
    // 终值静态直出（无 sr-only 双轨，文本本体可访问）
    expect(container.textContent).toContain(formatCurrency(0.5))
  })

  it('数字滚动值更新：running 中值变化，可访问读数（sr-only）同步为新终值', () => {
    const { rerender, container } = render(<CostFigure amount={0.5} running />)
    expect(screen.getByText(formatCurrency(0.5))).toBeTruthy()
    rerender(<CostFigure amount={0.75} running />)
    expect(screen.getByText(formatCurrency(0.75))).toBeTruthy()
    expect(screen.queryByText(formatCurrency(0.5))).toBeNull()
    // 滚动轨道保持挂载（仍在运行态）
    expect(container.querySelector('[data-slot="cost-figure-roll"]')).not.toBeNull()
  })

  it('终态静默：不传 running 时无任何动效结构（滚动轨道 / 微光带均不渲染）', () => {
    const { container } = render(<CostFigure amount={0.5} tokens={1200} />)
    expect(container.querySelector('[data-slot="cost-figure-roll"]')).toBeNull()
    expect(container.querySelector('[data-slot="cost-figure-shine"]')).toBeNull()
    expect(queryRoot(container)?.getAttribute('data-running')).toBeNull()
  })

  it('脏数据防御：NaN / Infinity 视为无数据（与缺席同口径诚实降级，不产出 NaN 垃圾输出）', () => {
    const { container } = render(
      <CostFigure amount={Number.NaN} tokens={Number.POSITIVE_INFINITY} />,
    )
    expect(container.textContent).toBe('—')
  })
})
