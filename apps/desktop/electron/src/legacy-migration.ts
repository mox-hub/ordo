/**
 * P0-2 T1 旧数据迁移与旧库归档：探测（三态 + 冲突）→ 迁移 / 归档 → 回滚。
 *
 * 背景：Ordo 历史上有三代数据位置，当前 installer.nsh 只查 `~/.ordo`，`~/.apm` 或
 * `%APPDATA%/agent-project-manager` 的老用户升级上来会被误判「全新安装」→ 旧数据孤儿化。
 * 探测集合（4 类）：
 *   ① `%APPDATA%/agent-project-manager`      （v0.6.1 及更早，Electron userData）
 *   ② `~/.apm`                               （Ordo 改名之前）
 *   ③ `~/.ordo` 内旧文件名残留               （data/apm.db / data/agent-project-manager.db / .apm-backups / apm-config.json）
 *   ④ `~/agent-project-manager/{documents,docs}`（文档库默认值，代码至今未迁）
 *
 * 用户裁决（2026-11-04）：两库并存时**只保留 `data/ordo.db`**，`agent-project-manager.db`
 * 那批 AI/会话数据放弃使用；旧库**归档不改不删**（移入 `~/.ordo/.retired/` 并记录 sha256，可回滚）。
 * 因此不再有「人工合并」分支——旧库一律归档，正式数据源只认 `ordo.db`，且**绝不覆盖 `ordo.db`**。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type MigrationState =
  | 'FRESH'
  | 'ALREADY_NEW'
  | 'MIGRATE'
  | 'ARCHIVE_REQUIRED'
  | 'ABORT';

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

export interface ArchivedDb {
  from: string;
  to: string;
  size: number;
  sha: string;
}

export interface ArchiveManifest {
  ts: string;
  retired: ArchivedDb[];
}

export interface StartupResult {
  state: MigrationState;
  action: 'none' | 'migrated' | 'archived' | 'aborted';
  detail: string;
}

/** 归档子目录（不参与探测，避免二次归档）。 */
export const RETIRED_SUBDIR = '.retired';
const OLD_DB_RELPATHS = ['data/apm.db', 'data/agent-project-manager.db'];
const NEW_DB_RELPATH = 'data/ordo.db';

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
 * - `~/.ordo` 有 `data/ordo.db` 且另有旧 db 残留 → ARCHIVE_REQUIRED（归档旧库，保留 ordo.db）
 * - `~/.ordo` 非空且另有外部旧根 → ABORT（中止，不覆盖）
 * - `~/.ordo` 非空、无旧 db/外部旧根 → ALREADY_NEW（`.apm-backups`/`apm-config.json` 等无害残留不阻断）
 * - `~/.ordo` 为空/不存在、有外部旧根 → MIGRATE
 * - 都没有 → FRESH
 */
export function detectLegacyData(
  homeDir: string,
  appDataDir: string,
  ordoDirOverride?: string,
): MigrationDetection {
  const ordoDir = ordoDirOverride ?? path.join(homeDir, '.ordo');
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
  const hasOldDb = OLD_DB_RELPATHS.some((rel) => isNonEmptyFile(path.join(ordoDir, ...rel.split('/'))));
  for (const rel of OLD_DB_RELPATHS) {
    if (isNonEmptyFile(path.join(ordoDir, ...rel.split('/')))) inPlaceLeftovers.push(rel);
  }
  if (isNonEmptyFile(path.join(ordoDir, 'apm-config.json'))) inPlaceLeftovers.push('apm-config.json');
  if (isNonEmptyDir(path.join(ordoDir, '.apm-backups'))) inPlaceLeftovers.push('.apm-backups');

  const ordoNonEmpty = isNonEmptyDir(ordoDir);
  const hasOrdoDb = isNonEmptyFile(path.join(ordoDir, ...NEW_DB_RELPATH.split('/')));

  if (ordoNonEmpty) {
    if (hasOldDb && hasOrdoDb) {
      reasons.push('~/.ordo 内旧 db 与 data/ordo.db 并存：按用户裁决保留 ordo.db，旧库归档（不删）');
      return { state: 'ARCHIVE_REQUIRED', ordoDir, legacy, inPlaceLeftovers, reasons };
    }
    if (legacy.length > 0) {
      reasons.push('~/.ordo 已有非空数据且存在外部旧根，中止不合并覆盖');
      return { state: 'ABORT', ordoDir, legacy, inPlaceLeftovers, reasons };
    }
    return { state: 'ALREADY_NEW', ordoDir, legacy, inPlaceLeftovers, reasons };
  }
  if (legacy.length > 0) {
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
 * 迁移后归一：老用户数据里 db 可能叫 `apm.db` / `agent-project-manager.db`，而应用只认
 * `data/ordo.db`。当 `data/ordo.db` 不存在且恰有一个旧 db 时，把它改名为 `ordo.db`。
 * 已有 `ordo.db` 时绝不覆盖。
 */
function normalizeMigratedDb(ordoDir: string): void {
  const newDb = path.join(ordoDir, ...NEW_DB_RELPATH.split('/'));
  if (fs.existsSync(newDb)) return;
  const olds = OLD_DB_RELPATHS.map((rel) => path.join(ordoDir, ...rel.split('/'))).filter((p) =>
    isNonEmptyFile(p),
  );
  if (olds.length === 1) {
    fs.renameSync(olds[0], newDb);
  }
}

/**
 * 执行迁移：复制（非移动）到 `~/.ordo`，先整根备份、逐文件 sha256 校验，成功后把旧根改名
 * `*.migrated.bak` 留档，并归一 db 文件名。只处理 MIGRATE 态；其它态一律抛错拒绝。
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
    throw new Error('拒绝迁移：目标数据目录已存在非空数据');
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
  // 校验：每个源备份文件都必须在目标出现且 sha256 一致（在 db 归一改名前按原始文件名校验）
  for (const src of sources) {
    const kind = detection.legacy.find((l) => l.path === src.from)?.kind;
    const sub = kind ? targetSubdirFor(kind) : '';
    for (const [rel, meta] of Object.entries(treeManifest(src.backup))) {
      const relTarget = sub ? path.join(ordoDir, sub, rel) : path.join(ordoDir, rel);
      if (!fs.existsSync(relTarget)) {
        throw new Error(`迁移校验失败：目标缺失 ${relTarget}`);
      }
      if (sha256File(relTarget) !== meta.sha) {
        throw new Error(`迁移校验失败：sha256 不一致 ${relTarget}`);
      }
    }
  }

  // 校验通过后再归一 db 文件名（apm.db / agent-project-manager.db → ordo.db）
  normalizeMigratedDb(ordoDir);
  const files = treeManifest(ordoDir);

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

/** 回滚迁移：删除本次新建的数据目录，把 `*.migrated.bak` 改回原名。旧数据原样完好。 */
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

/**
 * 归档旧库（用户裁决 B）：把 `~/.ordo` 内的旧 db 移入 `~/.ordo/.retired/`，
 * `*.retired-<ts>` 后缀，记录 sha256/size。**不删除、不碰 `data/ordo.db`**。
 */
export function archiveLegacyDatabases(
  detection: MigrationDetection,
  timeStamp: string,
): ArchiveManifest {
  if (detection.state !== 'ARCHIVE_REQUIRED') {
    throw new Error(`拒绝归档：当前状态 ${detection.state}`);
  }
  const retiredDir = path.join(detection.ordoDir, RETIRED_SUBDIR);
  fs.mkdirSync(retiredDir, { recursive: true });
  const retired: ArchivedDb[] = [];
  for (const rel of detection.inPlaceLeftovers) {
    if (!OLD_DB_RELPATHS.includes(rel)) continue;
    const from = path.join(detection.ordoDir, ...rel.split('/'));
    if (!isNonEmptyFile(from)) continue;
    const sha = sha256File(from);
    const size = fs.statSync(from).size;
    const to = path.join(retiredDir, `${path.basename(from)}.retired-${timeStamp}`);
    fs.renameSync(from, to);
    retired.push({ from, to, size, sha });
  }
  return { ts: timeStamp, retired };
}

/** 回滚归档：把 `.retired` 里的旧库移回原位（仅当原位不存在时）。 */
export function restoreArchivedDatabases(manifest: ArchiveManifest): void {
  for (const item of manifest.retired) {
    if (fs.existsSync(item.to) && !fs.existsSync(item.from)) {
      fs.renameSync(item.to, item.from);
    }
  }
}

/**
 * 启动流程调用入口：探测后按状态动作。MIGRATE 迁移、ARCHIVE_REQUIRED 归档旧库、
 * ABORT 仅告警不动、其余不动作。任何异常向上抛，由调用方决定是否阻断启动。
 */
export function runLegacyDataStartup(params: {
  homeDir: string;
  appDataDir: string;
  ordoDir: string;
  timeStamp: string;
}): StartupResult {
  const det = detectLegacyData(params.homeDir, params.appDataDir, params.ordoDir);
  if (det.state === 'MIGRATE') {
    migrateLegacyData(det, params.timeStamp);
    return { state: det.state, action: 'migrated', detail: det.reasons.join('；') };
  }
  if (det.state === 'ARCHIVE_REQUIRED') {
    const m = archiveLegacyDatabases(det, params.timeStamp);
    return {
      state: det.state,
      action: 'archived',
      detail: m.retired.map((r) => `${r.from} → ${r.to} (sha256 ${r.sha})`).join('；'),
    };
  }
  if (det.state === 'ABORT') {
    return { state: det.state, action: 'aborted', detail: det.reasons.join('；') };
  }
  return { state: det.state, action: 'none', detail: det.reasons.join('；') };
}
