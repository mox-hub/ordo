import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  archiveLegacyDatabases,
  detectLegacyData,
  migrateLegacyData,
  restoreArchivedDatabases,
  rollbackMigration,
  runLegacyDataStartup,
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

describe('detectLegacyData 三态 + 归档态', () => {
  it('全新装 → FRESH', () => {
    const { home, appdata } = scene();
    expect(detectLegacyData(home, appdata).state).toBe('FRESH');
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
    expect(detectLegacyData(home, appdata).state).toBe('MIGRATE');
  });

  it('~/.ordo 非空 + 外部 legacy → ABORT（不合并覆盖）', () => {
    const { home, appdata } = scene();
    put(path.join(home, '.ordo', 'secrets.json'), 'SECRET');
    put(path.join(home, '.apm', 'data', 'apm.db'), 'OLD');
    expect(detectLegacyData(home, appdata).state).toBe('ABORT');
  });

  it('旧 db + ordo.db 并存 → ARCHIVE_REQUIRED（保留 ordo.db，归档旧库）', () => {
    const { home, appdata } = scene();
    put(path.join(home, '.ordo', 'data', 'agent-project-manager.db'), 'OLDDB');
    put(path.join(home, '.ordo', 'data', 'ordo.db'), 'NEWDB');
    const d = detectLegacyData(home, appdata);
    expect(d.state).toBe('ARCHIVE_REQUIRED');
    expect(d.inPlaceLeftovers).toContain('data/agent-project-manager.db');
  });

  it('ordoDir 覆盖参数生效（测试/CI 隔离）', () => {
    const { home, appdata } = scene();
    const custom = path.join(home, 'custom-data');
    put(path.join(custom, 'data', 'agent-project-manager.db'), 'OLDDB');
    put(path.join(custom, 'data', 'ordo.db'), 'NEWDB');
    expect(detectLegacyData(home, appdata, custom).state).toBe('ARCHIVE_REQUIRED');
    expect(detectLegacyData(home, appdata).state).toBe('FRESH');
  });
});

describe('migrateLegacyData + rollbackMigration', () => {
  it('MIGRATE：复制 + 备份 + sha 校验 + .migrated.bak；回滚后数据 sha 不变', () => {
    const { home, appdata } = scene();
    put(path.join(home, '.apm', 'data', 'apm.db'), 'DBDATA'.repeat(200));
    put(path.join(home, '.apm', 'apm-config.json'), '{"a":1}');
    const beforeSha = treeManifest(path.join(home, '.apm'));

    const d = detectLegacyData(home, appdata);
    const manifest = migrateLegacyData(d, '20261104-000000');

    // 归一：apm.db → ordo.db（应用只认 ordo.db）
    expect(readFileSync(path.join(home, '.ordo', 'data', 'ordo.db'), 'utf-8')).toBe('DBDATA'.repeat(200));
    expect(treeManifest(path.join(home, '.apm.migrated.bak'))).toEqual(beforeSha);
    expect(manifest.files['data/ordo.db']).toBeTruthy();

    rollbackMigration(manifest);
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

  it('文档库迁移进 ~/.ordo/documents', () => {
    const { home, appdata } = scene();
    put(path.join(home, 'agent-project-manager', 'documents', 'a.md'), 'DOC');
    migrateLegacyData(detectLegacyData(home, appdata), '20261104-000001');
    expect(readFileSync(path.join(home, '.ordo', 'documents', 'a.md'), 'utf-8')).toBe('DOC');
  });
});

describe('archiveLegacyDatabases（保留 ordo.db）', () => {
  it('旧库移入 .retired 并记录 sha；ordo.db 尺寸不变；可回滚', () => {
    const { home, appdata } = scene();
    const oldDb = path.join(home, '.ordo', 'data', 'agent-project-manager.db');
    const newDb = path.join(home, '.ordo', 'data', 'ordo.db');
    put(oldDb, 'OLDDB'.repeat(100));
    put(newDb, 'NEWDB'.repeat(100));
    const newStat = statSync(newDb);

    const det = detectLegacyData(home, appdata);
    const m = archiveLegacyDatabases(det, '20261104-000002');

    expect(m.retired).toHaveLength(1);
    expect(m.retired[0].sha).toMatch(/^[0-9a-f]{64}$/);
    expect(treeManifest(path.join(home, '.ordo', '.retired'))).toBeTruthy();
    // 旧库已移走、ordo.db 未动
    expect(treeManifest(path.join(home, '.ordo', '.retired'))['agent-project-manager.db.retired-20261104-000002']).toBeTruthy();
    const after = statSync(newDb);
    expect(after.size).toBe(newStat.size);
    expect(readFileSync(newDb, 'utf-8')).toBe('NEWDB'.repeat(100));

    restoreArchivedDatabases(m);
    expect(readFileSync(oldDb, 'utf-8')).toBe('OLDDB'.repeat(100));
  });

  it('非 ARCHIVE_REQUIRED 态拒绝归档', () => {
    const { home, appdata } = scene();
    put(path.join(home, '.ordo', 'data', 'ordo.db'), 'NEW');
    expect(() => archiveLegacyDatabases(detectLegacyData(home, appdata), 'x')).toThrow();
  });
});

describe('runLegacyDataStartup', () => {
  it('ARCHIVE_REQUIRED 时自动归档', () => {
    const { home, appdata } = scene();
    put(path.join(home, '.ordo', 'data', 'agent-project-manager.db'), 'OLD');
    put(path.join(home, '.ordo', 'data', 'ordo.db'), 'NEW');
    const r = runLegacyDataStartup({
      homeDir: home,
      appDataDir: appdata,
      ordoDir: path.join(home, '.ordo'),
      timeStamp: '20261104-1',
    });
    expect(r.action).toBe('archived');
    expect(r.state).toBe('ARCHIVE_REQUIRED');
  });

  it('ALREADY_NEW 不动作', () => {
    const { home, appdata } = scene();
    put(path.join(home, '.ordo', 'data', 'ordo.db'), 'NEW');
    const r = runLegacyDataStartup({
      homeDir: home,
      appDataDir: appdata,
      ordoDir: path.join(home, '.ordo'),
      timeStamp: 't',
    });
    expect(r.action).toBe('none');
  });
});
