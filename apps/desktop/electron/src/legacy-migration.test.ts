import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  detectLegacyData,
  migrateLegacyData,
  rollbackMigration,
  treeManifest,
} from './legacy-migration';

const roots: string[] = [];
function scene(): { home: string; appdata: string } {
  const root = mkdtempSync(path.join(tmpdir(), 'ordo-legacy-'));
  roots.push(root);
  const home = path.join(root, 'home');
  const appdata = path.join(root, 'appdata');
  mkdirSync(home, { recursive: true });
  mkdirSync(appdata, { recursive: true });
  return { home, appdata };
}
function put(p: string, data = 'x'): void {
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, data, 'utf-8');
}
afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

describe('detectLegacyData 三态 + 冲突', () => {
  it('全新装 → FRESH', () => {
    const { home, appdata } = scene();
    const d = detectLegacyData(home, appdata);
    expect(d.state).toBe('FRESH');
  });

  it('只有 ~/.ordo 新数据 → ALREADY_NEW', () => {
    const { home, appdata } = scene();
    put(path.join(home, '.ordo', 'data', 'ordo.db'), 'NEW');
    expect(detectLegacyData(home, appdata).state).toBe('ALREADY_NEW');
  });

  it('~/.apm 老数据 → MIGRATE', () => {
    const { home, appdata } = scene();
    put(path.join(home, '.apm', 'data', 'apm.db'), 'OLD');
    const d = detectLegacyData(home, appdata);
    expect(d.state).toBe('MIGRATE');
    expect(d.legacy.map((l) => l.kind)).toContain('home-apm');
  });

  it('%APPDATA%/agent-project-manager 老数据 → MIGRATE', () => {
    const { home, appdata } = scene();
    put(path.join(appdata, 'agent-project-manager', 'data', 'agent-project-manager.db'), 'OLD');
    expect(detectLegacyData(home, appdata).state).toBe('MIGRATE');
  });

  it('文档库 ~/agent-project-manager/documents → MIGRATE', () => {
    const { home, appdata } = scene();
    put(path.join(home, 'agent-project-manager', 'documents', 'a.md'), 'DOC');
    const d = detectLegacyData(home, appdata);
    expect(d.state).toBe('MIGRATE');
    expect(d.legacy.map((l) => l.kind)).toContain('documents');
  });

  it('~/.ordo 非空 + 外部 legacy → ABORT（不合并覆盖）', () => {
    const { home, appdata } = scene();
    put(path.join(home, '.ordo', 'secrets.json'), 'SECRET');
    put(path.join(home, '.apm', 'data', 'apm.db'), 'OLD');
    expect(detectLegacyData(home, appdata).state).toBe('ABORT');
  });

  it('两库并存（旧 db + ordo.db）→ MERGE_REQUIRED', () => {
    const { home, appdata } = scene();
    put(path.join(home, '.ordo', 'data', 'agent-project-manager.db'), 'OLDDB');
    put(path.join(home, '.ordo', 'data', 'ordo.db'), 'NEWDB');
    const d = detectLegacyData(home, appdata);
    expect(d.state).toBe('MERGE_REQUIRED');
    expect(d.inPlaceLeftovers).toContain('data/agent-project-manager.db');
  });
});

describe('migrateLegacyData + rollbackMigration', () => {
  it('MIGRATE：复制 + 备份 + sha 校验 + .migrated.bak；回滚后数据 sha 不变', () => {
    const { home, appdata } = scene();
    const srcDb = path.join(home, '.apm', 'data', 'apm.db');
    put(srcDb, 'DBDATA'.repeat(200));
    put(path.join(home, '.apm', 'apm-config.json'), '{"a":1}');
    const beforeSha = treeManifest(path.join(home, '.apm'));

    const d = detectLegacyData(home, appdata);
    const manifest = migrateLegacyData(d, '20261104-000000');

    // 复制到位
    expect(readFileSync(path.join(home, '.ordo', 'data', 'apm.db'), 'utf-8')).toBe('DBDATA'.repeat(200));
    // 备份目录存在且含源文件
    expect(treeManifest(manifest.backupDir)).toBeTruthy();
    // 源已改名为 .migrated.bak
    expect(treeManifest(path.join(home, '.apm.migrated.bak'))).toEqual(beforeSha);
    expect(manifest.files['data/apm.db']).toBeTruthy();

    rollbackMigration(manifest);
    // ~/.ordo 已删，旧根恢复原名、内容 sha 不变
    expect(treeManifest(path.join(home, '.apm'))).toEqual(beforeSha);
  });

  it('非 MIGRATE 态拒绝执行（ABORT 不覆盖）', () => {
    const { home, appdata } = scene();
    put(path.join(home, '.ordo', 'secrets.json'), 'SECRET');
    put(path.join(home, '.apm', 'data', 'apm.db'), 'OLD');
    const d = detectLegacyData(home, appdata);
    const before = treeManifest(path.join(home, '.ordo'));
    expect(() => migrateLegacyData(d, 'x')).toThrow();
    expect(treeManifest(path.join(home, '.ordo'))).toEqual(before);
  });

  it('MERGE_REQUIRED 态拒绝执行', () => {
    const { home, appdata } = scene();
    put(path.join(home, '.ordo', 'data', 'agent-project-manager.db'), 'OLDDB');
    put(path.join(home, '.ordo', 'data', 'ordo.db'), 'NEWDB');
    const d = detectLegacyData(home, appdata);
    expect(() => migrateLegacyData(d, 'x')).toThrow();
  });

  it('文档库迁移进 ~/.ordo/documents', () => {
    const { home, appdata } = scene();
    put(path.join(home, 'agent-project-manager', 'documents', 'a.md'), 'DOC');
    const d = detectLegacyData(home, appdata);
    migrateLegacyData(d, '20261104-000001');
    expect(readFileSync(path.join(home, '.ordo', 'documents', 'a.md'), 'utf-8')).toBe('DOC');
  });
});
