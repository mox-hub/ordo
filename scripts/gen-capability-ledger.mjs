#!/usr/bin/env node
// ── 能力账本生成器（2026-10-28 工程体检第二步）────────────────────────────────
// 目的：把 `docs/01-需求/能力清单-v1.md` 里的 71 张能力卡解析成**机器可校验的账本**，
// 让「功能点总账」从人读文档变成门禁可对账的事实：
//   · 需求侧（清单 md）与账本（json/md）不一致 → `--check` 直接红；
//   · 任何功能状态变更必须同步更新清单并重跑本脚本，杜绝「文档写着 done、代码没做」。
//
// 口径（单一真相源 = 清单 md）：
//   · 卡片 = `#### CAP-<区>-<两位序号> <标题>` 的一级小节；
//   · 状态 = 卡内**最后一条** `状态 <词>`（卡内常有「开工登记」追加行，后者覆盖前者）；
//   · 受控词表 = done / doing / planned / gap（清单 §四 格式纪律）；
//   · 跨线桥 X 卡**无状态**，按设计记为 `structure`（桥卡只声明边界，不是可交付切片）。
//   · 卡片缺状态且不是 X 卡 → 视为清单缺陷，脚本报错退出（绝不静默补默认值）。
//
// 用法：
//   node scripts/gen-capability-ledger.mjs           # 重新生成账本
//   node scripts/gen-capability-ledger.mjs --check   # 只校验，漂移则 exit 1（CI 用）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'docs/01-需求/能力清单-v1.md';
const JSON_OUT = 'docs/01-需求/能力账本-v1.json';
const MD_OUT = 'docs/01-需求/能力账本-摘要-v1.md';

const AREAS = {
  A: 'A 底盘线',
  B: 'B 治理线',
  C: 'C 同事线',
  K: 'D 契约知识线',
  X: '跨线桥',
  P: '规划卡',
  S: 'S 自举线',
  M: 'M 移动线',
};
const STATUSES = ['done', 'doing', 'planned', 'gap'];
const BRIDGE_AREA = 'X';

const CARD_RE = /^####\s+(CAP-([A-Z])-(\d{2}))\s+(.+?)\s*$/;
// 卡内状态写法实测有三种：`｜状态 done`、`｜状态 doing（余实机验收…）`、`- 状态：planned`。
// `\**` 容忍 `**done**`；取词后不再关心括注。
const STATUS_RE = /状态\s*[:：]?\s*\**\s*(done|doing|planned|gap)\b/g;

function readSource() {
  const abs = resolve(ROOT, SOURCE);
  if (!existsSync(abs)) {
    console.error(`[ledger] source capability list not found: ${SOURCE}`);
    process.exit(1);
  }
  return readFileSync(abs, 'utf8');
}

function parseCards(text) {
  const lines = text.split(/\r?\n/);
  const cards = [];
  let current = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const heading = CARD_RE.exec(line);
    if (heading) {
      if (current) cards.push(current);
      current = {
        id: heading[1],
        area: heading[2],
        seq: Number(heading[3]),
        title: heading[4],
        body: [],
      };
      continue;
    }
    // 任何 1–4 级标题都结束当前卡（含 `## 五、…` 等章节标题），
    // 避免把清单尾部的治理正文误当成最后一张卡的状态来源。
    if (current && /^#{1,4}\s+/.test(line)) {
      cards.push(current);
      current = null;
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) cards.push(current);

  return cards.map((card) => {
    const body = card.body.join('\n');
    const matches = [...body.matchAll(STATUS_RE)];
    let status;
    if (matches.length > 0) {
      status = matches[matches.length - 1][1];
    } else if (card.area === BRIDGE_AREA) {
      status = 'structure';
    } else {
      console.error(
        `[ledger] card ${card.id} has no status (expected one of ${STATUSES.join(' / ')}) — fix the capability list instead of defaulting.`,
      );
      process.exit(1);
    }
    return {
      id: card.id,
      area: card.area,
      areaLabel: AREAS[card.area] ?? card.area,
      title: card.title,
      status,
    };
  });
}

function buildLedger(text, cards) {
  const statusTotals = { done: 0, doing: 0, planned: 0, gap: 0, structure: 0 };
  const areaMap = new Map();
  for (const card of cards) {
    statusTotals[card.status] = (statusTotals[card.status] ?? 0) + 1;
    if (!areaMap.has(card.area)) {
      areaMap.set(card.area, {
        key: card.area,
        label: AREAS[card.area] ?? card.area,
        total: 0,
        done: 0,
        doing: 0,
        planned: 0,
        gap: 0,
        structure: 0,
      });
    }
    const area = areaMap.get(card.area);
    area.total += 1;
    area[card.status] += 1;
  }

  const order = Object.keys(AREAS);
  const areas = [...areaMap.values()].sort(
    (a, b) => order.indexOf(a.key) - order.indexOf(b.key),
  );

  return {
    schemaVersion: 1,
    source: SOURCE,
    sourceSha256: createHash('sha256').update(text, 'utf8').digest('hex'),
    total: cards.length,
    statusTotals,
    areas,
    cards,
  };
}

function renderMarkdown(ledger) {
  const pct = (n) => (ledger.total === 0 ? '0.0' : ((n / ledger.total) * 100).toFixed(1));
  const lines = [];

  lines.push('---');
  lines.push('title: 能力账本摘要 v1（机器生成）');
  lines.push(
    'description: 由 scripts/gen-capability-ledger.mjs 从 docs/01-需求/能力清单-v1.md 解析生成的能力卡状态账本；禁止手改，改清单后重跑脚本。',
  );
  lines.push('category: requirement');
  lines.push('status: active');
  lines.push('version: 1.0.0');
  lines.push('created: 2026-10-28');
  lines.push('modified: 2026-10-28');
  lines.push('---');
  lines.push('');
  lines.push('# 能力账本摘要 v1');
  lines.push('');
  lines.push(
    '> **本文件与 `能力账本-v1.json` 均为机器生成，勿手改**。唯一真相源是 `docs/01-需求/能力清单-v1.md`；状态变更后执行 `pnpm ledger:gen`，门禁 `pnpm check:ledger` 校验零漂移。',
  );
  lines.push('>');
  lines.push(
    '> 状态口径：`done` 已交付 / `doing` 在制 / `planned` 已登记未开工 / `gap` 已知缺口 / `structure` 跨线桥卡（只声明边界，无交付物）。',
  );
  lines.push('');
  lines.push('## 总览');
  lines.push('');
  lines.push(`- 能力卡总数：**${ledger.total}**`);
  for (const status of STATUSES) {
    lines.push(
      `- ${status}：**${ledger.statusTotals[status] ?? 0}**（${pct(ledger.statusTotals[status] ?? 0)}%）`,
    );
  }
  lines.push(
    `- structure（X 桥卡）：**${ledger.statusTotals.structure ?? 0}**（${pct(ledger.statusTotals.structure ?? 0)}%）`,
  );
  lines.push('');
  lines.push('## 分区统计');
  lines.push('');
  lines.push('| 区 | 卡数 | done | doing | planned | gap | structure |');
  lines.push('|----|-----:|-----:|------:|--------:|----:|----------:|');
  for (const area of ledger.areas) {
    lines.push(
      `| ${area.label} | ${area.total} | ${area.done} | ${area.doing} | ${area.planned} | ${area.gap} | ${area.structure} |`,
    );
  }
  lines.push('');
  lines.push('## 卡片明细');
  lines.push('');

  let currentArea = null;
  for (let i = 0; i < ledger.cards.length; i += 1) {
    const card = ledger.cards[i];
    if (card.area !== currentArea) {
      currentArea = card.area;
      lines.push(`### ${card.areaLabel}`);
      lines.push('');
      lines.push('| 卡片 | 名称 | 状态 |');
      lines.push('|------|------|------|');
    }
    lines.push(`| \`${card.id}\` | ${card.title} | ${card.status} |`);
    const next = ledger.cards[i + 1];
    if (!next || next.area !== card.area) {
      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const check = process.argv.includes('--check');
  const text = readSource();
  const cards = parseCards(text);
  const ledger = buildLedger(text, cards);
  const json = `${JSON.stringify(ledger, null, 2)}\n`;
  const markdown = renderMarkdown(ledger);

  if (check) {
    const absJson = resolve(ROOT, JSON_OUT);
    const absMd = resolve(ROOT, MD_OUT);
    const problems = [];
    if (!existsSync(absJson)) {
      problems.push(`${JSON_OUT} is missing`);
    } else if (readFileSync(absJson, 'utf8') !== json) {
      problems.push(`${JSON_OUT} is out of date`);
    }
    if (!existsSync(absMd)) {
      problems.push(`${MD_OUT} is missing`);
    } else if (readFileSync(absMd, 'utf8') !== markdown) {
      problems.push(`${MD_OUT} is out of date`);
    }
    if (problems.length > 0) {
      console.error('[ledger] capability ledger drift detected:');
      problems.forEach((msg) => console.error(`  - ${msg}`));
      console.error('[ledger] run `pnpm ledger:gen` and commit the regenerated files.');
      process.exit(1);
    }
    console.log(
      `[ledger] passed (${ledger.total} cards; done ${ledger.statusTotals.done} / doing ${ledger.statusTotals.doing} / planned ${ledger.statusTotals.planned} / gap ${ledger.statusTotals.gap} / structure ${ledger.statusTotals.structure}).`,
    );
    return;
  }

  writeFileSync(resolve(ROOT, JSON_OUT), json, 'utf8');
  writeFileSync(resolve(ROOT, MD_OUT), markdown, 'utf8');
  console.log(
    `[ledger] wrote ${JSON_OUT} + ${MD_OUT} (${ledger.total} cards; done ${ledger.statusTotals.done} / doing ${ledger.statusTotals.doing} / planned ${ledger.statusTotals.planned} / gap ${ledger.statusTotals.gap} / structure ${ledger.statusTotals.structure}).`,
  );
}

main();
