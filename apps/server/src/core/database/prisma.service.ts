import {
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as fs from 'fs';
import { LoggerService } from '../logger/logger.service';

// IMPORTANT:
// Prisma decides engine strategy when @prisma/client is loaded.
// Force local engine BEFORE loading PrismaClient to avoid Data Proxy mode
// when global env accidentally sets PRISMA_CLIENT_ENGINE_TYPE=dataproxy.
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
import { PrismaClient } from '@prisma/client';
import { getCurrentWorkspaceId } from './workspace-context';
import {
  DEFAULT_WORKSPACE_ID,
  findWorkspace,
  resolveWorkspaceDbUrl,
} from './workspace-registry.util';

/** SQLite 连接参数：单连接池（默认 CPU×2+1 在 SQLite 单写者下互斥放大 SQLITE_BUSY） */
export function withSqliteConnectionParams(url: string): string {
  if (!url.startsWith('file:')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=1`;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly logger: LoggerService) {
    const baseDatasources = process.env.DATABASE_URL
      ? {
          db: { url: withSqliteConnectionParams(process.env.DATABASE_URL) },
        }
      : undefined;
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      ...(baseDatasources ? { datasources: baseDatasources } : {}),
    });

    this.logger.setContext('Prisma');

    // Prisma query 日志默认关闭：每条 SQL 都经 sanitize + JSON 序列化写入
    // combined.log，高轮询场景下是 GC/CPU 大户。需要 SQL 观测时设
    // PRISMA_QUERY_LOG=1 或 CONSOLE_LOG_LEVEL=debug 重新挂载。
    const queryLogEnabled =
      process.env.PRISMA_QUERY_LOG === '1' ||
      process.env.CONSOLE_LOG_LEVEL === 'debug';
    if (queryLogEnabled) {
      this.$on('query' as never, (e: any) => {
        this.logger.debug('Prisma Query', {
          query: e.query,
          duration: e.duration,
        });
      });
    }

    this.$on('error' as never, (e: any) => {
      this.logger.error('Prisma Error', e?.stack ?? String(e));
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      // 默认库 WAL 收敛（幂等）：模板修复前创建的存量库可能仍是 legacy
      // DELETE 模式（读写互斥 + 备份撕裂备份根因）；打包链路另有启动期
      // sweep（startup-migrations），此处兜 dev 与早于编排的场景。
      try {
        const mode = (await this.$queryRawUnsafe<
          Array<{
            journal_mode?: string;
          }>
        >('PRAGMA journal_mode=WAL;')) as Array<{ journal_mode?: string }>;
        const current = mode?.[0]?.journal_mode?.toLowerCase();
        if (current && current !== 'wal') {
          this.logger.warn(
            `Default database journal_mode=${current}（WAL 切换未生效，文件可能被外部占用）`,
          );
        }
      } catch (e) {
        this.logger.warn(
          `Default database WAL enable failed: ${(e as Error).message}`,
        );
      }
      await this.repairInvalidSqliteJsonValues();
      this.logger.log('Database connected');
    } catch (err: any) {
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  private async repairInvalidSqliteJsonValues() {
    const databaseUrl = process.env.DATABASE_URL ?? '';
    if (!databaseUrl.startsWith('file:')) {
      return;
    }

    // 修复过的库落 marker 跳过：此前的全表扫描（sqlite_master + 每表 PRAGMA
    // + 每个 JSON 列一条 COUNT）阻塞 onModuleInit 且随数据量线性变慢，是启动
    // 8~31s 的组成部分。本轮真修复过脏数据则不落 marker（下轮再查一遍收尾）。
    // env ORDO_JSON_REPAIR=1 可强制复查。
    const dbPath = databaseUrl.slice('file:'.length);
    const markerPath = `${dbPath}.json-repair-ok`;
    if (process.env.ORDO_JSON_REPAIR !== '1' && fs.existsSync(markerPath)) {
      return;
    }

    try {
      await this.$queryRawUnsafe(`SELECT json_valid('{}') as valid`);
    } catch {
      this.logger.warn(
        'SQLite json_valid() is unavailable; skip JSON integrity repair',
      );
      return;
    }

    const tables = await this.$queryRawUnsafe<Array<{ name: string }>>(
      `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE '_prisma_%'
      `,
    );

    let repairedCells = 0;

    for (const table of tables) {
      const tableName = table.name.replace(/"/g, '""');
      const columns = await this.$queryRawUnsafe<
        Array<{ name: string; type: string | null; notnull: number }>
      >(`PRAGMA table_info("${tableName}")`);

      const jsonColumns = columns.filter((column) =>
        (column.type ?? '').toUpperCase().includes('JSON'),
      );

      for (const column of jsonColumns) {
        const columnName = column.name.replace(/"/g, '""');
        const invalidRows = await this.$queryRawUnsafe<
          Array<{ count: number }>
        >(
          `
          SELECT COUNT(1) AS count
          FROM "${tableName}"
          WHERE "${columnName}" IS NOT NULL
            AND json_valid("${columnName}") = 0
          `,
        );

        const invalidCount = Number(invalidRows[0]?.count ?? 0);
        if (invalidCount <= 0) {
          continue;
        }

        const fallbackValue = column.notnull === 1 ? `'{}'` : 'NULL';
        await this.$executeRawUnsafe(
          `
          UPDATE "${tableName}"
          SET "${columnName}" = ${fallbackValue}
          WHERE "${columnName}" IS NOT NULL
            AND json_valid("${columnName}") = 0
          `,
        );

        repairedCells += invalidCount;
        this.logger.warn(
          `Repaired invalid JSON cells in ${tableName}.${columnName}: ${invalidCount}`,
        );
      }
    }

    if (repairedCells > 0) {
      this.logger.warn(
        `SQLite JSON integrity repair completed: ${repairedCells} cells fixed`,
      );
      return; // 修过脏数据不落 marker，下次启动复查一遍确保收敛
    }
    try {
      fs.writeFileSync(markerPath, new Date().toISOString(), 'utf-8');
    } catch (e) {
      this.logger.warn(
        `JSON repair marker write failed (${markerPath}): ${(e as Error).message}`,
      );
    }
  }
}

/**
 * 数据层连接管理扩展（备份/恢复专用，CAP-A-03）：
 * createWorkspaceAwarePrismaService 的 Proxy 在标准 Prisma API 之外额外暴露，
 * PrismaService 本身不声明这两个方法（避免污染常规数据访问面）。
 * 用法：`prisma as unknown as PrismaService & WorkspaceConnectionAdmin`，
 * 并以 typeof 守卫兜底（纯 PrismaService 场景下不存在则跳过失效）。
 */
export interface WorkspaceConnectionAdmin {
  /**
   * 断开并清缓存指定库 URL 的活跃连接（工作区池内 client + default 基座实例），
   * 供恢复流程在覆盖库文件前释放 Windows 上的 SQLite 文件句柄；
   * 返回实际执行了断开的标识列表。
   * 池内条目被删除后，该工作区下次数据访问会自动重建连接。
   */
  invalidateWorkspaceConnections(dbUrls: string[]): Promise<string[]>;
  /** 重连 default 基座实例（恢复 default 库文件后调用；工作区池无需重连） */
  reconnectBaseConnection(): Promise<void>;
  /**
   * 恢复停写闸门：置位后所有经 getClient 的数据访问抛 503 RESTORE_IN_PROGRESS。
   * 修复恢复竞态——此前 invalidate 与文件覆盖之间，在途/新到请求会同步惰性
   * 重建 PrismaClient 重新持有库文件句柄（Windows 上 rmSync/renameSync 失败，
   * 恢复中断）。恢复流程进入覆盖段前置位、finally 解除。
   */
  setRestoreWriteGate(on: boolean): void;
}

/**
 * 显式按工作区取连接池 client（网关事件可见性过滤等无 ALS 上下文场景）。
 * 与请求级路由共用同一连接池：恢复流程 invalidateWorkspaceConnections 照常命中。
 * 未注册 / 库文件缺失返回 null（不抛），由调用方决定跳过或告警。
 * 用法同 WorkspaceConnectionAdmin：`prisma as PrismaService & WorkspaceClientAccessor`。
 */
export interface WorkspaceClientAccessor {
  workspaceClient(wsId: string | null): PrismaClient | null;
}

/**
 * 工作区路由 PrismaService 工厂：
 * 返回 Proxy，按请求级 x-workspace-id（AsyncLocalStorage）把数据访问路由到
 * 对应工作区的 SQLite 库；无上下文（未带头）或 'default' 走默认库（DATABASE_URL）。
 *
 * 安全止血（P0-7）：带了的头必须指向已注册且已初始化的工作区——
 * 未注册 / 库文件缺失一律抛 404 WORKSPACE_NOT_FOUND，绝不静默回落默认库
 * （旧行为会让用户以为在写 B 库，实际读写的是 default 库 → 串库/越权）。
 */
export function createWorkspaceAwarePrismaService(
  logger: LoggerService,
): PrismaService {
  const base = new PrismaService(logger);
  const pool = new Map<string, PrismaClient>();
  /** 恢复停写闸门（见 WorkspaceConnectionAdmin.setRestoreWriteGate） */
  let restoreWriteGate = false;

  // 池键一律用原始 URL（备份/恢复的失效与 dbFileUrl 对表），连接参数只在
  // PrismaClient 构造时追加，避免键漂移导致失效失配。
  const clientForUrl = (url: string): PrismaClient => {
    if (url === process.env.DATABASE_URL) return base;
    let client = pool.get(url);
    if (!client) {
      client = new PrismaClient({
        datasources: { db: { url: withSqliteConnectionParams(url) } },
      });
      pool.set(url, client);
      logger.log(`Workspace database client created: ${url}`);
      // 建池即补挂 WAL（幂等）：模板修复前的存量库可能是 DELETE 模式；
      // 文件被占用时失败仅告警，下次建池重试。
      void client
        .$queryRawUnsafe('PRAGMA journal_mode=WAL;')
        .catch((e: unknown) =>
          logger.warn(
            `Workspace WAL enable failed (${url}): ${(e as Error).message}`,
          ),
        );
    }
    return client;
  };

  const getClient = (): PrismaClient => {
    if (restoreWriteGate) {
      throw new ServiceUnavailableException({
        code: 'RESTORE_IN_PROGRESS',
        message: '备份恢复进行中，请稍后重试',
      });
    }
    const wsId = getCurrentWorkspaceId();
    // 无头（后台任务/未带头的请求）与显式 default 恒走默认库
    if (!wsId || wsId === DEFAULT_WORKSPACE_ID) return base;
    const url = resolveWorkspaceDbUrl(wsId);
    if (!url) {
      // 区分「未注册」与「已注册但库文件缺失」，两者都不允许回落默认库
      const registered = findWorkspace(wsId) !== null;
      logger.warn(
        `Workspace "${wsId}" ${
          registered ? '数据库文件缺失' : '未注册'
        }，拒绝数据访问（WORKSPACE_NOT_FOUND）`,
      );
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: '工作区不存在或未注册',
      });
    }
    return clientForUrl(url);
  };

  const proxy = new Proxy<PrismaService>(base, {
    get(_target, prop, _receiver) {
      // 生命周期方法固定路由到默认实例（销毁时顺带关闭工作区连接池）
      if (prop === 'onModuleDestroy') {
        return async () => {
          for (const [url, client] of pool) {
            try {
              await client.$disconnect();
              logger.log(`Workspace database disconnected: ${url}`);
            } catch (e) {
              logger.warn(
                `workspace disconnect failed: ${(e as Error).message}`,
              );
            }
          }
          pool.clear();
          await base.onModuleDestroy();
        };
      }
      if (prop === 'onModuleInit' || prop === 'logger') {
        const value = Reflect.get(base, prop, base);
        return typeof value === 'function'
          ? (value as () => unknown).bind(base)
          : value;
      }
      // 连接失效（备份/恢复专用）：见 WorkspaceConnectionAdmin 注释
      if (prop === 'invalidateWorkspaceConnections') {
        return async (dbUrls: string[]): Promise<string[]> => {
          const targets = new Set(dbUrls);
          const disconnected: string[] = [];
          for (const [url, client] of Array.from(pool.entries())) {
            if (!targets.has(url)) continue;
            pool.delete(url);
            try {
              await client.$disconnect();
              disconnected.push(url);
              logger.log(`Workspace database invalidated for restore: ${url}`);
            } catch (e) {
              logger.warn(
                `workspace invalidate failed: ${(e as Error).message}`,
              );
            }
          }
          // default 库由基座实例持有连接：覆盖其文件前必须断开（Windows 句柄锁定）
          const dbUrl = process.env.DATABASE_URL;
          if (dbUrl && targets.has(dbUrl)) {
            await base.$disconnect();
            disconnected.push(dbUrl);
            logger.log('Default database invalidated for restore');
          }
          return disconnected;
        };
      }
      if (prop === 'reconnectBaseConnection') {
        return async (): Promise<void> => {
          await base.$connect();
          logger.log('Default database reconnected after restore');
        };
      }
      // 恢复停写闸门（见 WorkspaceConnectionAdmin.setRestoreWriteGate 注释）
      if (prop === 'setRestoreWriteGate') {
        return (on: boolean): void => {
          restoreWriteGate = on;
          logger.log(
            on
              ? '恢复停写闸门：置位（数据访问暂拒 RESTORE_IN_PROGRESS）'
              : '恢复停写闸门：解除',
          );
        };
      }
      // 显式按工作区取池内 client（见 WorkspaceClientAccessor 注释）
      if (prop === 'workspaceClient') {
        return (wsId: string | null): PrismaClient | null => {
          if (!wsId || wsId === DEFAULT_WORKSPACE_ID) return base;
          const url = resolveWorkspaceDbUrl(wsId);
          if (!url) return null;
          return clientForUrl(url);
        };
      }

      const client = getClient();
      const value = Reflect.get(client, prop, client);
      return typeof value === 'function'
        ? (value as (...args: unknown[]) => unknown).bind(client)
        : value;
    },
  });

  return proxy;
}
