/**
 * P0-2 T1 旧数据迁移：探测（三态 + 冲突）→ 迁移（复制 + 备份 + sha256 校验 + `.migrated.bak`）→ 回滚。
 *
 * 背景：Ordo 历史上有三代数据位置，当前 installer.nsh 只查 `~/.ordo`，`~/.apm` 或
 * `%APPDATA%/agent-project-manager` 的老用户升级上来会被误判「全新安装」→ 旧数据孤儿化。
 * 探测集合（4 类）：
 *   ① `%APPDATA%/agent-project-manager`      （v0.6.1 及更早，Electron userData）
 *   ② `~/.apm`                               （Ordo 改名之前）
 *   ③ `~/.ordo` 内旧文件名残留               （data/apm.db / data/agent-project-manager.db / .apm-backups / apm-config.json）
 *   ④ `~/agent-project-manager/{documents,docs}`（文档库默认值，代码至今未迁）
 *
 * 合并策略未实现：两库并存（旧 db + `data/ordo.db` 同时存在）时返回 `MERGE_REQUIRED`，
 * 本模块不做合并——合并策略待用户裁决（TODO P0-2 merge）。在此之前绝不覆盖任何数据。
 *
 * 参考：退役的 `migrateLegacyUserData`（commit ccb9ae0f 删除）的「白名单搬 + `.migrated.bak` 留档」思路。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type MigrationState =
  | 'FRESH'
  | 'ALREADY_NEW'
  | 'MIGRATE'
  | 'ABORT'
  | 'MERGE_REQUIRED';

export type LegacyKind = 'appdata' | 'home-apm' | 'documents' | 'docs';

export interface LegacyLocation {
  kind: LegacyKind;
  path: string;
}

export interface MigrationDetection {
  state: MigrationState;
  ordoDir: string;
  legacy: LegacyLocation[];
  /** `~/.ordo` 内的旧文件名残留（相对 `~/.ordo` 的 posix 路径） */
  inPlaceLeftovers: string[];
  reasons: string[];
}

export interface MigrationFileEntry {
  size: number;
  sha: string;
}

export interface MigrationManifest {
  ts: string;
  ordoDir: string;
  backupDir: string;
  sources: { from: string; backup: string }[];
  files: Record<string, MigrationFileEntry>;
}

function isNonEmptyDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory() && fs.readdirSync(p).length > 0;
  } catch {
    return false;
  }
}

function isNonEmptyFile(p: string): boolean {
  try {
    const s = fs.statSync(p);
    return s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}

function sha256File(p: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

/** 递归列出目录下所有文件的相对路径（posix 分隔）→ {size, sha256}。 */
export function treeManifest(root: string): Record<string, MigrationFileEntry> {
  const out: Record<string, MigrationFileEntry> = {};
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const rel = path.relative(root, full).split(path.sep).join('/');
        out[rel] = { size: fs.statSync(full).size, sha: sha256File(full) };
      }
    }
  };
  if (fs.existsSync(root)) {
    walk(root);
  }
  return out;
}

function copyDirInto(from: string, to: string): void {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDirInto(src, dst);
    } else if (entry.isFile()) {
      fs.copyFileSync(src, dst);
    }
  }
}

/**
 * 探测旧数据。纯函数、只读、不写任何东西。
 *
 * 判定：
 * - `~/.ordo` 非空且存在「旧 db + ordo.db」并存 → MERGE_REQUIRED（待用户裁决，不合并）
 * - `~/.ordo` 非空且另有外部旧根/原地旧文件 → ABORT（中止，不覆盖）
 * - `~/.ordo` 非空、无旧数据 → ALREADY_NEW
 * - `~/.ordo` 为空/不存在、有外部旧根 → MIGRATE
 * - 都没有 → FRESH
 */
export function detectLegacyData(homeDir: string, appDataDir: string): MigrationDetection {
  const ordoDir = path.join(homeDir, '.ordo');
  const legacy: LegacyLocation[] = [];
  const reasons: string[] = [];

  const appdata = path.join(appDataDir, 'agent-project-manager');
  if (isNonEmptyDir(appdata)) {
    legacy.push({ kind: 'appdata', path: appdata });
    reasons.push('检测到 %APPDATA%/agent-project-manager（v0.6.1 及更早）');
  }
  const apm = path.join(homeDir, '.apm');
  if (isNonEmptyDir(apm)) {
    legacy.push({ kind: 'home-apm', path: apm });
    reasons.push('检测到 ~/.apm（Ordo 改名之前）');
  }
  const docsRoot = path.join(homeDir, 'agent-project-manager');
  for (const sub of ['documents', 'docs'] as const) {
    const p = path.join(docsRoot, sub);
    if (isNonEmptyDir(p)) {
      legacy.push({ kind: sub, path: p });
      reasons.push(`检测到文档库 ~/agent-project-manager/${sub}`);
    }
  }

  const inPlaceLeftovers: string[] = [];
  const dbApm = path.join(ordoDir, 'data', 'apm.db');
  const dbOldName = path.join(ordoDir, 'data', 'agent-project-manager.db');
  const dbNew = path.join(ordoDir, 'data', 'ordo.db');
  if (isNonEmptyFile(dbApm)) inPlaceLeftovers.push('data/apm.db');
  if (isNonEmptyFile(dbOldName)) inPlaceLeftovers.push('data/agent-project-manager.db');
  if (isNonEmptyFile(path.join(ordoDir, 'apm-config.json'))) inPlaceLeftovers.push('apm-config.json');
  if (isNonEmptyDir(path.join(ordoDir, '.apm-backups'))) inPlaceLeftovers.push('.apm-backups');

  const ordoNonEmpty = isNonEmptyDir(ordoDir);
  const hasLegacy = legacy.length > 0;
  const hasDbMergeCase =
    (isNonEmptyFile(dbApm) || isNonEmptyFile(dbOldName)) && isNonEmptyFile(dbNew);

  if (ordoNonEmpty) {
    if (hasDbMergeCase) {
      reasons.push('~/.ordo 内旧 db 与 data/ordo.db 并存，需用户裁决合并策略（未实现）');
      return { state: 'MERGE_REQUIRED', ordoDir, legacy, inPlaceLeftovers, reasons };
    }
    if (hasLegacy || inPlaceLeftovers.length > 0) {
      reasons.push('~/.ordo 已有非空数据且存在旧数据，中止不合并覆盖');
      return { state: 'ABORT', ordoDir, legacy, inPlaceLeftovers, reasons };
    }
    return { state: 'ALREADY_NEW', ordoDir, legacy, inPlaceLeftovers, reasons };
  }
  if (hasLegacy) {
    reasons.push('~/.ordo 不存在或为空，存在外部旧数据，需迁移');
    return { state: 'MIGRATE', ordoDir, legacy, inPlaceLeftovers, reasons };
  }
  reasons.push('无旧数据、无 ~/.ordo 数据，全新安装');
  return { state: 'FRESH', ordoDir, legacy, inPlaceLeftovers, reasons };
}

/** 旧根 → `~/.ordo` 下的目标子目录（appdata / ~/.apm 顶层合并到 ~/.ordo；文档库进同名子目录）。 */
function targetSubdirFor(kind: LegacyKind): string {
  switch (kind) {
    case 'appdata':
    case 'home-apm':
      return '';
    case 'documents':
      return 'documents';
    case 'docs':
      return 'docs';
  }
}

/**
 * 执行迁移：复制（非移动）到 `~/.ordo`，先整根备份、逐文件 sha256 校验，成功后把旧根改名
 * `*.migrated.bak` 留档。只处理 MIGRATE 态；MERGE_REQUIRED / ABORT 一律抛错拒绝执行。
 */
export function migrateLegacyData(
  detection: MigrationDetection,
  timeStamp: string,
): MigrationManifest {
  if (detection.state !== 'MIGRATE') {
    throw new Error(`拒绝迁移：当前状态 ${detection.state}（仅 MIGRATE 可执行，绝不覆盖既有数据）`);
  }
  const { ordoDir } = detection;
  if (isNonEmptyDir(ordoDir)) {
    throw new Error('拒绝迁移：~/.ordo 已存在非空数据');
  }
  const backupDir = `${ordoDir}-migrate-backup-${timeStamp}`;
  fs.mkdirSync(backupDir, { recursive: true });

  const sources: MigrationManifest['sources'] = [];
  for (const loc of detection.legacy) {
    const label = `${loc.kind}-${path.basename(loc.path)}`;
    const backup = path.join(backupDir, label);
    copyDirInto(loc.path, backup);
    sources.push({ from: loc.path, backup });
  }

  fs.mkdirSync(ordoDir, { recursive: true });
  for (const loc of detection.legacy) {
    const sub = targetSubdirFor(loc.kind);
    const target = sub ? path.join(ordoDir, sub) : ordoDir;
    copyDirInto(loc.path, target);
  }

  const files = treeManifest(ordoDir);

  // 校验：每个源备份文件都必须在目标出现且 sha256 一致
  for (const src of sources) {
    const srcManifest = treeManifest(src.backup);
    for (const [rel, meta] of Object.entries(srcManifest)) {
      const kind = detection.legacy.find((l) => l.path === src.from)?.kind;
      const sub = kind ? targetSubdirFor(kind) : '';
      const relTarget = sub ? path.join(ordoDir, sub, rel) : path.join(ordoDir, rel);
      if (!fs.existsSync(relTarget)) {
        throw new Error(`迁移校验失败：目标缺失 ${relTarget}`);
      }
      if (sha256File(relTarget) !== meta.sha) {
        throw new Error(`迁移校验失败：sha256 不一致 ${relTarget}`);
      }
    }
  }

  // 全部校验通过后，旧根改名留档（防重复迁移）
  for (const src of sources) {
    fs.renameSync(src.from, `${src.from}.migrated.bak`);
  }

  fs.writeFileSync(
    path.join(ordoDir, '.migrated-from.json'),
    JSON.stringify({ ts: timeStamp, sources: sources.map((s) => s.from) }, null, 2),
    'utf-8',
  );

  return { ts: timeStamp, ordoDir, backupDir, sources, files };
}

/** 回滚：删除本次新建的 `~/.ordo`，把 `*.migrated.bak` 改回原名。旧数据原样完好。 */
export function rollbackMigration(manifest: MigrationManifest): void {
  if (fs.existsSync(manifest.ordoDir)) {
    fs.rmSync(manifest.ordoDir, { recursive: true, force: true });
  }
  for (const src of manifest.sources) {
    const bak = `${src.from}.migrated.bak`;
    if (fs.existsSync(bak) && !fs.existsSync(src.from)) {
      fs.renameSync(bak, src.from);
    }
  }
}

// TODO(P0-2 merge)：两库并存（MERGE_REQUIRED）时的合并策略待用户裁决后再实现，
// 本模块当前只报告冲突、绝不合并或覆盖。
