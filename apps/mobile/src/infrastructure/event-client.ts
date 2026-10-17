import { io, Socket } from 'socket.io-client';
import { DomainEventTypes } from '@ordo/shared/events/domain-events';

export type DomainEventType = (typeof DomainEventTypes)[keyof typeof DomainEventTypes];

type EventHandler = (payload: unknown) => void;

/**
 * /events 命名空间订阅器——口径镜像前端 infrastructure/event-client：
 * auth.token 握手 + websocket 优先 + 断线自动重连。
 * 订阅白名单一律取 @ordo/shared 事件名单源（禁止字面量，与前端同纪律）。
 */
export class EventClient {
  private socket: Socket | null = null;
  private readonly handlers = new Map<string, Set<EventHandler>>();

  constructor(
    private readonly baseUrl: string,
    private readonly getToken: () => string | undefined,
  ) {}

  connect(): void {
    if (this.socket) return;
    this.socket = io(`${this.baseUrl}/events`, {
      auth: { token: this.getToken() },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: Infinity,
    });
    this.socket.onAny((event: string, payload: unknown) => {
      this.handlers.get(event)?.forEach((handler) => handler(payload));
    });
  }

  /** 返回取消订阅函数（useEffect 清理直接返回它） */
  on(type: DomainEventType | (string & {}), handler: EventHandler): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

// 领域事件名单源重导出：页面从此导入，避免直接依赖路径细节
export { DomainEventTypes };
