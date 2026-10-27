/**
 * 存量文档 → 产物引用行回填脚本（CAP-A-32 批一一次性工具）。
 *
 * 背景：产物 kind=document 引用行由 document.created/updated/deleted 事件增量同步，
 * 存量文档（事件通道上线前创建的）不会自动登记。本脚本幂等回填：
 * 非软删且挂项目的文档 → 创建/对齐引用行；其余状态（软删/未挂项目）→ 按现值对齐或跳过。
 *
 * 与 ArtifactRegistryService.syncDocument 同一口径（脚本无 Nest 容器，直连 PrismaClient
 * 复刻 upsert 逻辑，逻辑变更须两处同步）。
 *
 * 用法（cwd=apps/server，DATABASE_URL=file:./dev.db 指向目标工作区库）：
 *   pnpm exec tsx scripts/backfill-document-artifacts.ts --dry-run  # 只盘点不写
 *   pnpm exec tsx scripts/backfill-document-artifacts.ts            # 回填
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── 1. 手动加载 apps/server/.env（脚本无 Nest bootstrap）──
const envPath = resolve(__dirname, '../.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = (m[2] ?? '').replace(/^"(.*)"$/, '$1');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL 未设置（须在 apps/server/.env）');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const documents = await prisma.document.findMany({
      select: { id: true, title: true, projectId: true, isDeleted: true },
    });
    const existing = await prisma.artifact.findMany({
      where: { kind: 'document' },
      select: { id: true, documentId: true, name: true },
    });
    const existingByDocId = new Map(existing.map((a) => [a.documentId, a]));

    let created = 0;
    let synced = 0;
    let skipped = 0;

    for (const doc of documents) {
      const known = existingByDocId.get(doc.id);
      if (known) {
        if (known.name !== doc.title) {
          if (!dryRun) {
            await prisma.artifact.update({
              where: { id: known.id },
              data: {
                name: doc.title,
                isDeleted: doc.isDeleted,
                deletedAt: doc.isDeleted ? new Date() : null,
              },
            });
          }
          synced++;
        }
        continue;
      }
      if (doc.isDeleted || !doc.projectId) {
        skipped++;
        continue;
      }
      if (!dryRun) {
        await prisma.artifact.create({
          data: {
            projectId: doc.projectId,
            kind: 'document',
            name: doc.title,
            mimeType: 'text/markdown',
            documentId: doc.id,
            createdBy: 'system',
          },
        });
      }
      created++;
    }

    console.log(
      `盘点 ${documents.length} 篇文档：新建引用行 ${created}，名称同步 ${synced}，跳过（软删/未挂项目）${skipped}${dryRun ? '（dry-run 未写库）' : ''}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
