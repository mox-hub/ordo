#!/usr/bin/env node
// ── 模块边界棘轮门禁（2026-10-28 工程体检第三步）──────────────────────────────
// 背景：`.dependency-cruiser.cjs` 早已定义边界规则，但只以 report-only 方式存在
// （`pnpm check:boundaries` 从不进质量门禁）。存量 136 条违规（去测试文件后）不可能
// 一次清零，于是「巡检」变成「永远绿的参考信息」——违规只增不减，规则形同虚设。
//
// 棘轮（ratchet）口径：
//   · `scripts/boundary-baseline.json` 冻结**当前存量**（fingerprint = 规则|from|to）；
//   · 本次扫描出现的违规若不在基线里 → **新增违规，exit 1**；
//   · 基线里有、本次已消失 → 只提示「可收缩 N 条」，不阻断（改进不该让人手动改基线才能过）；
//   · `--update` 才重写基线（收紧或有意接受新增），diff 里可评审。
//   · 测试文件（*.spec.ts / *.test.ts / test/ / __tests__/）不计入：测试跨模块取夹具是合法的，
//     把它们冻进基线只会让基线噪声淹没真实架构违规。
//
// 用法：
//   pnpm check:boundaries     # 门禁：有新增违规即红（CI 用）
//   pnpm boundaries:update    # 把当前违规集写成新基线
import { execFileSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_DIR = resolve(ROOT, 'apps/server');
const CONFIG = resolve(ROOT, '.dependency-cruiser.cjs');
const BASELINE = resolve(ROOT, 'scripts/boundary-baseline.json');

const TEST_FILE_RE = /\.(e2e-)?spec\.tsx?$|\.test\.tsx?$|(^|\/)(test|__tests__)\//;

function depcruiseCommand() {
  // 优先直接执行包入口 JS（`node .../dependency-cruise.mjs`）：跨平台一致，
  // 不受 Windows `.cmd` / 无扩展名 shell 包装的 spawn 差异影响。
  const entryCandidates = [
    resolve(ROOT, 'node_modules/dependency-cruiser/bin/dependency-cruise.mjs'),
    resolve(SERVER_DIR, 'node_modules/dependency-cruiser/bin/dependency-cruise.mjs'),
  ];
  const entry = entryCandidates.find((p) => existsSync(p));
  if (entry) return { cmd: process.execPath, prefix: [entry] };

  // 兜底交给 PATH：pnpm 脚本执行时 node_modules/.bin 已在 PATH 里。
  const name = process.platform === 'win32' ? 'depcruise.cmd' : 'depcruise';
  return { cmd: name, prefix: [] };
}

function normalize(p) {
  if (!p) return '';
  const posix = p.replace(/\\/g, '/');
  return posix.startsWith('src/') ? `apps/server/${posix}` : posix;
}

function runDepcruise() {
  const report = resolve(tmpdir(), `ordo-boundaries-${process.pid}-${Date.now()}.json`);
  const out = openSync(report, 'w');
  const { cmd, prefix } = depcruiseCommand();
  try {
    execFileSync(
      cmd,
      [...prefix, 'src', '--config', CONFIG, '--output-type', 'json', '--no-progress'],
      { cwd: SERVER_DIR, stdio: ['ignore', out, 'pipe'] },
    );
  } catch (err) {
    // 存在 error 级违规时 depcruise 可能以非零码退出，但报告仍是完整的。
    // 只有「报告没写出来 / 为空」才是真正的执行失败。
    if (!existsSync(report) || readFileSync(report, 'utf8').trim() === '') {
      console.error('[boundaries] depcruise failed to produce a report:', err.message);
      if (err.stderr) console.error(err.stderr.toString());
      process.exit(1);
    }
  } finally {
    try {
      closeSync(out);
    } catch {
      // 句柄已关闭/已失效时忽略
    }
  }
  try {
    return JSON.parse(readFileSync(report, 'utf8'));
  } finally {
    try {
      unlinkSync(report);
    } catch {
      // 临时文件清理失败不影响结论
    }
  }
}

function collectViolations(report) {
  const raw = report?.summary?.violations ?? [];
  const entries = [];
  const seen = new Set();
  for (const v of raw) {
    const from = normalize(v.from);
    const to = normalize(v.to ?? v.unresolvedTo);
    if (TEST_FILE_RE.test(from) || TEST_FILE_RE.test(to)) continue;
    const rule = v.rule?.name ?? 'unknown';
    const fingerprint = `${rule}|${from}|${to}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    entries.push({ rule, severity: v.rule?.severity ?? 'warn', from, to });
  }
  return entries;
}

function sortEntries(entries) {
  return [...entries].sort((a, b) =>
    `${a.rule}|${a.from}|${a.to}`.localeCompare(`${b.rule}|${b.from}|${b.to}`),
  );
}

function fingerprint(entry) {
  return `${entry.rule}|${entry.from}|${entry.to}`;
}

function loadBaseline() {
  if (!existsSync(BASELINE)) {
    console.error(`[boundaries] baseline missing: ${BASELINE}`);
    console.error('[boundaries] run `pnpm boundaries:update` to create it.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(BASELINE, 'utf8'));
}

function main() {
  const update = process.argv.includes('--update');
  const entries = sortEntries(collectViolations(runDepcruise()));
  const byRule = {};
  for (const entry of entries) {
    byRule[entry.rule] = (byRule[entry.rule] ?? 0) + 1;
  }

  if (update) {
    const body = {
      schemaVersion: 1,
      description:
        '模块边界违规基线（棘轮）。由 `pnpm boundaries:update` 生成；新增违规会让 check:boundaries 失败。测试文件不计入。',
      config: '.dependency-cruiser.cjs',
      updated: new Date().toISOString().slice(0, 10),
      total: entries.length,
      byRule,
      entries,
    };
    writeFileSync(BASELINE, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
    console.log(
      `[boundaries] baseline updated: ${entries.length} violation(s) — ${JSON.stringify(byRule)}`,
    );
    return;
  }

  const baseline = loadBaseline();
  const known = new Set((baseline.entries ?? []).map(fingerprint));
  const current = new Set(entries.map(fingerprint));

  const added = entries.filter((entry) => !known.has(fingerprint(entry)));
  const fixed = (baseline.entries ?? []).filter((entry) => !current.has(fingerprint(entry)));

  console.log(
    `[boundaries] baseline ${baseline.entries?.length ?? 0} → current ${entries.length} (new ${added.length}, resolved ${fixed.length})`,
  );

  if (fixed.length > 0) {
    console.log(
      `[boundaries] ${fixed.length} baseline violation(s) no longer present — run \`pnpm boundaries:update\` to shrink the ratchet.`,
    );
  }

  if (added.length > 0) {
    console.error(`[boundaries] ${added.length} NEW boundary violation(s):`);
    const limit = 30;
    for (const entry of added.slice(0, limit)) {
      console.error(`  - [${entry.rule}] ${entry.from} → ${entry.to}`);
    }
    if (added.length > limit) {
      console.error(`  … and ${added.length - limit} more`);
    }
    console.error('[boundaries] fix them, or consciously accept them via `pnpm boundaries:update`.');
    process.exit(1);
  }

  console.log('[boundaries] passed — no new violations beyond the frozen baseline.');
}

main();
