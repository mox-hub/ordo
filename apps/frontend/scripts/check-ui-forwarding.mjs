#!/usr/bin/env node
/**
 * 防漂移门禁（M4，2026-11-08；W4 扩展 2026-11-12）：迁移涉及的目录只允许三类文件——
 *   ① 纯 re-export 转发 shim（.ts，内容仅限头部注释 + 一行
 *      `export * from '@mox-hub/ui/components/…'` 或 `@mox-hub/patterns/components/…'`）
 *   ② 登记在 KEEP 实体白名单里的未迁移件（avatar-picker-field / mock-badge）
 *   ③ semantic/ 下冻结的「适配器 / 未迁移实体」白名单（新增 .tsx 即 CI 红）
 * 出现新 .tsx / 非白名单实体实现 / shim 内混入逻辑 = 退出码 1。
 * 扫描面：components/ui/、components/raw/ 全目录；components/semantic/ 全目录。
 * 组件改动一律进 @mox-hub/ui 或 @mox-hub/patterns。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(PKG_ROOT, 'src', 'components')

// 未迁移实体白名单（依赖闭包或主仓 mock 系统耦合，见 ordo-ui docs/迁移对账-v1.md §三）
const KEEP_FILES = new Set([
  'components/ui/avatar-picker-field.tsx',
  'components/ui/mock-badge.tsx',
])

// semantic/ 冻结白名单：12 个 i18n/router/query/桌面壳适配器。
// 这些件保留主仓 .tsx，只把展示实现转发到 @mox-hub/patterns。
const SEMANTIC_ADAPTERS = new Set([
  'ai-verdict-pill',
  'confidence-bar',
  'filter-chips',
  'form-dialog',
  'global-loading-state',
  'page-error-fallback',
  'path-input',
  'section-scrubber',
  'sticky-save-bar',
  'sub-page-toolbar',
  'toolbar-row',
  'view-display-popover',
])

// semantic/ 未迁移实体（本轮不在 72 件接线面内；冻结，新增必须先迁 patterns）
const SEMANTIC_UNMIGRATED = new Set([
  'artifact-source-badge',
  'status-definition-dialog',
  'status-definition-list',
  'tab-bar',
])

const SHIM_RE = /^export \* from '@mox-hub\/(?:ui|patterns)\/components\/[^']+';?$/

const errors = []
const counts = { shim: 0, keep: 0 }

/** 去掉块注释与行注释后的有效代码行（shim 只允许 1 行 export）。 */
function shimCodeLines(body) {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('//'))
}

function scanMigrated(dir, prefix) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      scanMigrated(p, `${prefix}${name}/`)
      continue
    }
    const rel = `${prefix}${name}`
    if (KEEP_FILES.has(`components/${rel}`)) {
      counts.keep++
      continue
    }
    if (/\.(test|spec)\.(ts|tsx)$/.test(name)) continue // 测试随组件迁至 @mox-hub/ui，此处不重复设防
    if (!/\.ts$/.test(name)) {
      errors.push(`components/${rel}: 迁移目录只允许 .ts 转发 shim——组件改动应进 @mox-hub/ui`)
      continue
    }
    const body = readFileSync(p, 'utf8')
    const codeLines = shimCodeLines(body)
    const ok =
      codeLines.length === 1 &&
      codeLines[0].startsWith('export * from') &&
      SHIM_RE.test(codeLines[0].trim())
    if (!ok) {
      errors.push(`components/${rel}: shim 内容漂移（只许一行 export * from '@mox-hub/{ui,patterns}/components/…' + 注释）`)
      continue
    }
    counts.shim++
  }
}

// semantic/ 冻结扫描：.ts 必须是纯 shim；.tsx 只允许适配器 / 未迁移实体白名单
function scanSemantic(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      errors.push(`components/semantic/${name}: semantic 目录不允许子目录`)
      continue
    }
    if (/\.(test|spec)\.(ts|tsx)$/.test(name)) continue
    if (name.endsWith('.md')) continue
    const base = name.replace(/\.(ts|tsx)$/, '')
    if (name.endsWith('.tsx')) {
      if (SEMANTIC_ADAPTERS.has(base) || SEMANTIC_UNMIGRATED.has(base)) {
        counts.keep++
        continue
      }
      errors.push(
        `components/semantic/${name}: 未登记实体——展示组件应迁 @mox-hub/patterns；确需留主仓请登记白名单`,
      )
      continue
    }
    if (!name.endsWith('.ts')) {
      errors.push(`components/semantic/${name}: 只允许 .ts 转发 shim 或白名单 .tsx`)
      continue
    }
    const body = readFileSync(p, 'utf8')
    const codeLines = shimCodeLines(body)
    const ok =
      codeLines.length === 1 &&
      codeLines[0].startsWith('export * from') &&
      SHIM_RE.test(codeLines[0].trim())
    if (!ok) {
      errors.push(`components/semantic/${name}: shim 内容漂移（只许一行 export * from '@mox-hub/{ui,patterns}/components/…' + 注释）`)
      continue
    }
    counts.shim++
  }
}

// ui/ 与 raw/ 全目录扫描（迁移件 + 留置件都在这里）
scanMigrated(join(SRC, 'ui'), 'ui/')
scanMigrated(join(SRC, 'raw'), 'raw/')
scanSemantic(join(SRC, 'semantic'))

if (errors.length > 0) {
  console.error(`✗ UI 转发层防漂移检查失败（${errors.length}）：`)
  for (const e of errors) console.error('  -', e)
  console.error('\n组件源码唯一真相 = @mox-hub/ui（原子）或 @mox-hub/patterns（语义层）。请移改至 mox-hub/ordo-ui 并走其 registry/护栏流程。')
  process.exit(1)
}
console.log(
  `✓ UI 转发层防漂移检查通过（shim ${counts.shim} 个 / 留置实体 ${counts.keep} 个）`,
)
