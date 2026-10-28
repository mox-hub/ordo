#!/usr/bin/env node
// ── 文档覆盖率门禁（2026-10-28 重写）──────────────────────────────────────────
// 旧实现（2026-04 遗物）检查的是 `docs/meta/requirements/feature-*.md`、
// `docs/reports/traceability-matrix.md`、`docs/INDEX.md`——这三个路径在仓库里都不存在；
// 且 CI 里 `isCI` 分支无条件 `exit 0`。两个因素叠加，这道门禁**从未检查过任何东西**
// （绿得毫无信息量）。2026-10-28 真相源入库后，重写为两条真实可执行的检查：
//
//   A. 模块 ↔ 架构文档覆盖：`apps/{server,frontend}/src/modules/*` 的每个真实目录，
//      必须在 `docs/02-架构设计/architecture/<side>/modules.md` 中出现；
//      未出现 = 新增模块没进开发真相源（模块地图失真的直接原因）。
//      方向刻意单向（目录 → 文档）：文档可以先于代码合入（如分支较旧时），
//      反向检查会把「文档已写好、代码在另一条已推送分支」误判为缺口。
//   B. `docs/README.md` 的本地链接可达：真相子集已入库，索引里的每个链接都应能打开。
//      指向本地保留目录（reports/archive/diagrams/stability-reports）的链接跳过。
//
// 运行：pnpm check:doc-coverage（CI quality-gate 的 docs job 内执行）
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_DOCS = [
  { side: 'backend', dir: 'apps/server/src/modules', doc: 'docs/02-架构设计/architecture/backend/modules.md' },
  { side: 'frontend', dir: 'apps/frontend/src/modules', doc: 'docs/02-架构设计/architecture/frontend/modules.md' },
];
// 不入库的本地目录：README 里可以提，但链接目标不要求在干净 checkout 中存在。
const LOCAL_ONLY_PREFIXES = ['reports/', 'archive/', 'diagrams/', 'roadmap/stability-reports/'];

let errors = 0;

function logError(msg) {
  console.error(`[doc-coverage] ❌ ${msg}`);
  errors += 1;
}

function logOk(msg) {
  console.log(`[doc-coverage] ✅ ${msg}`);
}

function checkModuleDocCoverage() {
  for (const { side, dir, doc } of MODULE_DOCS) {
    const absDir = resolve(ROOT, dir);
    const absDoc = resolve(ROOT, doc);
    if (!existsSync(absDir)) {
      logError(`${dir}/ not found`);
      continue;
    }
    if (!existsSync(absDoc)) {
      logError(`${doc} not found (module map is a truth source and must be versioned)`);
      continue;
    }

    const modules = readdirSync(absDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const content = readFileSync(absDoc, 'utf8');

    const missing = modules.filter((name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // 接受 `` `name` `` 或独立单词两种写法；词边界避免 `task` 命中 `task-template`。
      return !new RegExp(`\`${escaped}\`|(?<![\\w-])${escaped}(?![\\w-])`).test(content);
    });

    if (missing.length > 0) {
      logError(
        `${side}: ${missing.length} module dir(s) missing from ${doc}: ${missing.join(', ')}`,
      );
    } else {
      logOk(`${side}: all ${modules.length} module dirs documented in ${doc}`);
    }
  }
}

function checkReadmeLinks() {
  const readme = resolve(ROOT, 'docs/README.md');
  if (!existsSync(readme)) {
    logError('docs/README.md not found (document index must be versioned)');
    return;
  }

  const content = readFileSync(readme, 'utf8');
  const links = [...content.matchAll(/\]\(([^)]+)\)/g)]
    .map((match) => match[1].trim())
    .filter((href) => !href.startsWith('http') && !href.startsWith('#'))
    .map((href) => href.split('#')[0])
    .filter(Boolean);

  const checked = new Set();
  let broken = 0;
  for (const href of links) {
    if (LOCAL_ONLY_PREFIXES.some((prefix) => href.startsWith(prefix))) continue;
    if (checked.has(href)) continue;
    checked.add(href);
    if (!existsSync(resolve(ROOT, 'docs', href))) {
      logError(`docs/README.md links to missing file: docs/${href}`);
      broken += 1;
    }
  }

  if (broken === 0) {
    logOk(`docs/README.md: ${checked.size} local link(s) resolved`);
  }
}

console.log('[doc-coverage] checking documentation coverage...\n');
checkModuleDocCoverage();
checkReadmeLinks();

console.log(
  `\n[doc-coverage] ${errors === 0 ? 'all checks passed ✅' : `${errors} issue(s) found ❌`}`,
);
process.exit(errors > 0 ? 1 : 0);
