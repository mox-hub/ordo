// spike 判据 1 的机器证据：扫 export sourcemap 的模块图，
// 断言不含 Node 内置模块（fs/os/path/child_process 等）。
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('dist/_expo/static/js/android');
const NODE_BUILTIN_NAMES = [
  'fs',
  'os',
  'path',
  'child_process',
  'net',
  'tls',
  'http',
  'https',
  'crypto',
  'stream',
  'util',
  'url',
  'zlib',
  'cluster',
  'dns',
  'readline',
  'worker_threads',
];

if (!fs.existsSync(dir)) {
  console.error(`找不到导出目录: ${dir}`);
  process.exit(1);
}

const maps = fs.readdirSync(dir).filter((f) => f.endsWith('.map'));
let sources = [];
for (const m of maps) {
  const map = JSON.parse(fs.readFileSync(path.join(dir, m), 'utf8'));
  sources = sources.concat(map.sources ?? []);
}

const hits = sources.filter((s) => {
  if (typeof s !== 'string') return false;
  const base = s.replace(/\\/g, '/').toLowerCase();
  // 命中标准：裸模块名（fs）、node: 前缀（node:fs）、node_modules 下的内建垫片、
  // node:internal。路径中段的同名目录（如 ordo-shared/dist/http/）不算。
  if (base.startsWith('node:')) return true;
  return NODE_BUILTIN_NAMES.some(
    (name) =>
      base === name ||
      new RegExp(`(^|/)node_modules/(node:)?${name}(/|$)`).test(base) ||
      new RegExp(`(^|/)node_modules/.pnpm/${name}@`).test(base),
  );
});

const sharedModules = sources.filter((s) => s.replace(/\\/g, '/').includes('ordo-shared'));

console.log(`sourcemap 模块总数: ${sources.length}`);
console.log(`Node 内置模块命中: ${hits.length}`);
if (hits.length > 0) {
  console.log(hits.slice(0, 20).join('\n'));
}
console.log(`ordo-shared 模块数: ${sharedModules.length}`);
console.log(sharedModules.slice(0, 8).join('\n'));

process.exit(hits.length === 0 ? 0 : 1);
