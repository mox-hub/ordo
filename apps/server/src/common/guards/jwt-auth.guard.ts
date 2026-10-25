import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ConfigService } from '@/core/config/config.service';
import {
  AccessTokenService,
  ACCESS_TOKEN_PREFIX,
} from '@/modules/auth/access-token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 全局唯一认证守卫（APP_GUARD）。2026-10-25 双守卫收编：59 处控制器级
 * @UseGuards(JwtAuthGuard)（modules/auth 版）全量摘除，认证单源于此。
 *
 * 工作区隔离的真实边界（勿在守卫层重复校验）：x-workspace-id 在中间件进 ALS
 * 后，passport 策略 validateJwtPayload 与 PAT 校验都按 ALS 路由库查
 * User/Session/AccessToken——跨库主体在策略层即 401；控制器级再查一次归属
 * 只会徒增每请求一次 PK 查询。dev mock 用户 id 本不在任何库中，靠库内
 * User 行不存在自然失效。
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    @Inject(ConfigService) private configService: ConfigService,
    @Inject(AccessTokenService) private accessTokenService: AccessTokenService,
  ) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // WebSocket 上下文（网关 @SubscribeMessage）：switchToHttp().getRequest()
    // 是 Socket 对象、没有 headers，递给 passport-jwt 读 authorization 直接
    // TypeError（守护进程每次 runtime:heartbeat 心跳都会炸一次）。两个网关
    // 均在连接层自验（EventsGateway 验 JWT / RuntimeGateway 验 session），
    // 非 http 上下文直接放行。
    if (context.getType() !== 'http') {
      return true;
    }

    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authorization = request?.headers?.authorization as string | undefined;
    const hasToken = Boolean(authorization);

    // 访问 token（PAT）：ordo_pat_ 前缀走 AccessTokenService 校验，
    // principal 形态与 validateJwtPayload 一致（sessionId: null）
    if (authorization?.startsWith(`Bearer ${ACCESS_TOKEN_PREFIX}`)) {
      return this.validateAccessToken(
        request,
        authorization.slice('Bearer '.length),
      );
    }

    // Development mode: requests without a token get a mock user for convenience.
    // Requests WITH a token must go through real passport validation —
    // otherwise request.user would be silently replaced by the mock and
    // role/workspace checks would run against a nonexistent user.
    if (this.configService.nodeEnv === 'development' && !hasToken) {
      if (!request.user) {
        request.user = {
          id: 'dev-user-id',
          email: 'dev@example.com',
          role: 'admin',
        };
      }
      return true;
    }

    return super.canActivate(context);
  }

  private async validateAccessToken(
    request: { user?: unknown },
    token: string,
  ): Promise<boolean> {
    const principal = await this.accessTokenService.validate(token);
    if (!principal) {
      throw new UnauthorizedException('Unauthorized access');
    }
    request.user = principal;
    return true;
  }

  handleRequest(err: unknown, user: unknown, _info: unknown): any {
    if (err || !user) {
      // Development mode without a token falls back to the mock user
      if (this.configService.nodeEnv === 'development' && !err) {
        return { id: 'dev-user-id', email: 'dev@example.com', role: 'admin' };
      }
      throw err || new UnauthorizedException('Unauthorized access');
    }
    return user;
  }
}
