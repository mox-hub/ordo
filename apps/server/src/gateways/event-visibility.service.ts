import { Injectable } from '@nestjs/common';
import { LoggerService } from '../core/logger/logger.service';
import {
  PrismaService,
  WorkspaceClientAccessor,
} from '../core/database/prisma.service';
import { getCurrentWorkspaceId } from '../core/database/workspace-context';
import {
  DEFAULT_WORKSPACE_ID,
  listWorkspaces,
} from '../core/database/workspace-registry.util';

/**
 * 网关事件可见性过滤（P0 安全修：WS 全房间广播 → 定向投递）。
 *
 * 此前 EventsGateway 对 task/project/治理族/linear.* 事件一律 `server.emit`
 * 全广播，任何已登录用户（不分工作区、不分项目成员）都能收到所有项目的动态。
 * 本服务把「该项目/该工作区的事件可以推给哪些在线用户」收敛为单一裁决点：
 *
 * - 项目事件（payload.projectId 在）：项目成员恒可见；非 private 项目
 *   （internal/public）按「项目所在库的用户」可见——逐个校验 User 行存在性，
 *   跨库用户的 userId 在项目库里不存在，天然被拒。
 * - 无项目锚点的事件：用发布时的 x-workspace-id（ALS）按「同库用户」过滤。
 *   message-bus 投递是同步 EventEmitter，网关回调仍在发布方请求的 ALS 上下文内。
 *   定时器等无上下文的发布保持既有广播语义（已知限制，随事件注册表收口补齐）。
 *
 * 查询按 projectId → 工作区库解析（发布上下文优先，注册表扫描兜底），
 * 结果带 TTL 缓存；连接池与请求级路由共享，恢复失效照常命中。
 */

interface ProjectInfo {
  exists: boolean;
  isPrivate: boolean;
  memberIds: Set<string>;
}

const PROJECT_TTL_MS = 60_000;
/** 项目解析失败（不存在/库暂不可用）的短负缓存，避免逐事件重复扫描注册表 */
const PROJECT_NEGATIVE_TTL_MS = 15_000;
const USER_TTL_MS = 5 * 60_000;

@Injectable()
export class EventVisibilityService {
  private projectInfo = new Map<
    string,
    { info: ProjectInfo; expiresAt: number }
  >();
  /** projectId → 工作区 id 的正向映射（项目归属不变，永久缓存） */
  private projectWorkspace = new Map<string, string>();
  private userInWorkspace = new Map<
    string,
    { ok: boolean; expiresAt: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('EventVisibility');
  }

  private get clientAccessor(): WorkspaceClientAccessor {
    return this.prisma as PrismaService & WorkspaceClientAccessor;
  }

  private clientFor(wsId: string | null) {
    return this.clientAccessor.workspaceClient(wsId);
  }

  /** 项目事件投递对象：候选用户中的可见者（解析失败返回空 = fail-closed） */
  async visibleUserIdsForProject(
    projectId: string,
    candidates: string[],
  ): Promise<string[]> {
    const { info, workspaceId } = await this.resolveProject(projectId);
    if (!info.exists) return [];
    if (!info.isPrivate) {
      const results = await Promise.all(
        candidates.map((userId) => this.userExistsIn(workspaceId, userId)),
      );
      return candidates.filter((_, i) => results[i]);
    }
    return candidates.filter((userId) => info.memberIds.has(userId));
  }

  /** 无项目锚点但有发布时工作区上下文的事件：按「同库用户」过滤 */
  async visibleUserIdsForWorkspace(
    wsId: string | null,
    candidates: string[],
  ): Promise<string[]> {
    const results = await Promise.all(
      candidates.map((userId) => this.userExistsIn(wsId, userId)),
    );
    return candidates.filter((_, i) => results[i]);
  }

  /** 恢复/导入等库文件被整体替换后调用，清空全部缓存防陈旧映射 */
  invalidateCaches() {
    this.projectInfo.clear();
    this.projectWorkspace.clear();
    this.userInWorkspace.clear();
  }

  private async resolveProject(
    projectId: string,
  ): Promise<{ info: ProjectInfo; workspaceId: string | null }> {
    const cached = this.projectInfo.get(projectId);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        info: cached.info,
        workspaceId: this.projectWorkspace.get(projectId) ?? null,
      };
    }

    const notFound: ProjectInfo = {
      exists: false,
      isPrivate: true,
      memberIds: new Set(),
    };

    // 发布上下文所在工作区优先（无上下文时从 default 起扫），其余注册工作区兜底
    const ordered: string[] = [];
    const current = getCurrentWorkspaceId();
    ordered.push(current ?? DEFAULT_WORKSPACE_ID);
    for (const ws of listWorkspaces()) {
      if (ws.id !== DEFAULT_WORKSPACE_ID && !ordered.includes(ws.id)) {
        ordered.push(ws.id);
      }
    }

    for (const wsId of ordered) {
      const client = this.clientFor(wsId);
      if (!client) continue;
      try {
        const project = await client.project.findUnique({
          where: { id: projectId },
          select: {
            visibility: true,
            members: { select: { userId: true } },
          },
        });
        if (project) {
          const info: ProjectInfo = {
            exists: true,
            isPrivate: project.visibility === 'private',
            memberIds: new Set(project.members.map((m) => m.userId)),
          };
          this.projectWorkspace.set(projectId, wsId);
          this.projectInfo.set(projectId, {
            info,
            expiresAt: Date.now() + PROJECT_TTL_MS,
          });
          return { info, workspaceId: wsId };
        }
      } catch (e) {
        this.logger.warn(
          `resolveProject(${projectId}) @ ${wsId} failed: ${(e as Error).message}`,
        );
      }
    }

    this.projectInfo.set(projectId, {
      info: notFound,
      expiresAt: Date.now() + PROJECT_NEGATIVE_TTL_MS,
    });
    return { info: notFound, workspaceId: null };
  }

  private async userExistsIn(
    wsId: string | null,
    userId: string,
  ): Promise<boolean> {
    const key = `${wsId ?? DEFAULT_WORKSPACE_ID}:${userId}`;
    const cached = this.userInWorkspace.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.ok;

    const client = this.clientFor(wsId);
    if (!client) return false;
    try {
      const user = await client.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      const ok = user !== null;
      this.userInWorkspace.set(key, {
        ok,
        expiresAt: Date.now() + USER_TTL_MS,
      });
      return ok;
    } catch (e) {
      this.logger.warn(`userExistsIn(${key}) failed: ${(e as Error).message}`);
      return false;
    }
  }
}
