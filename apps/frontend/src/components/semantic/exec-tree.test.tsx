import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { formatCurrency } from '@/lib/format'

import {
  ExecTree,
  type ExecTreeNode,
  type ExecTreeStatus,
} from './exec-tree'

/**
 * ExecTree（semantic 层）组件测试
 *
 * 断言重心（组件规划账本 B1，宪法 §22.1/§22.2/§22.3）：六态视觉、waiting 头部计数徽
 * （§22.1 可计数 + aria-live）、成本全树/分支现算（§22.2 汇总组件现算、折叠不隐账）、
 * 折叠受控/非受控双模、ARIA tree/treeitem 与键盘 Enter（§8.5）、waiting/failed 的
 * onResolve 处置回调、重试=新子节点且失败者保留（§22.3）、单根退化态。
 * 计时统一注入 now（受控时钟，不测真实 interval）。
 */

const NOW = 1_700_000_000_000;

function node(partial: Partial<ExecTreeNode> & { id: string; name: string; status: ExecTreeStatus }): ExecTreeNode {
  return {
    task: `${partial.name} 的任务一句话`,
    ...partial,
  }
}

/** 七节点全态树：root(running) / researcher(done) / scanner(queued) / deployer(stopped) /
 *  writer(failed) + writer-retry(running, 重试新子节点) / reviewer(waiting) */
function buildTree(): ExecTreeNode {
  return node({
    id: 'root',
    name: 'Orchestrator',
    status: 'running',
    model: 'claude-sonnet',
    cost: 0.1,
    tokens: 1000,
    startedAt: NOW - 60_000,
    children: [
      node({
        id: 'researcher',
        name: 'Researcher',
        status: 'done',
        cost: 0.2,
        tokens: 2000,
        startedAt: NOW - 50_000,
        endedAt: NOW - 10_000,
      }),
      node({
        id: 'scanner',
        name: 'Scanner',
        status: 'queued',
      }),
      node({
        id: 'deployer',
        name: 'Deployer',
        status: 'stopped',
      }),
      node({
        id: 'writer',
        name: 'Writer',
        status: 'failed',
        cost: 0.05,
        tokens: 500,
        startedAt: NOW - 30_000,
        endedAt: NOW - 20_000,
        error: 'File not found: src/x.ts',
        children: [
          node({
            id: 'writer-retry',
            name: 'Writer (retry)',
            status: 'running',
            cost: 0.03,
            tokens: 300,
            startedAt: NOW - 5_000,
          }),
        ],
      }),
      node({
        id: 'reviewer',
        name: 'Reviewer',
        status: 'waiting',
        statusLabel: '等待验收批准',
        startedAt: NOW - 90_000,
      }),
    ],
  })
}

function getNodeById(id: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-node-id="${id}"]`)
  if (!el) throw new Error(`node ${id} not found`)
  return el
}

function getCollapseButton(id: string): HTMLButtonElement {
  const row = getNodeById(id)
  const button = row.querySelector<HTMLButtonElement>('button[aria-expanded]')
  if (!button) throw new Error(`collapse button of ${id} not found`)
  return button
}

describe('ExecTree（semantic 层）', () => {
  it('六态渲染：七个节点各归其位，running 呼吸点、waiting 琥珀徽、aria-label 含名+状态', () => {
    render(<ExecTree root={buildTree()} now={NOW} />)

    const expected: Array<[string, ExecTreeStatus]> = [
      ['root', 'running'],
      ['researcher', 'done'],
      ['scanner', 'queued'],
      ['deployer', 'stopped'],
      ['writer', 'failed'],
      ['writer-retry', 'running'],
      ['reviewer', 'waiting'],
    ]
    for (const [id, status] of expected) {
      expect(getNodeById(id).dataset.status).toBe(status)
    }
    // running = 蓝 + 呼吸点（motion-safe:animate-pulse）
    const rootDot = getNodeById('root').querySelector('.motion-safe\\:animate-pulse')
    expect(rootDot).not.toBeNull()
    // done = 绿勾（CheckCircle2 图标而非点）——以 svg 存在近似断言
    expect(getNodeById('researcher').querySelector('svg')).not.toBeNull()
    // waiting 徽：卡上「需要你处理」+ statusLabel 直显
    expect(getNodeById('reviewer').textContent).toContain('需要你处理')
    expect(getNodeById('reviewer').textContent).toContain('等待验收批准')
    // aria-label = 名 + 状态词（§8.5）
    expect(screen.getByRole('treeitem', { name: 'Researcher，已完成' })).toBeTruthy()
    expect(screen.getByRole('treeitem', { name: 'Writer，失败' })).toBeTruthy()
    expect(screen.getByRole('treeitem', { name: 'Reviewer，需要你处理' })).toBeTruthy()
  })

  it('live 计时：running 注入 now 走渐进精度；终态静态差值', () => {
    render(<ExecTree root={buildTree()} now={NOW} />)
    // root: running, startedAt = NOW - 60_000 → 1m 00s（G3 收编 @/lib/format 口径：空格分隔）
    expect(getNodeById('root').textContent).toContain('1m 00s')
    // researcher: done, 50_000 - 10_000 = 40s
    expect(getNodeById('researcher').textContent).toContain('40.0s')
    // scanner: queued 无 startedAt → 不渲染计时
    expect(getNodeById('scanner').textContent).not.toMatch(/\d+m \d\ds/)
  })

  it('头部汇总栏（§22.1/§22.2）：全树现算——总节点/运行中/waiting 计数徽(aria-live)/失败/总成本', () => {
    render(<ExecTree root={buildTree()} now={NOW} />)
    const header = document.querySelector('[data-slot="exec-tree-header"]') as HTMLElement
    expect(header.textContent).toContain('共 7 节点')
    expect(header.textContent).toContain('运行中 2')
    expect(header.textContent).toContain('失败 1')
    expect(header.textContent).toContain(formatCurrency(0.38)) // 0.1+0.2+0.05+0.03
    // waiting 计数徽：琥珀徽 + 计数 + aria-live（§22.1 可计数）
    const live = header.querySelector('[aria-live="polite"]') as HTMLElement
    expect(live.textContent).toContain('需要你处理')
    expect(live.textContent).toContain('1')
  })

  it('成本分支汇总（§22.2）：折叠分支后头部总成本不变（不隐账），父卡显 +N 子执行 · 分支合计', () => {
    render(<ExecTree root={buildTree()} now={NOW} defaultCollapsedIds={['writer']} />)
    // writer-retry 已卸载（折叠即卸载）
    expect(screen.queryByText('Writer (retry)')).toBeNull()
    // 头部总成本仍含折叠分支：0.38（折叠不隐账）
    const header = document.querySelector('[data-slot="exec-tree-header"]') as HTMLElement
    expect(header.textContent).toContain(formatCurrency(0.38))
    // 父卡分支汇总：+1 子执行 · 分支合计 $0.03
    expect(getNodeById('writer').textContent).toContain('+1 子执行')
    expect(getNodeById('writer').textContent).toContain('分支合计')
    expect(getNodeById('writer').textContent).toContain(formatCurrency(0.03))
  })

  it('折叠非受控：defaultCollapsedIds 初值 + 点击切换（卸载/复现子级，回调带新集合）', () => {
    const onCollapsedChange = vi.fn()
    const { rerender } = render(
      <ExecTree
        root={buildTree()}
        now={NOW}
        defaultCollapsedIds={['writer']}
        onCollapsedChange={onCollapsedChange}
      />,
    )
    expect(screen.queryByText('Writer (retry)')).toBeNull()
    fireEvent.click(getCollapseButton('writer'))
    expect(onCollapsedChange).toHaveBeenCalledWith([])
    // 非受控：内部状态已展开
    expect(screen.getByText('Writer (retry)')).toBeTruthy()

    // 再点收起
    fireEvent.click(getCollapseButton('writer'))
    expect(onCollapsedChange).toHaveBeenCalledWith(['writer'])
    expect(screen.queryByText('Writer (retry)')).toBeNull()

    // 折叠钮 aria：aria-expanded + 「展开/折叠 N 个子执行」label（§8.5）
    rerender(
      <ExecTree
        root={buildTree()}
        now={NOW}
        defaultCollapsedIds={['writer']}
        onCollapsedChange={onCollapsedChange}
      />,
    )
    const collapsedButton = getCollapseButton('writer')
    expect(collapsedButton.getAttribute('aria-expanded')).toBe('false')
    expect(collapsedButton.getAttribute('aria-label')).toBe('展开 Writer 的 1 个子执行')
  })

  it('折叠受控：状态归调用方——回调触发但 DOM 不自变', () => {
    const onCollapsedChange = vi.fn()
    const expanded = render(
      <ExecTree
        root={buildTree()}
        now={NOW}
        collapsedIds={[]}
        onCollapsedChange={onCollapsedChange}
      />,
    )
    fireEvent.click(getCollapseButton('writer'))
    expect(onCollapsedChange).toHaveBeenCalledWith(['writer'])
    // 受控态未变：子级仍在
    expect(expanded.container.textContent).toContain('Writer (retry)')
    expanded.unmount()

    const collapsed = render(
      <ExecTree
        root={buildTree()}
        now={NOW}
        collapsedIds={['writer']}
        onCollapsedChange={onCollapsedChange}
      />,
    )
    fireEvent.click(getCollapseButton('writer'))
    expect(onCollapsedChange).toHaveBeenCalledWith([])
    // 受控态未变：子级仍收起
    expect(collapsed.container.textContent).not.toContain('Writer (retry)')
  })

  it('键盘与 ARIA（§8.5）：容器 role=tree；treeitem tabIndex=0；Enter/Space 触发 onSelect；卡内按钮不误触', () => {
    const onSelect = vi.fn()
    const onCollapsedChange = vi.fn()
    render(
      <ExecTree
        root={buildTree()}
        now={NOW}
        onSelect={onSelect}
        onCollapsedChange={onCollapsedChange}
      />,
    )
    expect(screen.getByRole('tree')).toBeTruthy()

    const row = getNodeById('researcher')
    expect(row.getAttribute('tabindex')).toBe('0')
    fireEvent.keyDown(row, { key: 'Enter' })
    fireEvent.keyDown(row, { key: ' ' })
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect.mock.calls[0][0].id).toBe('researcher')

    // 内部按钮的 Enter 归按钮自己：不触发 onSelect，也不触发折叠
    fireEvent.keyDown(getCollapseButton('writer'), { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onCollapsedChange).not.toHaveBeenCalled()
  })

  it('waiting 处置（onResolve）：处理入口展开三键，approve/reject/dismiss 回调带节点', () => {
    const onResolve = vi.fn()
    render(<ExecTree root={buildTree()} now={NOW} onResolve={onResolve} />)
    const row = getNodeById('reviewer')

    // 未展开前无三键
    expect(row.querySelector('[data-action="approve"]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '处理' }))
    expect(row.querySelector('[data-action="approve"]')).not.toBeNull()
    expect(row.querySelector('[data-action="reject"]')).not.toBeNull()
    expect(row.querySelector('[data-action="dismiss"]')).not.toBeNull()

    fireEvent.click(row.querySelector('[data-action="approve"]') as HTMLElement)
    expect(onResolve).toHaveBeenCalledTimes(1)
    expect(onResolve.mock.calls[0][0].id).toBe('reviewer')
    expect(onResolve.mock.calls[0][1]).toBe('approve')
  })

  it('failed 处置（§22.3）：错误详情展开 mono 红字 + 重试回调；未传 onResolve 不渲染处置入口', () => {
    const onResolve = vi.fn()
    const { rerender } = render(
      <ExecTree root={buildTree()} now={NOW} onResolve={onResolve} />,
    )
    fireEvent.click(screen.getByRole('button', { name: '错误详情' }))
    expect(getNodeById('writer').textContent).toContain('File not found: src/x.ts')
    const retry = getNodeById('writer').querySelector('[data-action="retry"]') as HTMLElement
    expect(retry).not.toBeNull()
    fireEvent.click(retry)
    expect(onResolve).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'writer' }),
      'retry',
    )

    // 未传 onResolve：waiting 无处理钮、failed 展开无重试钮（诚实降级，不渲染死按钮）
    rerender(<ExecTree root={buildTree()} now={NOW} />)
    fireEvent.click(screen.getByRole('button', { name: '错误详情' }))
    expect(getNodeById('writer').querySelector('[data-action="retry"]')).toBeNull()
    expect(screen.queryByRole('button', { name: '处理' })).toBeNull()
    // 但 waiting 徽与 statusLabel 仍直显（§22.1 不降级）
    expect(getNodeById('reviewer').textContent).toContain('需要你处理')
  })

  it('重试=新子节点（§22.3）：失败者保留、重试节点并存渲染，各归各态', () => {
    render(<ExecTree root={buildTree()} now={NOW} />)
    // 失败者保留 + 重试新节点并存
    expect(getNodeById('writer').dataset.status).toBe('failed')
    expect(getNodeById('writer-retry').dataset.status).toBe('running')
  })

  it('单根退化态：无子级时无折叠钮、无 group，渲染不破', () => {
    const onSelect = vi.fn()
    render(
      <ExecTree
        root={node({ id: 'solo', name: 'Solo', status: 'done', cost: 0.42 })}
        now={NOW}
        onSelect={onSelect}
      />,
    )
    expect(screen.getByRole('treeitem', { name: 'Solo，已完成' })).toBeTruthy()
    expect(document.querySelector('[role="group"]')).toBeNull()
    expect(document.querySelector('button[aria-expanded]')).toBeNull()
    const header = document.querySelector('[data-slot="exec-tree-header"]') as HTMLElement
    expect(header.textContent).toContain('共 1 节点')
    expect(header.textContent).toContain(formatCurrency(0.42))
    fireEvent.click(getNodeById('solo'))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('多级缩进：孙级嵌套在父 group 内（role=tree/group/treeitem 链路）', () => {
    const tree = node({
      id: 'a',
      name: 'A',
      status: 'running',
      children: [
        node({
          id: 'b',
          name: 'B',
          status: 'running',
          children: [node({ id: 'c', name: 'C', status: 'waiting' })],
        }),
      ],
    })
    render(<ExecTree root={tree} now={NOW} />)
    // a 的 group 直接包着 b；b 的 group 包着 c
    const aGroup = getNodeById('a').querySelector(':scope > [role="group"]')
    expect(aGroup).not.toBeNull()
    expect(aGroup?.querySelector('[data-node-id="b"]')).not.toBeNull()
    const bGroup = getNodeById('b').querySelector(':scope > [role="group"]')
    expect(bGroup?.querySelector('[data-node-id="c"]')).not.toBeNull()
  })
})
