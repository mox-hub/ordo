#!/usr/bin/env node
/**
 * 防漂移门禁（M4，2026-11-08）：迁移涉及的目录只允许两类文件——
 *   ① 纯 re-export 转发 shim（.ts，内容仅限头部注释 + `export * from '@mox-hub/ui/...'`）
 *   ② 登记在 KEEP 实体白名单里的未迁移件（chart / avatar-picker-field / mock-badge）
 * 出现新 .tsx / 非白名单实体实现 / shim 内混入逻辑 = 退出码 1。
 * 扫描面：components/ui/、components/raw/、components/semantic/ 的 7 个升层件路径
 * （semantic 其余实体件留在主仓，不归本门禁管）。组件改动一律进 @mox-hub/ui。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(PKG_ROOT, 'src', 'components')

// 未迁移实体白名单（依赖闭包或主仓 mock 系统耦合，见 ordo-ui docs/迁移对账-v1.md §三）
const KEEP_FILES = new Set([
  'components/ui/chart.tsx',
  'components/ui/avatar-picker-field.tsx',
  'components/ui/mock-badge.tsx',
])

// 升层件（迁移进 @mox-hub/ui，主仓留 shim）
const UPGRADED_SEMANTIC = [
  'empty-state', 'async-state', 'detail-section', 'definition-row',
  'metric-row', 'icon-metric', 'nav-status-dot',
]

const SHIM_RE = /^export \* from '@mox-hub\/ui\/components\/[^']+'$/

const errors = []
const counts = { shim: 0, keep: 0 }

function checkFile(rel) {
  const p = join(SRC, rel.replace(/^components\//, ''))
  if (KEEP_FILES.has(rel)) {
    counts.keep++
    return
  }
  if (!existsSync(p)) {
    errors.push(`components/${rel}: 迁移件缺失转发 shim（应有 ${rel.replace(/\.tsx$/, '.ts')}）`)
    return
  }
  const body = readFileSync(p, 'utf8')
  const codeLines = body
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && l.trim() !== '')
  const ok =
    codeLines.length === 1 &&
    codeLines[0].startsWith('export * from') &&
    SHIM_RE.test(codeLines[0].trim())
  if (!ok) {
    errors.push(`components/${rel}: shim 内容漂移（只许一行 export * from '@mox-hub/ui/components/…' + 注释）`)
    return
  }
  counts.shim++
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
    const codeLines = body
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && l.trim() !== '')
    const ok =
      codeLines.length === 1 &&
      codeLines[0].startsWith('export * from') &&
      SHIM_RE.test(codeLines[0].trim())
    if (!ok) {
      errors.push(`components/${rel}: shim 内容漂移（只许一行 export * from '@mox-hub/ui/components/…' + 注释）`)
      continue
    }
    counts.shim++
  }
}

// ui/ 与 raw/ 全目录扫描（迁移件 + 留置件都在这里）
scanMigrated(join(SRC, 'ui'), 'ui/')
scanMigrated(join(SRC, 'raw'), 'raw/')
// 升层件逐路径校验（semantic 其余实体件不在扫描面内；shim 为 .ts）
for (const name of UPGRADED_SEMANTIC) {
  checkFile(`semantic/${name}.ts`)
}

if (errors.length > 0) {
  console.error(`✗ UI 转发层防漂移检查失败（${errors.length}）：`)
  for (const e of errors) console.error('  -', e)
  console.error('\n组件源码唯一真相 = @mox-hub/ui（mox-hub/ordo-ui）。请移改至该仓并走其 registry/护栏流程。')
  process.exit(1)
}
console.log(
  `✓ UI 转发层防漂移检查通过（shim ${counts.shim} 个 / 留置实体 ${counts.keep} 个）`,
)
