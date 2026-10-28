/**
 * 构建工作区模板库（prisma/template.db）：
 * schema 全量建表 + 最小可登录种子（admin/password123 + 全局 admin 角色）。
 * 创建工作区时复制该文件为 data/ordo.db。
 *
 * 用法: pnpm build:template-db
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { buildBuiltinIssueTypes } from './builtin-issue-types';

const prismaDir = __dirname;
const templatePath = path.join(prismaDir, 'template.db');

for (const suffix of ['', '-wal', '-shm']) {
  const file = templatePath + suffix;
  if (fs.existsSync(file)) fs.rmSync(file);
}

console.log('→ prisma db push（schema 全量建表）…');
execSync('pnpm exec prisma db push --skip-generate --accept-data-loss', {
  cwd: path.resolve(prismaDir, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: 'file:' + templatePath.replace(/\\/g, '/'),
  },
});

console.log('→ 写入最小种子（admin/password123）…');
const prisma = new PrismaClient({
  datasources: { db: { url: 'file:' + templatePath.replace(/\\/g, '/') } },
});

async function seed() {
  const passwordHash = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      displayName: '管理员',
      email: 'admin@ordo.local',
      passwordHash,
      authProvider: 'local',
    },
  });
  const existingRole = await prisma.roleAssignment.findFirst({
    where: { userId: admin.id, scopeType: 'global', role: 'admin' },
  });
  if (!existingRole) {
    await prisma.roleAssignment.create({
      data: { userId: admin.id, scopeType: 'global', role: 'admin' },
    });
  }

  // 系统内置 AI 助理成员（小周）：新工作区开箱即有；禁删除守卫在 member.service
  await prisma.member.upsert({
    where: { handle: 'xiaozhou' },
    update: { metadata: { isSystemAssistant: true } },
    create: {
      type: 'ai_agent',
      shortId: 'az000000',
      handle: 'xiaozhou',
      displayName: '小周',
      title: 'AI 项目管理搭档',
      description: '系统内置的主 AI 助理，可查询与操作项目数据。',
      status: 'active',
      metadata: { isSystemAssistant: true },
    },
  });

  // 内置工单类型 task/bug（CAP-A-04）：isSystem 类型只可修改不可删除（守卫在 issue-type.service）；
  // bug 六字段 fieldSchema 与 issue-custom-fields.util BUILTIN_CUSTOM_FIELD_KEYS 对齐
  for (const issueType of buildBuiltinIssueTypes()) {
    await prisma.issueType.upsert({
      where: { key: issueType.key },
      update: {},
      create: issueType,
    });
  }
}

seed()
  .then(async () => {
    // WAL 持久化：journal_mode 是写入库头的持久属性，新建工作区逐字节复制
    // 模板即继承——此前模板库是 legacy DELETE 模式，全部工作区库因此跑在
    // 非 WAL 下（读写互斥 SQLITE_BUSY；备份「-wal sidecar 在用判定」永不命中，
    // 在用库被当静态库裸拷贝 → 撕裂备份）。
    // `PRAGMA journal_mode` / `wal_checkpoint` 都会返回结果行；Prisma 的
    // `$executeRawUnsafe` 明确拒绝「Execute returned results」（P2010），
    // SQLite 上必然失败——必须用 `$queryRawUnsafe` 执行（2026-10-28 CI 修复）。
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
    await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
    await prisma.$disconnect();
    // 断连合并后清残留 sidecar，避免把半格文件留在仓库
    for (const suffix of ['-wal', '-shm']) {
      const file = templatePath + suffix;
      if (fs.existsSync(file)) fs.rmSync(file);
    }
    const size = fs.statSync(templatePath).size;
    console.log(
      `✓ 模板库已生成（WAL）: ${templatePath} (${(size / 1024).toFixed(0)} KB)`,
    );
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
