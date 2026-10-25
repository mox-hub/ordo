/**
 * 工作区注册表（纯 fs 工具，供数据层与 workspace 模块共用，避免 Nest 循环依赖）。
 *
 * 工作区 = 用户指定目录（内含 data/ordo.db、uploads、logs 与 workspace.json），
 * 注册表文件记录全部工作区。id 为 'default' 的条目指向 DATABASE_URL 本身。
 */
import * as fs from 'fs';
import * as path from 'path';

export interface WorkspaceRecord {
  id: string;
  name: string;
  /** 工作区根目录；default 工作区为 null（直接使用 DATABASE_URL） */
  path: string | null;
  isDefault?: boolean;
  createdAt: string;
  lastOpenedAt?: string;
}

export const DEFAULT_WORKSPACE_ID = 'default';

function registryPath(): string {
  return path.resolve(process.env.WORKSPACE_REGISTRY_PATH ?? 'workspaces.json');
}

/** 注册表文件绝对路径（备份/恢复需要把快照写回原位，CAP-A-03） */
export function registryFilePath(): string {
  return registryPath();
}

/**
 * SQLite 库文件 → file: URL（与 resolveWorkspaceDbUrl 内部同一格式）。
 * 备份/恢复需要拼出与数据层连接池同键的 URL 才能命中失效，勿自行拼接。
 */
export function dbFileUrl(p: string): string {
  return toFileUrl(p);
}

function templateDbPath(): string {
  return path.resolve(
    process.env.WORKSPACE_TEMPLATE_PATH ?? 'prisma/template.db',
  );
}

function toFileUrl(p: string): string {
  return 'file:' + p.replace(/\\/g, '/');
}

/**
 * 原子写：临时文件 + 同目录 rename（Node 在 Windows 上以
 * MOVEFILE_REPLACE_EXISTING 语义 rename，可覆盖已存在目标）。
 * 直写中途崩溃会留下截断文件——workspaces.json 截断后 listWorkspaces
 * 静默返回空数组，用户视角等于全部工作区消失。
 */
function atomicWriteFile(target: string, data: string): void {
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, data, 'utf-8');
  fs.renameSync(tmp, target);
}

const SQLITE_HEADER_BYTES = Buffer.from('SQLite format 3\0', 'binary');

/** 校验文件头是 SQLite magic（半截复制产物会被拒之门外） */
function isValidSqliteFile(p: string): boolean {
  try {
    const fd = fs.openSync(p, 'r');
    try {
      const buf = Buffer.alloc(SQLITE_HEADER_BYTES.length);
      const read = fs.readSync(fd, buf, 0, buf.length, 0);
      return read === buf.length && buf.equals(SQLITE_HEADER_BYTES);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return false;
  }
}

/** 注册表进程内缓存：热路径（每次 Prisma 属性访问）此前每跳都 readFileSync+parse */
const REGISTRY_CACHE_TTL_MS = 1_000;
let registryCache: {
  records: WorkspaceRecord[];
  mtimeMs: number;
  checkedAt: number;
} | null = null;

export function listWorkspaces(): WorkspaceRecord[] {
  const file = registryPath();
  // TTL 内零 IO：注册表变更是用户级低频事件，外部改写靠 mtime 失效兜底
  if (
    registryCache &&
    Date.now() - registryCache.checkedAt < REGISTRY_CACHE_TTL_MS
  ) {
    return registryCache.records;
  }
  let mtimeMs = -1;
  try {
    mtimeMs = fs.statSync(file).mtimeMs;
  } catch {
    mtimeMs = -1;
  }
  if (registryCache && mtimeMs === registryCache.mtimeMs) {
    registryCache.checkedAt = Date.now();
    return registryCache.records;
  }

  let records: WorkspaceRecord[] = [];
  try {
    records = JSON.parse(fs.readFileSync(file, 'utf-8')) as WorkspaceRecord[];
    if (!Array.isArray(records)) records = [];
  } catch {
    records = [];
  }

  // 始终保证 default 工作区存在
  if (!records.some((r) => r.id === DEFAULT_WORKSPACE_ID)) {
    records.unshift({
      id: DEFAULT_WORKSPACE_ID,
      name: '默认工作区',
      path: null,
      isDefault: true,
      createdAt: new Date().toISOString(),
    });
    persist(records);
  }
  registryCache = { records, mtimeMs, checkedAt: Date.now() };
  return records;
}

export function findWorkspace(id: string): WorkspaceRecord | null {
  return listWorkspaces().find((r) => r.id === id) ?? null;
}

/** 绕过 persist() 的带外写（如备份恢复 copyFileSync 覆盖注册表）后显式失效缓存 */
export function invalidateRegistryCache(): void {
  registryCache = null;
}

/** 解析工作区对应的 SQLite URL；default 返回 DATABASE_URL，未初始化的工作区返回 null */
export function resolveWorkspaceDbUrl(id: string): string | null {
  if (!id || id === DEFAULT_WORKSPACE_ID) {
    return process.env.DATABASE_URL ?? null;
  }
  const ws = findWorkspace(id);
  if (!ws?.path) return null;
  const db = path.join(ws.path, 'data', 'ordo.db');
  return fs.existsSync(db) ? toFileUrl(db) : null;
}

export class WorkspaceCreateError extends Error {}

/** 创建并初始化新工作区：校验路径 → 建目录 → 复制模板库 → 写注册表 */
export function createWorkspace(input: {
  name: string;
  path: string;
}): WorkspaceRecord {
  const name = input.name.trim();
  const rawPath = input.path.trim();
  const dir = path.resolve(rawPath);

  if (!name) throw new WorkspaceCreateError('工作区名称不能为空');
  if (!path.isAbsolute(rawPath)) {
    throw new WorkspaceCreateError('必须使用绝对路径指定工作区位置');
  }
  const template = templateDbPath();
  if (!fs.existsSync(template)) {
    throw new WorkspaceCreateError(
      `模板库缺失（${template}），请先运行 pnpm build:template-db`,
    );
  }

  if (fs.existsSync(dir)) {
    const entries = fs.readdirSync(dir);
    const stray = entries.filter(
      (e) => !['data', 'uploads', 'logs', 'workspace.json'].includes(e),
    );
    if (stray.length > 0) {
      throw new WorkspaceCreateError(
        `目标目录非空（含 ${stray.slice(0, 3).join(', ')} 等），请选择空目录`,
      );
    }
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'uploads'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'logs'), { recursive: true });

  const targetDb = path.join(dir, 'data', 'ordo.db');
  if (!fs.existsSync(targetDb)) {
    // T7 原子复制：直写目标中途崩溃会留下半库，而 existsSync 守卫会让
    // 同目录重试把残库当有效库注册（建连报 file is not a database）——
    // 先写临时文件、校验头、再 rename 原子生效。
    const tmpDb = `${targetDb}.tmp-${process.pid}-${Date.now()}`;
    fs.copyFileSync(template, tmpDb);
    if (!isValidSqliteFile(tmpDb)) {
      fs.rmSync(tmpDb, { force: true });
      throw new WorkspaceCreateError(
        '模板库复制校验失败（文件头非 SQLite），已中止创建',
      );
    }
    fs.renameSync(tmpDb, targetDb);
  }
  fs.writeFileSync(
    path.join(dir, 'workspace.json'),
    JSON.stringify({ name, createdAt: new Date().toISOString() }, null, 2),
    'utf-8',
  );

  const records = listWorkspaces();
  const id = `ws-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const record: WorkspaceRecord = {
    id,
    name,
    path: dir,
    createdAt: new Date().toISOString(),
  };
  records.push(record);
  persist(records);
  return record;
}

export function activateWorkspace(id: string): WorkspaceRecord | null {
  const records = listWorkspaces();
  const hit = records.find((r) => r.id === id);
  if (!hit) return null;
  hit.lastOpenedAt = new Date().toISOString();
  persist(records);
  return hit;
}

function persist(records: WorkspaceRecord[]) {
  // T7 原子写：直写截断 → listWorkspaces 静默返回空数组（全部工作区「消失」）
  atomicWriteFile(registryPath(), JSON.stringify(records, null, 2));
  registryCache = null; // 写后失效进程内缓存，下次读按新 mtime 重建
}
