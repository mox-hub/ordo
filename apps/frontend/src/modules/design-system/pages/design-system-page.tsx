/**
 * 设计系统首页（索引）——2026-10-27 展示层路由化批：
 * 7067 行巨型单页退役，拆为「索引卡片网格 + 每组件单页路由」双层：
 *   /app/design-system                     → 本页（分组卡片索引 + 搜索）
 *   /app/design-system/section/:sectionId  → 单页（design-system-section-page.tsx）
 * demo 本体在 ../sections/gallery-sections.gen.tsx（105+6 锚块一件一组件，机械切分产物）；
 * 治理元数据沿用 ../registry.ts（单一真相源）；画廊覆盖率门禁改扫 sections/ 目录 + gallery-kit。
 */
import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Search, ShieldCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMPONENT_REGISTRY } from '../registry'
import { SECTIONS, SECTION_GROUPS } from '../gallery-kit'
import { GALLERY_SECTIONS } from '../sections/gallery-sections.gen'

/** 五态徽标点（色值沿用本模块既有 accent-* token，禁自配色） */
const STATUS_DOT: Record<string, string> = {
  canonical: 'bg-accent-green',
  standby: 'bg-accent-yellow',
  review: 'bg-accent-blue',
  internal: 'bg-muted-foreground',
  deprecated: 'bg-accent-red',
}

/**
 * 活体缩略预览（2026-10-27 卡片活体批）：索引卡片内真实渲染该分区 demo 并整体缩放，
 * 非截图非静态图——run-timeline 计时、cost-figure 滚动等活性在卡片上即所见。
 * 懒挂载：进入视口（含 120px 预载边）才挂 demo，滚过后保留避免回滚闪烁；
 * 交互封死（pointer-events-none）+ 辅助技术屏蔽（aria-hidden），demo 崩溃由边界兜底不炸索引页。
 */
function SectionThumb({ sectionId }: { sectionId: string }) {
  const Demo = GALLERY_SECTIONS[sectionId]
  const [host, setHost] = React.useState<HTMLDivElement | null>(null)
  const [inView, setInView] = React.useState(false)

  React.useEffect(() => {
    if (!host || inView) return
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          ob.disconnect()
        }
      },
      { rootMargin: '120px' },
    )
    ob.observe(host)
    return () => ob.disconnect()
  }, [host, inView])

  return (
    <div
      ref={setHost}
      className="relative h-36 shrink-0 overflow-hidden rounded-md border border-border/60 bg-background"
      aria-hidden="true"
    >
      {Demo && inView && (
        <SectionThumbBoundary>
          <div
            data-gallery-thumb={sectionId}
            className="pointer-events-none absolute left-0 top-0 origin-top-left scale-40 w-[250%] select-none"
          >
            <Demo />
          </div>
        </SectionThumbBoundary>
      )}
    </div>
  )
}

/** 缩略预览崩溃兜底：个别 demo 异常只降级本卡，不影响索引页与其余卡片 */
class SectionThumbBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full items-center justify-center text-3xs text-muted-foreground">
          预览渲染失败 · 进单页查看
        </div>
      )
    }
    return this.props.children
  }
}

export function DesignSystemPage() {
  const [navSearch, setNavSearch] = React.useState('')

  const registryByName = React.useMemo(
    () => new Map(COMPONENT_REGISTRY.map((e) => [e.name, e])),
    [],
  )

  const filteredSections = React.useMemo(() => {
    if (!navSearch.trim()) return SECTIONS
    const q = navSearch.toLowerCase()
    return SECTIONS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q),
    )
  }, [navSearch])

  const grouped = React.useMemo(
    () =>
      SECTION_GROUPS.map((g) => ({
        label: g,
        items: filteredSections.filter((s) => s.group === g),
      })).filter((g) => g.items.length > 0),
    [filteredSections],
  )

  const reviewCount = React.useMemo(
    () => COMPONENT_REGISTRY.filter((e) => e.status === 'review').length,
    [],
  )

  return (
    <div className="flex h-full w-full overflow-hidden bg-background" data-ai-page="design-system">

      {/* 左侧导航：组件清单（点击进单页），搜索与主区网格共用同一份过滤 */}
      <aside className="w-56 shrink-0 border-r border-border h-full flex flex-col bg-background/95 select-none">
        <div className="p-3.5 border-b border-border space-y-2.5 shrink-0 bg-background">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Design System</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-3xs font-semibold bg-violet-500 text-white uppercase tracking-wide">
              DEV
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="搜索组件或 Token…"
              className="w-full h-7 pl-7 pr-6 text-xs rounded-md border border-border bg-muted/40 placeholder:text-muted-foreground/60 focus:bg-background focus:outline-hidden focus:border-accent-blue transition-colors"
            />
            {navSearch && (
              <button
                type="button"
                onClick={() => setNavSearch('')}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-3">
          {grouped.length === 0 ? (
            <p className="px-2 py-4 text-xs text-muted-foreground text-center">无匹配项</p>
          ) : (
            grouped.map((g) => (
              <div key={g.label}>
                <p className="px-2.5 pb-1 text-3xs font-semibold text-muted-foreground/60 uppercase tracking-widest">
                  {g.label}
                  <span className="ml-1 text-3xs text-muted-foreground/40">{g.items.length}</span>
                </p>
                {g.items.map((s) => {
                  const entry = registryByName.get(s.id)
                  return (
                    <Link
                      key={s.id}
                      to={`/app/design-system/section/${s.id}`}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{s.label}</span>
                      {entry && (
                        <span
                          className={cn('size-1.5 rounded-full shrink-0', STATUS_DOT[entry.status] ?? 'bg-muted-foreground')}
                          title={entry.status}
                        />
                      )}
                    </Link>
                  )
                })}
              </div>
            ))
          )}
        </nav>
      </aside>

      {/* 主区：分组卡片索引 */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <div className="flex items-baseline justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-semibold text-foreground">组件画廊</h1>
              <p className="text-xs text-muted-foreground mt-1">
                {SECTIONS.length} 个展示分区 · {COMPONENT_REGISTRY.length} 条治理登记 · 点卡片进单页预览
              </p>
            </div>
          </div>

          {/* 裁决面置顶（人类原话：组件仍然不删除，但要在 design-system 页面标记，看过后再删） */}
          {!navSearch.trim() && (
            <Link
              to="/app/design-system/section/component-review"
              className="mb-8 flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 hover:border-accent-blue/50 hover:bg-muted/50 transition-colors group"
            >
              <ShieldCheck className="size-4 text-accent-blue shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  组件裁决面 <span className="text-xs text-muted-foreground">Component Review Board</span>
                </p>
                <p className="text-3xs text-muted-foreground mt-0.5">
                  五态裁决总览与 Registry 对账{reviewCount > 0 ? ` · ${reviewCount} 条待审` : ' · 当前无待审条目'}
                </p>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </Link>
          )}

          {grouped.map((g) => (
            <section key={g.label} className="mb-8">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 pb-2 border-b border-border">
                {g.label}
                <span className="ml-2 text-3xs text-muted-foreground/50 font-normal">{g.items.length}</span>
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
                {g.items.map((s) => {
                  const entry = registryByName.get(s.id)
                  return (
                    <Link
                      key={s.id}
                      to={`/app/design-system/section/${s.id}`}
                      className="group rounded-lg border border-border bg-card p-2 flex flex-col gap-2 hover:border-accent-blue/50 hover:shadow-sm transition-all"
                    >
                      <SectionThumb sectionId={s.id} />
                      <div className="px-1 pb-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-foreground leading-snug">{s.label}</span>
                          <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                        </div>
                        <div className="flex items-center gap-1.5 text-3xs text-muted-foreground min-w-0">
                          {entry ? (
                            <>
                              <span className={cn('size-1.5 rounded-full shrink-0', STATUS_DOT[entry.status] ?? 'bg-muted-foreground')} />
                              <span className="uppercase tracking-wide shrink-0">{entry.status}</span>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="font-mono truncate" title={entry.file}>{entry.file}</span>
                            </>
                          ) : (
                            <span className="px-1 py-px rounded bg-muted/60 text-muted-foreground">聚合展示区</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
