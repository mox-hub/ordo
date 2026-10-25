import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { DomainEventTypes } from '@/core/message-bus/domain-events';
import { Server, Socket } from 'socket.io';
import { LoggerService } from '../core/logger/logger.service';
import { MessageBusService } from '../core/message-bus/message-bus.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '../core/config/config.service';
import { getCurrentWorkspaceId } from '../core/database/workspace-context';
import { EventVisibilityService } from './event-visibility.service';
import { isAllowedOrigin, parseAllowedOriginsFromEnv } from '../common';

const allowedOrigins = parseAllowedOriginsFromEnv();

@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>(); // userId -> socketIds

  constructor(
    private logger: LoggerService,
    private messageBus: MessageBusService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private visibility: EventVisibilityService,
  ) {
    this.logger.setContext('EventsGateway');
    this.setupMessageBusSubscriptions();
  }

  /**
   * 定向投递（P0 安全修：此前这些事件一律 server.emit 全广播，任意已登录用户
   * 可收到所有项目的动态）。裁决点在 EventVisibilityService：
   * - payload.projectId 在 → 项目成员 / 非 private 项目的同库用户；
   * - 无项目锚点 → 发布时 ALS 工作区的同库用户（message-bus 同步投递，上下文仍在）；
   * - 连工作区上下文都没有（定时器等后台发布）→ 保持既有广播语义（已知限制）。
   * 可见性解析失败按 fail-closed 丢弃该次投递并告警，绝不回退广播。
   */
  private emitScoped(event: string, payload: unknown): void {
    void this.emitScopedInner(event, payload).catch((e) => {
      this.logger.warn(`emitScoped(${event}) dropped: ${(e as Error).message}`);
    });
  }

  private async emitScopedInner(event: string, payload: unknown) {
    const candidates = [...this.userSockets.keys()];
    if (candidates.length === 0) return;
    const projectId = (payload as { projectId?: string } | null)?.projectId;
    let targets: string[];
    if (projectId) {
      targets = await this.visibility.visibleUserIdsForProject(
        projectId,
        candidates,
      );
    } else {
      const wsId = getCurrentWorkspaceId();
      if (!wsId) {
        this.server.emit(event, payload);
        return;
      }
      targets = await this.visibility.visibleUserIdsForWorkspace(
        wsId,
        candidates,
      );
    }
    this.emitToUsers(event, payload, targets);
  }

  /** 任务事件：有项目走项目可见性；独立任务（无项目）仅推 reporter/assignee/操作者 */
  private emitTaskEvent(
    event: string,
    payload: {
      projectId?: string | null;
      reporterId?: string | null;
      assigneeId?: string | null;
      userId?: string;
    } | null,
  ): void {
    if (payload?.projectId) {
      this.emitScoped(event, payload);
      return;
    }
    const targets = new Set<string>();
    for (const id of [
      payload?.reporterId,
      payload?.assigneeId,
      payload?.userId,
    ]) {
      if (id) targets.add(id);
    }
    this.emitToUsers(event, payload, [...targets]);
  }

  private emitToUsers(event: string, payload: unknown, userIds: string[]) {
    for (const userId of userIds) {
      const sockets = this.userSockets.get(userId);
      if (!sockets) continue;
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, payload);
      }
    }
  }

  async handleConnection(client: Socket) {
    try {
      // 仅接受 handshake.auth：query 传 token 会进代理/壳层访问日志与浏览器
      // 历史，泄露面不可控（daemon 与前端均已在 auth 载荷携带）
      const token = client.handshake.auth?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      // 验证 JWT
      const payload = this.jwtService.verify(token as string, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.data.userId = userId;

      // 记录用户连接
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.error('WebSocket connection error', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private setupMessageBusSubscriptions() {
    // 订阅 AI 流式输出事件（载荷：{conversationId, messageId, chunk, isFinal, userId}，
    // 仅推送会话属主，不再全局广播）
    this.messageBus.subscribe('ai.stream', (payload: any) => {
      const { userId } = payload;
      if (!userId) return;
      const sockets = this.userSockets.get(userId);
      if (!sockets) return;
      sockets.forEach((socketId) => {
        // 按用户已连接的 socket id 定向推送（server.to 兼容各 socket.io 版本，
        // 不依赖 server.sockets.sockets 内部 Map）
        this.server.to(socketId).emit('ai.stream', payload);
      });
    });

    // 订阅工作流更新事件
    this.messageBus.subscribe('ai.workflow.update', (payload: any) => {
      this.emitScoped('ai.workflow.update', payload);
    });

    // 订阅任务更新事件
    this.messageBus.subscribe(DomainEventTypes.TaskUpdated, (payload: any) => {
      this.emitTaskEvent(DomainEventTypes.TaskUpdated, payload);
    });

    // 订阅项目更新事件
    this.messageBus.subscribe(
      DomainEventTypes.ProjectUpdated,
      (payload: any) => {
        this.emitScoped(DomainEventTypes.ProjectUpdated, payload);
      },
    );

    // 订阅项目创建事件
    this.messageBus.subscribe(
      DomainEventTypes.ProjectCreated,
      (payload: any) => {
        this.emitScoped(DomainEventTypes.ProjectCreated, payload);
      },
    );

    // 订阅任务创建事件
    this.messageBus.subscribe(DomainEventTypes.TaskCreated, (payload: any) => {
      this.emitTaskEvent(DomainEventTypes.TaskCreated, payload);
    });

    // 订阅通知创建事件
    this.messageBus.subscribe(
      DomainEventTypes.NotificationCreated,
      (payload: any) => {
        const { userId } = payload;
        // 只推送给特定用户（server.to(socketId)：当前版本 server.sockets.sockets
        // 直接索引为 undefined，get 会崩——同 ai.stream 的修法）
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.forEach((socketId) => {
            this.server
              .to(socketId)
              .emit(DomainEventTypes.NotificationCreated, payload);
          });
        }
      },
    );

    // 订阅通知已读事件
    this.messageBus.subscribe(
      DomainEventTypes.NotificationRead,
      (payload: any) => {
        const { userId } = payload;
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.forEach((socketId) => {
            this.server
              .to(socketId)
              .emit(DomainEventTypes.NotificationRead, payload);
          });
        }
      },
    );

    // Terminal事件订阅已废弃 - Terminal模块已并入Runtime模块
    // 以下事件现在由Runtime模块的terminal capability处理
    // 如需恢复，请参考 Runtime模块的terminal capability实现
    //
    // ⚠️ 事实澄清（2026-09-14 全仓核验）：`terminal.output` 目前**全仓无任何发布方**
    // （message-bus 内仅存于日志降噪名单），此处转发亦在注释块内——即「chunk 级流式」
    // 这条通道**从未在线**。盯盘面的粒度天花板因此不是 chunk 级，而是事件级
    // （runtime.execution.event 的 summary / detail，经 runtime.dispatch.changed 转发）。
    // 若日后要恢复 chunk 级日志尾巴，须先补发布方 + 恢复本转发，不得据旧注释认为它"仍在发"。
    /*
    // 订阅终端输出事件
    this.messageBus.subscribe('terminal.output', (payload: any) => {
      const { sessionId, chunk, isError, isEnd } = payload;
      this.server.emit('terminal.output', { sessionId, chunk, isError, isEnd });
    });

    // 订阅终端会话创建事件
    this.messageBus.subscribe('terminal.session.created', (payload: any) => {
      this.server.emit('terminal.session.created', payload);
    });

    // 订阅终端命令执行事件
    this.messageBus.subscribe('terminal.command.executed', (payload: any) => {
      this.server.emit('terminal.command.executed', payload);
    });
    */

    // ── Runtime dispatch 生命周期 → 统一转发为 runtime.dispatch.changed ──
    // 前端同事位状态（use-assistant-status）与设置页派发表原先各挂 5s 轮询
    // GET /runtime/dispatches；改为事件驱动失效后轮询仅作 30s 兜底。
    const dispatchEvents = [
      'runtime.dispatch.created',
      'runtime.execution.event',
      'runtime.execution.result',
      'runtime.approval.requested',
      'runtime.approval.resolved',
      'runtime.execution.cancelled',
    ] as const;
    dispatchEvents.forEach((evt) => {
      this.messageBus.subscribe(evt, (payload: unknown) => {
        this.emitScoped('runtime.dispatch.changed', {
          source: evt,
          payload,
        });
      });
    });

    // ── 治理族（执行/审批/验收/发版）转发 ───────────────────
    // 2026-09-14 补遗：此前网关只转发 8 族事件（ai.stream / ai.workflow.update /
    // task.* / project.* / notification.* / runtime.dispatch.changed / linear.*），
    // `execution.*` / `approval.*` / `acceptance.*` / `release.*` 一条都没出网关——
    // 前端盯盘因此只能靠 React Query 轮询，这是「实时盯盘」的真实瓶颈所在。
    //
    // 逐事件显式转发（不做聚合）：线上事件名与领域事件名一致，前端订什么就收到什么。
    // 注意与 runtime.dispatch.changed 的分工：runtime.execution.event 等 **同时**走
    // 该聚合通道，两处并行不冲突（聚合通道服务 use-assistant-status，本通道服务盯盘投影）。
    // 合并注记：ApprovalRequested（approval.requested）来自兜底改造批 4 的显式订阅，归并入本列表。
    const governanceEvents = [
      DomainEventTypes.ExecutionRunCreated,
      DomainEventTypes.ExecutionRunUpdated,
      DomainEventTypes.ExecutionCompleted,
      DomainEventTypes.ExecutionStepCreated,
      DomainEventTypes.ExecutionStepUpdated,
      DomainEventTypes.ExecutionApprovalNeeded,
      DomainEventTypes.ApprovalRequestCreated,
      DomainEventTypes.ApprovalRequested,
      DomainEventTypes.ApprovalResolved,
      DomainEventTypes.ApprovalCancelled,
      DomainEventTypes.AcceptanceCreated,
      DomainEventTypes.AcceptanceResolved,
      DomainEventTypes.AcceptanceDeleted,
      DomainEventTypes.ReleaseCreated,
      DomainEventTypes.ReleaseApproved,
      DomainEventTypes.ReleaseStatusChanged,
    ] as const;
    governanceEvents.forEach((evt) => {
      this.messageBus.subscribe(evt, (payload: unknown) => {
        this.emitScoped(evt, payload);
      });
    });

    // ── 决策提案创建 → 收件箱/侧栏徽标实时失效（兜底改造批 4）──
    this.messageBus.subscribe(
      'decision.proposal.created',
      (payload: unknown) => {
        this.emitScoped('decision.proposal.created', payload);
      },
    );

    // ── Linear sync events ─────────────────────────────────
    // 有 projectId 走项目可见性；缺失时不再回退全广播（emitScoped 内按
    // 发布时工作区上下文过滤，再缺失才广播）。
    this.messageBus.subscribe('linear.sync.progress', (payload: any) => {
      this.emitScoped('linear.sync.progress', payload);
    });

    this.messageBus.subscribe('linear.sync.completed', (payload: any) => {
      this.emitScoped('linear.sync.completed', payload);
    });

    this.messageBus.subscribe('linear.task.pulled', (payload: any) => {
      this.emitScoped('linear.task.pulled', payload);
    });

    this.messageBus.subscribe('linear.task.pushed', (payload: any) => {
      this.emitScoped('linear.task.pushed', payload);
    });

    this.messageBus.subscribe('linear.task.conflict', (payload: any) => {
      this.emitScoped('linear.task.conflict', payload);
    });

    this.messageBus.subscribe('linear.task.resolved', (payload: any) => {
      this.emitScoped('linear.task.resolved', payload);
    });
  }

  // 客户端可以订阅特定事件
  @SubscribeMessage('subscribe')
  handleSubscribe(
    client: Socket,
    payload: { eventTypes?: string[]; projectId?: string },
  ) {
    if (payload?.eventTypes && Array.isArray(payload.eventTypes)) {
      payload.eventTypes.forEach((eventType) => {
        client.join(eventType);
      });
    }
    if (payload?.projectId) {
      client.join(`project:${payload.projectId}`);
    }
    return { success: true };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    client: Socket,
    payload: { eventTypes?: string[]; projectId?: string },
  ) {
    if (payload?.eventTypes && Array.isArray(payload.eventTypes)) {
      payload.eventTypes.forEach((eventType) => {
        client.leave(eventType);
      });
    }
    if (payload?.projectId) {
      client.leave(`project:${payload.projectId}`);
    }
    return { success: true };
  }
}
