import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  InlineDiff,
  diffTextSegments,
  initialDecisions,
  synthesizeAppliedText,
  tokenize,
  type DiffDecision,
  type DiffSegment,
} from './inline-diff'

/**
 * InlineDiff（semantic 层）组件测试
 *
 * 断言重心（宪法 §22.6 diff 优先律）：零依赖词级 diff 纯函数（增/删/改/不动/空串/中英混排）、
 * 逐段裁决切换（默认全部=接受）、appliedText 合成正确性（全接受=改后文 / 全拒绝=原文 / 混合）、
 * 键盘导航（j/k + Enter + a）、a11y 标签（group 名 + 裁决态 aria + del/ins 附加通道）、
 * props 变化整体重置、...props 透传与 ref 到根（§10.7）。
 */

const BEFORE = 'alpha beta gamma'
const AFTER = 'alpha BETA gamma delta'

function getToggle(name: string | RegExp) {
  return screen.getByRole('button', { name })
}

describe('InlineDiff 纯函数（词级 diff）', () => {
  it('tokenize：拉丁词整词、CJK 逐字、标点逐字、空白成串', () => {
    expect(tokenize('hello world')).toEqual(['hello', ' ', 'world'])
    expect(tokenize('你好，世界！')).toEqual(['你', '好', '，', '世', '界', '！'])
    expect(tokenize('a\nb')).toEqual(['a', '\n', 'b'])
    expect(tokenize('')).toEqual([])
  })

  it('纯新增：diffTextSegments 产出 unchanged + changed(removed 空)，合成接受=改后 / 拒绝=原文', () => {
    const segments = diffTextSegments('hello', 'hello world')
    const changed = segments.filter((s) => s.type === 'changed')
    expect(segments.some((s) => s.type === 'unchanged' && s.text === 'hello')).toBe(true)
    expect(changed).toHaveLength(1)
    expect(changed[0]?.removed).toBe('')
    expect(changed[0]?.added).toBe(' world')
    expect(changed[0]?.ordinal).toBe(1)
    expect(synthesizeAppliedText(segments, initialDecisions(segments))).toBe('hello world')
    expect(
      synthesizeAppliedText(
        segments,
        segments.map((s) => ({ index: s.index, type: s.type, accepted: false })),
      ),
    ).toBe('hello')
  })

  it('纯删除：changed(added 空) 接受=删净 / 拒绝=保留原文', () => {
    const segments = diffTextSegments('hello world', 'hello')
    const changed = segments.filter((s) => s.type === 'changed')
    expect(changed).toHaveLength(1)
    expect(changed[0]?.removed).toBe(' world')
    expect(changed[0]?.added).toBe('')
    expect(synthesizeAppliedText(segments, initialDecisions(segments))).toBe('hello')
    expect(
      synthesizeAppliedText(
        segments,
        segments.map((s) => ({ index: s.index, type: s.type, accepted: false })),
      ),
    ).toBe('hello world')
  })

  it('修改：中间词替换产出单变更段，接受=新词 / 拒绝=旧词', () => {
    const segments = diffTextSegments('foo bar', 'foo baz')
    const changed = segments.filter((s) => s.type === 'changed')
    expect(changed).toHaveLength(1)
    expect(changed[0]?.removed).toBe('bar')
    expect(changed[0]?.added).toBe('baz')
    expect(synthesizeAppliedText(segments, initialDecisions(segments))).toBe('foo baz')
  })

  it('不动：两版一致只有 unchanged 段，无变更段、无序数', () => {
    const segments = diffTextSegments('same text', 'same text')
    expect(segments).toHaveLength(1)
    expect(segments[0]?.type).toBe('unchanged')
    expect(segments[0]?.text).toBe('same text')
    expect(segments[0]?.ordinal).toBe(0)
  })

  it('空串：空↔空无段；空→有文为纯新增；有文→空为纯删除', () => {
    expect(diffTextSegments('', '')).toEqual([])
    const inserted = diffTextSegments('', 'new')
    expect(inserted).toHaveLength(1)
    expect(inserted[0]?.type).toBe('changed')
    expect(inserted[0]?.removed).toBe('')
    expect(inserted[0]?.added).toBe('new')
    const removedAll = diffTextSegments('old', '')
    expect(removedAll).toHaveLength(1)
    expect(removedAll[0]?.removed).toBe('old')
    expect(removedAll[0]?.added).toBe('')
  })

  it('中英混排：CJK 逐字对齐，插入拉丁词产出精确增量段', () => {
    const segments = diffTextSegments('你好世界', '你好Ordo世界')
    const changed = segments.filter((s) => s.type === 'changed')
    expect(changed).toHaveLength(1)
    expect(changed[0]?.removed).toBe('')
    expect(changed[0]?.added).toBe('Ordo')
    expect(synthesizeAppliedText(segments, initialDecisions(segments))).toBe('你好Ordo世界')
  })

  it('多变更段：混合裁决的合成只替换被接受段（appliedText 口径核心用例）', () => {
    const segments = diffTextSegments(BEFORE, AFTER)
    const changed = segments.filter((s) => s.type === 'changed')
    expect(changed).toHaveLength(2)
    // 全接受 = 改后全文
    expect(synthesizeAppliedText(segments, initialDecisions(segments))).toBe(AFTER)
    // 全拒绝 = 原文
    const allRejected: DiffDecision[] = segments.map((s) => ({
      index: s.index,
      type: s.type,
      accepted: false,
    }))
    expect(synthesizeAppliedText(segments, allRejected)).toBe(BEFORE)
    // 只拒绝第 1 处修改（beta→BETA）：保留旧词 + 接受尾部新增
    const rejectFirst: DiffDecision[] = segments.map((s) => ({
      index: s.index,
      type: s.type,
      accepted: s.ordinal !== 1,
    }))
    expect(synthesizeAppliedText(segments, rejectFirst)).toBe('alpha beta gamma delta')
  })
})

describe('InlineDiff（semantic 层）', () => {
  it('默认全部接受：容器 role=group + aria-label，应用回调返回改后全文', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const { container } = render(<InlineDiff before={BEFORE} after={AFTER} onApply={onApply} />)
    const root = screen.getByRole('group', { name: 'AI 修改对照' })
    expect(root).not.toBeNull()
    // 变更段以流内 diff 呈现：del 删除线 + ins 下划线（不只靠颜色的附加通道）
    expect(container.querySelector('del')).not.toBeNull()
    expect(container.querySelector('ins')).not.toBeNull()
    expect(container.querySelector('del')?.className).toContain('line-through')
    expect(container.querySelector('ins')?.className).toContain('underline')
    // 应用进度注（N 处中已接受 M 处）+ 应用即改后全文
    expect(screen.getByText('（2 处中已接受 2 处）')).toBeTruthy()
    await user.click(getToggle(/应用修改/))
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply).toHaveBeenCalledWith(AFTER)
  })

  it('逐段裁决切换：点钮翻转裁决态，onSegmentChange 携带全量段决策（含未变段恒接受）', async () => {
    const user = userEvent.setup()
    const onSegmentChange = vi.fn()
    const { container } = render(
      <InlineDiff before={BEFORE} after={AFTER} onSegmentChange={onSegmentChange} />,
    )
    // 裁决钮 aria-label 含序数与裁决态；段本体带序数与裁决标记
    expect(getToggle('第 2 处修改，已接受')).toBeTruthy()
    const changedSegments = container.querySelectorAll('[data-segment-type="changed"]')
    expect(changedSegments).toHaveLength(2)
    expect(changedSegments[0]?.getAttribute('data-change-ordinal')).toBe('1')
    expect(changedSegments[0]?.getAttribute('data-accepted')).toBe('true')
    await user.click(getToggle('第 1 处修改，已接受'))
    expect(getToggle('第 1 处修改，已拒绝')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '第 1 处修改，已接受' })).toBeNull()
    expect(changedSegments[0]?.getAttribute('data-accepted')).toBe('false')
    // 决策载荷：changed 段翻转 + unchanged 段恒接受
    const payload = onSegmentChange.mock.lastCall?.[0] as DiffDecision[]
    expect(payload.find((d) => d.type === 'changed' && d.accepted === false)).toBeTruthy()
    expect(payload.filter((d) => d.type === 'unchanged').every((d) => d.accepted)).toBe(true)
    // 再点一次切回接受
    await user.click(getToggle('第 1 处修改，已拒绝'))
    expect(getToggle('第 1 处修改，已接受')).toBeTruthy()
  })

  it('appliedText 合成：拒绝中间段后应用，得到混合裁决的合成文本', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<InlineDiff before={BEFORE} after={AFTER} onApply={onApply} />)
    await user.click(getToggle('第 1 处修改，已接受'))
    expect(screen.getByText('（2 处中已接受 1 处）')).toBeTruthy()
    await user.click(getToggle(/应用修改/))
    expect(onApply).toHaveBeenCalledWith('alpha beta gamma delta')
  })

  it('全部拒绝→应用 = 原文；全部接受→应用 = 改后文（「全部接受」伴随逐段回退）', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<InlineDiff before={BEFORE} after={AFTER} onApply={onApply} />)
    // 底部互反钮当前动作=全部拒绝
    await user.click(getToggle('全部拒绝'))
    expect(getToggle('第 1 处修改，已拒绝')).toBeTruthy()
    expect(getToggle('第 2 处修改，已拒绝')).toBeTruthy()
    await user.click(getToggle(/应用修改/))
    expect(onApply).toHaveBeenLastCalledWith(BEFORE)
    // 逐段拣回第 1 处（应用前回退能力），再应用
    await user.click(getToggle('第 1 处修改，已拒绝'))
    await user.click(getToggle(/应用修改/))
    expect(onApply).toHaveBeenLastCalledWith('alpha BETA gamma')
    // 此时互反钮动作=全部接受
    await user.click(getToggle('全部接受'))
    expect(getToggle('第 2 处修改，已接受')).toBeTruthy()
  })

  it('预览开关：实时合成结果可预览，aria-pressed 表达模式，返回对照还原', async () => {
    const user = userEvent.setup()
    const { container } = render(<InlineDiff before={BEFORE} after={AFTER} />)
    expect(container.querySelector('[data-slot="inline-diff-preview"]')).toBeNull()
    // 先在对照态拒绝第 2 处修改（尾部 +delta），再进预览
    await user.click(getToggle('第 2 处修改，已接受'))
    await user.click(getToggle('预览合成结果'))
    expect(getToggle('返回对照')).toHaveAttribute('aria-pressed', 'true')
    // 预览=当前裁决的合成结果（拒绝 delta 后不含它）
    expect(container.querySelector('[data-slot="inline-diff-preview"]')?.textContent).toBe(
      'alpha BETA gamma',
    )
    await user.click(getToggle('返回对照'))
    expect(container.querySelector('[data-slot="inline-diff-preview"]')).toBeNull()
  })

  it('键盘：j/k 在变更段间移动焦点，Enter 切换当前段裁决，a 全接受/全拒绝切换', async () => {
    const user = userEvent.setup()
    render(<InlineDiff before={BEFORE} after={AFTER} />)
    const root = screen.getByRole('group', { name: 'AI 修改对照' })
    root.focus()
    await user.keyboard('j')
    expect(getToggle('第 1 处修改，已接受')).toHaveFocus()
    await user.keyboard('j')
    expect(getToggle('第 2 处修改，已接受')).toHaveFocus()
    // 尾部 j 停留末段
    await user.keyboard('j')
    expect(getToggle('第 2 处修改，已接受')).toHaveFocus()
    // Enter 切换当前段（焦点在裁决钮上走 button 原生激活）
    await user.keyboard('{Enter}')
    expect(getToggle('第 2 处修改，已拒绝')).toHaveFocus()
    // k 回退焦点
    await user.keyboard('k')
    expect(getToggle('第 1 处修改，已接受')).toHaveFocus()
    // a：当前非全接受 → 全部接受；再按 → 全部拒绝
    await user.keyboard('a')
    expect(getToggle('第 1 处修改，已接受')).toBeTruthy()
    expect(getToggle('第 2 处修改，已接受')).toBeTruthy()
    await user.keyboard('a')
    expect(getToggle('第 1 处修改，已拒绝')).toBeTruthy()
    expect(getToggle('第 2 处修改，已拒绝')).toBeTruthy()
  })

  it('键盘不抢输入框：焦点在输入类控件内时快捷键让路；修饰键组合不劫持', () => {
    const onSegmentChange = vi.fn()
    const { container } = render(
      <InlineDiff before={BEFORE} after={AFTER} onSegmentChange={onSegmentChange} />,
    )
    const root = container.querySelector('[data-slot="inline-diff"]') as HTMLElement
    const fire = (init?: KeyboardEventInit) =>
      new KeyboardEvent('keydown', {
        key: 'a',
        bubbles: true,
        cancelable: true,
        ...init,
      })
    // 模拟消费方在组件内嵌入输入框：焦点与事件源都在 input 内，快捷键必须让路（不 preventDefault）
    const input = document.createElement('input')
    root.appendChild(input)
    input.focus()
    const swallowedByInput = fire()
    input.dispatchEvent(swallowedByInput)
    expect(swallowedByInput.defaultPrevented).toBe(false)
    // 修饰键组合不劫持（Ctrl+A 全选语义保留）
    getToggle('第 1 处修改，已接受').focus()
    const withCtrl = fire({ ctrlKey: true })
    root.dispatchEvent(withCtrl)
    expect(withCtrl.defaultPrevented).toBe(false)
    expect(onSegmentChange).not.toHaveBeenCalled()
  })

  it('a11y：裁决钮 aria-label 含序数与裁决态，纯新增/纯删除不渲染空侧标记', () => {
    const { container } = render(<InlineDiff before="hello" after="hello world" />)
    expect(container.querySelector('del')).toBeNull() // 纯新增无删除侧
    expect(container.querySelector('ins')).not.toBeNull()
    expect(getToggle('第 1 处修改，已接受')).toBeTruthy()
  })

  it('无差异：只渲染一致性说明，无裁决钮与动作行', () => {
    render(<InlineDiff before={BEFORE} after={BEFORE} />)
    expect(screen.getByText('两个版本内容一致，没有需要裁决的修改')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /应用修改/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /处修改/ })).toBeNull()
  })

  it('源文本变化：裁决与预览态整体重置（消费方持原文回退重传的场景）', async () => {
    const user = userEvent.setup()
    const { rerender, container } = render(<InlineDiff before={BEFORE} after={AFTER} />)
    await user.click(getToggle('第 1 处修改，已接受'))
    await user.click(getToggle('预览合成结果'))
    expect(container.querySelector('[data-slot="inline-diff-preview"]')).not.toBeNull()
    // 消费方回退：重传旧 before → 新 diff，裁决回默认全接受、退出预览
    rerender(<InlineDiff before="alpha" after="alpha BETA" />)
    expect(container.querySelector('[data-slot="inline-diff-preview"]')).toBeNull()
    expect(getToggle('第 1 处修改，已接受')).toBeTruthy()
  })

  it('透传与 ref（§10.7）：data-*/aria-* 落根元素，ref 指向根', () => {
    let rootRef: HTMLDivElement | null = null
    const { container } = render(
      <InlineDiff
        before={BEFORE}
        after={AFTER}
        ref={(node: HTMLDivElement | null) => {
          rootRef = node
        }}
        data-testid="diff-root"
        data-ai-entity="document:doc_1"
      />,
    )
    const root = container.querySelector('[data-testid="diff-root"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('data-ai-entity')).toBe('document:doc_1')
    expect(rootRef).not.toBeNull()
    expect(rootRef?.getAttribute('data-slot')).toBe('inline-diff')
  })

  it('DiffSegment 形状契约：index 为渲染序、ordinal 为变更序数（供受控面板消费）', () => {
    const segments: DiffSegment[] = diffTextSegments('a b c', 'a X c Y')
    expect(segments.map((s) => s.index)).toEqual(segments.map((_, i) => i))
    expect(segments.filter((s) => s.type === 'changed').map((s) => s.ordinal)).toEqual([1, 2])
  })
})
