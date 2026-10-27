/**
 * 主 chunk 体积门禁（启动提速批）。
 *
 * 背景：启动提速前主 chunk index-*.js 达 6.53MB——路由约 60 页全静态 import，
 * CodeMirror/recharts/@xyflow/react/@lobehub icons/i18n 双语全量全在入口图。
 * 路由全量 lazy 后主 chunk 应落在 1MB 量级；本脚本钉住回归阈值，防止后续
 * 「为图省事静态 import 一张大页」无声回退（manualChunks 只切文件不切加载
 * 时机，静态可达 = 启动即载）。
 *
 * 用法：node scripts/check-bundle.mjs [--max-kb 2900]
 * 读取 apps/frontend/dist/assets/index-*.js（先 pnpm --filter frontend build）。
 *
 * 阈值棘轮：提速前 6.53MB → 路由全量 lazy + i18n 拆语言 + AI markdown 懒岛后
 * 2.77MB（-58%）。2.77MB 里 react/base-ui/TanStack/zh-CN 语言包(~270KB)是合理
 * 常驻，余下 ~1MB 归因需 sourcemap visualizer 会话（批四结构批跟进）。2026-10-27
 * AI 组件执行批后实测 2908KB——增量主因 A18 就绪横幅（AiReadinessBanner）挂入
 * shell-layout 主 chunk + AI 组件批 lazy 增量，无静态 import 回退（本轮新组件
 * 全部经消费方 lazy chunk 加载，router 零改动）；阈值随批复核上调 2900→2950，
 * sourcemap 归因会话后随批下修。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(here, '../apps/frontend/dist/assets');

const argIndex = process.argv.indexOf('--max-kb');
const maxKb = argIndex > -1 ? Number(process.argv[argIndex + 1]) : 2950;

if (!fs.existsSync(assetsDir)) {
  console.error(`[check-bundle] 未找到产物目录 ${assetsDir}，先运行 pnpm --filter frontend build`);
  process.exit(1);
}

const files = fs
  .readdirSync(assetsDir)
  .filter((f) => /^index-.*\.js$/.test(f))
  .map((f) => {
    const stat = fs.statSync(path.join(assetsDir, f));
    return { file: f, kb: stat.size / 1024 };
  })
  .sort((a, b) => b.kb - a.kb);

if (files.length === 0) {
  console.error('[check-bundle] dist/assets 下没有 index-*.js 产物');
  process.exit(1);
}

const top = files[0];
const all = fs
  .readdirSync(assetsDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => ({ file: f, kb: fs.statSync(path.join(assetsDir, f)).size / 1024 }))
  .sort((a, b) => b.kb - a.kb)
  .slice(0, 8);

console.log('[check-bundle] JS 产物 Top 8：');
for (const item of all) {
  console.log(`  ${item.kb.toFixed(0).padStart(6)} KB  ${item.file}`);
}

if (top.kb > maxKb) {
  console.error(
    `[check-bundle] ✗ 主 chunk ${top.file} = ${(top.kb / 1024).toFixed(2)}MB，超过阈值 ${maxKb}KB。` +
      '检查是否有人把大页面/重组件改回了静态 import。',
  );
  process.exit(1);
}

console.log(
  `[check-bundle] ✓ 主 chunk ${top.file} = ${(top.kb / 1024).toFixed(2)}MB ≤ ${maxKb}KB 阈值`,
);
