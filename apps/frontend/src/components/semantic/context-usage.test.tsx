import { createRef } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  CONTEXT_USAGE_CELLS,
  CONTEXT_USAGE_CELLS_COMPACT,
  ContextUsage,
  allocateContextSegments,
  contextUsageLevel,
  type ContextSegment,
} from "./context-usage"

/** 极简分区构造（label 用中文以贴近真实消费） */
function seg(key: string, label: string, tokens: number): ContextSegment {
  return { key, label, tokens }
}

describe("ContextUsage 格场分配（allocateContextSegments）", () => {
  it("每格 = limit/格数，按占比取整分配，余量落 free", () => {
    const result = allocateContextSegments(
      [seg("system", "系统提示", 200), seg("history", "对话历史", 1400)],
      2400,
      CONTEXT_USAGE_CELLS,
    )
    expect(result).not.toBeNull()
    // 200 / 100 = 2 格；1400 / 100 = 14 格；free = 24 - 16 = 8
    expect(result!.filled.map((s) => s.cells)).toEqual([2, 14])
    expect(result!.freeCells).toBe(8)
    expect(result!.usedTokens).toBe(1600)
    expect(result!.freeTokens).toBe(800)
  })

  it("取整溢出从尾部回收：总格数以 round(占用比×格数) 封顶，误差只落 free", () => {
    // 病态上偏：8 段各 150 token（每段 1.5 格，四舍五入各 2 格 → 无封顶会画出 16 格）
    const segments = Array.from({ length: 8 }, (_, i) => seg(`s${i}`, `段${i}`, 150))
    const result = allocateContextSegments(segments, 2400, CONTEXT_USAGE_CELLS)!
    // 真实占用 1200/2400 = 50% → 封顶 12 格，第 8 段被回收为 0 格（token 仍计入 usedTokens）
    expect(result.filled.reduce((acc, s) => acc + s.cells, 0)).toBeLessThanOrEqual(12)
    expect(result.usedTokens).toBe(1200)
  })

  it("limit 非有限数或 ≤0 返回 null（无诚实结论可下）", () => {
    expect(allocateContextSegments([seg("a", "A", 100)], 0, 24)).toBeNull()
    expect(allocateContextSegments([seg("a", "A", 100)], Number.NaN, 24)).toBeNull()
    expect(allocateContextSegments([seg("a", "A", 100)], 2400, 0)).toBeNull()
  })
})

describe("ContextUsage 阈值语义色（五档边界）", () => {
  it("contextUsageLevel：<70 中性 / 70-90（含端点）warning / >90 danger", () => {
    expect(contextUsageLevel(0)).toBe("neutral")
    expect(contextUsageLevel(0.69)).toBe("neutral")
    expect(contextUsageLevel(0.7)).toBe("warning")
    expect(contextUsageLevel(0.9)).toBe("warning")
    expect(contextUsageLevel(0.91)).toBe("danger")
    expect(contextUsageLevel(1)).toBe("danger")
  })

  it("渲染态：占用 87.5% → warning 档落在 data-usage-level 与汇总行", () => {
    const { container } = render(
      <ContextUsage
        limit={2400}
        segments={[seg("system", "系统提示", 200), seg("history", "对话历史", 1900)]}
      />,
    )
    const root = container.querySelector('[data-slot="context-usage"]')
    expect(root?.getAttribute("data-usage-level")).toBe("warning")
  })
})

describe("ContextUsage 渲染与交互", () => {
  const segments = [
    seg("system", "系统提示", 200),
    seg("tools", "工具定义", 500),
    seg("history", "对话历史", 1400),
  ]

  it("格数固定：总 data-cell 数 = 24，各分区格数按占比分配", () => {
    const { container } = render(<ContextUsage limit={2400} segments={segments} />)
    expect(container.querySelectorAll("[data-cell]").length).toBe(CONTEXT_USAGE_CELLS)
    expect(container.querySelector('[data-segment-key="system"]')?.getAttribute("data-cells")).toBe("2")
    expect(container.querySelector('[data-segment-key="tools"]')?.getAttribute("data-cells")).toBe("5")
    expect(container.querySelector('[data-segment-key="history"]')?.getAttribute("data-cells")).toBe("14")
  })

  it("free 虚框：尾部剩余格渲染 free 组（data-free），并有独立 tooltip 标题", () => {
    const { container } = render(<ContextUsage limit={2400} segments={segments} />)
    const freeGroup = container.querySelector('[data-segment-key="free"]')
    expect(freeGroup?.getAttribute("data-cells")).toBe("3")
    expect(container.querySelectorAll("[data-free]").length).toBe(3)
    expect(screen.getByTitle(/剩余空间/)).toBeTruthy()
  })

  it("结论式 aria（§17.6）：role=img + 概括结论点名占最多的分区 + 每分区 title", () => {
    render(<ContextUsage limit={2400} segments={segments} />)
    const img = screen.getByRole("img")
    expect(img.getAttribute("aria-label")).toContain("87.5%")
    expect(img.getAttribute("aria-label")).toContain("对话历史占最多")
    expect(screen.getByTitle(/系统提示 200 tokens/)).toBeTruthy()
  })

  it("悬停点亮：enter 某分区该段 data-active、其余 data-dimmed；leave 复位", () => {
    const { container } = render(<ContextUsage limit={2400} segments={segments} />)
    const system = container.querySelector('[data-segment-key="system"]')!
    const history = container.querySelector('[data-segment-key="history"]')!
    expect(system.getAttribute("data-active")).toBeNull()
    fireEvent.mouseEnter(system)
    expect(system.getAttribute("data-active")).toBe("true")
    expect(history.getAttribute("data-dimmed")).toBe("true")
    fireEvent.mouseLeave(system)
    expect(system.getAttribute("data-active")).toBeNull()
    expect(history.getAttribute("data-dimmed")).toBeNull()
  })

  it("compact 档：格数减半为 12", () => {
    const { container } = render(<ContextUsage limit={2400} segments={segments} compact />)
    expect(container.querySelectorAll("[data-cell]").length).toBe(CONTEXT_USAGE_CELLS_COMPACT)
    // 紧凑档隐藏汇总行（结论由 aria 与 tooltip 承载）
    expect(container.querySelector('[data-slot="context-usage-summary"]')).toBeNull()
  })

  it("onSegmentClick：分区升级为 button（§8.5 第 7 条），容器 role=group，点击回调带 key", () => {
    const onSegmentClick = vi.fn()
    const { container } = render(
      <ContextUsage limit={2400} segments={segments} onSegmentClick={onSegmentClick} />,
    )
    expect(screen.getByRole("group").getAttribute("aria-label")).toContain("对话历史占最多")
    const button = screen.getByRole("button", { name: /对话历史/ })
    fireEvent.click(button)
    expect(onSegmentClick).toHaveBeenCalledWith("history")
    // 交互态不再有 role=img（img 内禁交互子元素）
    expect(container.querySelector('[role="img"]')).toBeNull()
  })

  it("ref 与 …props 透传到根（§10.7）", () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = render(
      <ContextUsage limit={2400} segments={segments} ref={ref} data-x="probe" />,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current).toBe(container.querySelector('[data-slot="context-usage"]'))
    expect(ref.current?.getAttribute("data-x")).toBe("probe")
  })
})

describe("ContextUsage 防御归一（诚实渲染）", () => {
  it("负数 / NaN / Infinity token 一律按 0 计：整场空闲，不诈减", () => {
    const { container } = render(
      <ContextUsage
        limit={2400}
        segments={[
          seg("system", "系统提示", -50),
          seg("tools", "工具定义", Number.NaN),
          seg("history", "对话历史", Number.POSITIVE_INFINITY),
        ]}
      />,
    )
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("上下文全部空闲")
    expect(container.querySelectorAll("[data-free]").length).toBe(CONTEXT_USAGE_CELLS)
  })

  it("分区总和超过 limit：等比收缩渲染到恰好 100%，不溢出、保留相对占比", () => {
    const { container } = render(
      <ContextUsage
        limit={2000}
        segments={[seg("tools", "工具定义", 1500), seg("history", "对话历史", 1500)]}
      />,
    )
    // 收缩后各 1000/2000 = 50% → 各 12 格，free 0，danger 档
    expect(container.querySelectorAll("[data-cell]").length).toBe(24)
    expect(container.querySelector('[data-segment-key="tools"]')?.getAttribute("data-cells")).toBe("12")
    expect(container.querySelector('[data-segment-key="history"]')?.getAttribute("data-cells")).toBe("12")
    expect(container.querySelector('[data-segment-key="free"]')).toBeNull()
    expect(container.querySelector('[data-slot="context-usage"]')?.getAttribute("data-usage-level")).toBe(
      "danger",
    )
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("已满")
    // 汇总行标记已超限
    expect(container.querySelector('[data-slot="context-usage-summary"]')?.textContent).toContain("已超限")
  })

  it("limit 非法：整件不渲染（不留半截格场）", () => {
    const { container } = render(<ContextUsage limit={0} segments={[seg("a", "A", 100)]} />)
    expect(container.querySelector('[data-slot="context-usage"]')).toBeNull()
  })

  it("key=free 的传入分区被忽略（free 由组件派生，防双重计数）", () => {
    const { container } = render(
      <ContextUsage limit={2400} segments={[seg("free", "剩余空间", 1200)]} />,
    )
    // 1200/2400=50% 但 key=free 被忽略 → 全场空闲 24 格虚框
    expect(container.querySelectorAll("[data-free]").length).toBe(CONTEXT_USAGE_CELLS)
    expect(container.querySelector('[data-segment-key="free"]')?.getAttribute("data-cells")).toBe("24")
  })
})
