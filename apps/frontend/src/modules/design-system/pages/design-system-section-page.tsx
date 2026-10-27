/**
 * 设计系统组件单页——2026-10-27 展示层路由化批新增：
 *   /app/design-system/section/:sectionId
 * 每个展示分区一页：页头（registry 五态徽标 + 源文件 + 消费方数）+ §22.7 aiNotes
 * 契约摘要折叠卡 + demo 本体（gallery-sections.gen 的分区组件）+ 组内上/下一件导航。
 */
import React from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMPONENT_REGISTRY } from '../registry'
import { SECTIONS } from '../gallery-kit'
import { GALLERY_SECTIONS } from '../sections/gallery-sections.gen'

const STATUS_DOT: Record<string, string> = {
  canonical: 'bg-accent-green',
  standby: 'bg-accent-yellow',
  review: 'bg-accent-blue',
  internal: 'bg-muted-foreground',
  deprecated: 'bg-accent-red',
}

export function DesignSystemSectionPage() {
  const { sectionId } = useParams()
  const navigate = useNavigate()

  const registryByName = React.useMemo(
    () => new Map(COMPONENT_REGISTRY.map((e) => [e.name, e])),
    [],
  )

  const idx = SECTIONS.findIndex((s) => s.id === sectionId)
  const section = idx >= 0 ? SECTIONS[idx] : null

  if (!section) {
    // 未知分区：回索引（链接全部来自 SECTIONS/registry，正常导航不会走到这）
    return <Navigate to="/app/design-system" replace />
  }

  const entry = registryByName.get(section.id)
  const Demo = GALLERY_SECTIONS[section.id]
  const prev = idx > 0 ? SECTIONS[idx - 1] : null
  const next = idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background" data-ai-page="design-system">

      {/* 页头：返回 + 标题 + 五态徽标 + 治理元数据 + 上/下一件 */}
      <header className="shrink-0 border-b border-border bg-background/95 px-4 py-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/app/design-system')}
          className="size-7 shrink-0 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="返回画廊索引"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">{section.label}</h1>
            <span className="shrink-0 inline-flex items-center px-1.5 py-px rounded text-3xs font-medium bg-muted/60 text-muted-foreground uppercase tracking-wide">
              {section.group}
            </span>
            {entry && (
              <span className="shrink-0 inline-flex items-center gap-1 text-3xs text-muted-foreground uppercase tracking-wide">
                <span className={cn('size-1.5 rounded-full', STATUS_DOT[entry.status] ?? 'bg-muted-foreground')} />
                {entry.status}
              </span>
            )}
          </div>
          <p className="text-3xs text-muted-foreground truncate mt-0.5">
            {entry
              ? `${entry.file}${entry.consumers != null ? ` · ${entry.consumers} 消费方` : ''}${entry.variants?.length ? ` · 变体 ${entry.variants.join(' / ')}` : ''}`
              : '聚合展示区 · 无单一 registry 条目'}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={!prev}
            onClick={() => prev && navigate(`/app/design-system/section/${prev.id}`)}
            className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title={prev ? `上一件：${prev.label}` : '已是第一件'}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() => next && navigate(`/app/design-system/section/${next.id}`)}
            className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title={next ? `下一件：${next.label}` : '已是最后一件'}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>

      {/* 主体：demo 本体 + §22.7 契约摘要 */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="mx-auto max-w-5xl px-6 py-6 space-y-4">
          {entry?.aiNotes && (
            <details className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <summary className="text-xs font-medium text-foreground cursor-pointer select-none">
                AI 契约摘要（aiNotes · 宪法 §22.7）
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">{entry.aiNotes}</p>
            </details>
          )}

          {Demo ? (
            <Demo />
          ) : (
            <p className="text-xs text-muted-foreground py-8 text-center">
              该分区没有可渲染的 demo 组件（gallery-sections.gen 映射缺失）。
            </p>
          )}

          {/* 底部上/下一件 */}
          <div className="flex items-center justify-between gap-3 pt-2 pb-4 border-t border-border">
            {prev ? (
              <button
                type="button"
                onClick={() => navigate(`/app/design-system/section/${prev.id}`)}
                className="min-w-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="size-3.5 shrink-0" />
                <span className="truncate">{prev.label}</span>
              </button>
            ) : <span />}
            {next ? (
              <button
                type="button"
                onClick={() => navigate(`/app/design-system/section/${next.id}`)}
                className="min-w-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="truncate">{next.label}</span>
                <ChevronRight className="size-3.5 shrink-0" />
              </button>
            ) : <span />}
          </div>
        </div>
      </main>
    </div>
  )
}
