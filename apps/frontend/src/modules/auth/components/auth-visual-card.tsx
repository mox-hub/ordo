import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { useTheme, type ResolvedTheme } from '@/shared/theme/theme-context';
import { BlueprintCanvas } from './visuals/blueprint-canvas';
import { PrismCanvas } from './visuals/prism-canvas';
import { ServerConfigDialog } from './server-config-dialog';
import { cn } from '@/lib/utils';
import {
  Sun,
  Moon,
  RotateCw,
  Globe,
  Languages,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';

export type SurfaceMode = 'human' | 'ai';

const SURFACE_STORAGE_KEY = 'ordo_auth_surface_mode';

function useSafeTheme(): { resolvedMode: ResolvedTheme; toggleTheme: () => void } {
  try {
    const theme = useTheme();
    return { resolvedMode: theme.resolvedMode, toggleTheme: theme.toggleTheme };
  } catch {
    // 单元测试或环境无 ThemeProvider 时的安全兜底：
    // 无 Context 就拿不到意图，但 DOM 上的生效主题类始终是真相，直接读它。
    const isDark =
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark');
    return {
      resolvedMode: isDark ? 'dark' : 'light',
      toggleTheme: () => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark');
        }
      },
    };
  }
}

interface AuthVisualCardProps {
  children: ReactNode;
  title?: string;
  isRegister?: boolean;
  /** 页面标识（宪法 §12.1）：本卡片的根节点即登录/注册页的最外层容器，故由调用页传入 */
  aiPage?: string;
}

/**
 * 认证面卡片壳（登录/注册共用，2026-10-22 恢复全大窗改版）：
 * 双表面画布（蓝图 ⟷ 棱镜）铺满整窗作背景，登录/注册表单承载在窗口正中的
 * 玻璃拟态卡片里。桌面壳不再切小窗——同一主窗内呈现（set_compact_mode 已退役）；
 * web 端同构。右上角保留双表面翻转与日夜间切换。
 */
export function AuthVisualCard({
  children,
  isRegister: _isRegister = false,
  aiPage,
}: AuthVisualCardProps) {
  const { i18n } = useTranslation();
  const { resolvedMode, toggleTheme } = useSafeTheme();
  const isDark = resolvedMode === 'dark';

  // 双表面状态：一面人类控制面 (human)，一面 AI 执行面 (ai)
  const [surface, setSurface] = useState<SurfaceMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SURFACE_STORAGE_KEY);
      if (saved === 'human' || saved === 'ai') {
        return saved;
      }
    }
    return 'human';
  });

  const [serverDialogOpen, setServerDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const toggleSurface = () => {
    const next: SurfaceMode = surface === 'human' ? 'ai' : 'human';
    setSurface(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SURFACE_STORAGE_KEY, next);
    }
  };

  const currentLang = i18n?.language?.startsWith('zh') ? 'zh' : 'en';

  const handleLanguageToggle = () => {
    const nextLang = currentLang === 'zh' ? 'en' : 'zh-CN';
    if (i18n && typeof i18n.changeLanguage === 'function') {
      void i18n.changeLanguage(nextLang);
    }
  };

  const isAi = surface === 'ai';

  // 人类面 ⟷ AI 面的双表面微文案与哲学叙事
  const surfaceMetadata = {
    human: {
      tag: '人类控制面 · 掌舵中枢',
      quote: [
        '新一代 AI 原生项目治理平台',
        '人类控制面 · 构筑可信赖的软件大厦',
        '指令由此发出，复杂工程尽在掌控之中',
      ],
      switchPrompt: '翻转卡片至「AI 执行面」',
    },
    ai: {
      tag: 'AI 执行面 · 深度运行时',
      quote: [
        '新一代 AI 原生项目治理平台',
        'AI 执行面 · 将混沌需求折射为严密契约',
        '默默守护每一行代码，严把每一个验收门禁',
      ],
      switchPrompt: '翻转卡片至「人类控制面」',
    },
  }[surface];

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background transition-colors duration-slow"
      data-ai-page={aiPage}
    >
      {/* 背景层：双表面画布铺满整窗 + 半透明遮罩压稳前景卡片对比度。
          翻转只经右上角按钮触发（画布上不挂点击，防卡片外误触翻转） */}
      <div className="absolute inset-0" aria-hidden>
        <div className="decision-card-scene relative h-full w-full">
          <div className={cn('decision-card-flipper', isAi && 'is-flipped')}>
            <div className="decision-card-face decision-card-face-front">
              <BlueprintCanvas isDark={isDark} />
            </div>
            <div className="decision-card-face decision-card-face-back">
              <PrismCanvas isDark={isDark} />
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-background/55" />
      </div>

      {/* 右上角控制按钮组 (反转卡片 + 日夜间切换) */}
      <div className="absolute right-4 top-4 z-banner flex items-center gap-2">
        {/* 1. 双表面反转圆形按钮 (role="switch") */}
        <button
          type="button"
          role="switch"
          aria-checked={isAi}
          onClick={toggleSurface}
          aria-label={surfaceMetadata.switchPrompt}
          title={surfaceMetadata.switchPrompt}
          className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card/85 text-foreground backdrop-blur-md transition-all hover:scale-105 hover:bg-muted active:scale-95 shadow-xs group"
        >
          <RotateCw
            className={cn(
              'size-4 transition-transform duration-slow',
              isAi
                ? 'rotate-180 text-accent-blue'
                : 'text-primary group-hover:rotate-180',
            )}
          />
        </button>

        {/* 2. 日夜间切换圆形按钮 (role="switch") */}
        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          onClick={toggleTheme}
          aria-label={isDark ? '切换至日间浅色模式' : '切换至夜间深色模式'}
          title={isDark ? '切换至日间浅色模式' : '切换至夜间深色模式'}
          className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card/85 text-foreground backdrop-blur-md transition-all hover:scale-105 hover:bg-muted active:scale-95 shadow-xs"
        >
          {isDark ? (
            <Sun className="size-4 text-accent-yellow transition-transform" />
          ) : (
            <Moon className="size-4 text-muted-foreground transition-transform" />
          )}
        </button>
      </div>

      {/* 居中认证卡：品牌叙事 + 表单 + 底部动作组 */}
      <div className="relative z-10 my-auto w-full max-w-md px-4 py-10">
        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs backdrop-blur-md sm:p-8">
          {/* 品牌 Logo 与当前表面角标 */}
          <div className="flex items-center justify-between">
            <Logo size="md" variant="framed" ariaLabel="Ordo" />
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-2xs font-medium text-muted-foreground">
              <span
                className={cn(
                  'size-1.5 rounded-full transition-colors',
                  isAi ? 'bg-accent-blue' : 'bg-accent-green',
                )}
              />
              {surfaceMetadata.tag}
            </span>
          </div>

          {/* 标题与欢迎诗意文案 */}
          <div className="mt-5 space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              欢迎你，我的朋友
            </h1>
            <div className="space-y-0.5 text-xs text-muted-foreground leading-relaxed">
              {surfaceMetadata.quote.map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          </div>

          {/* 表单插槽（登录或注册） */}
          <div className="mt-6">{children}</div>

          {/* 底部功能动作组（接入端点 + 语言切换 + 无法登录反馈） */}
          <div className="mt-6 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  role="link"
                  variant="outline"
                  size="sm"
                  onClick={() => setServerDialogOpen(true)}
                  className="h-8 gap-1.5 px-3 text-xs font-normal shadow-xs hover:bg-muted/80"
                >
                  <Globe className="size-3.5 text-muted-foreground" />
                  接入端点
                </Button>

                <Button
                  type="button"
                  role="combobox"
                  aria-expanded="false"
                  aria-label="切换语言"
                  variant="outline"
                  size="sm"
                  onClick={handleLanguageToggle}
                  className="h-8 gap-1.5 px-2.5 text-xs font-normal shadow-xs hover:bg-muted/80"
                >
                  <Languages className="size-3.5 text-muted-foreground" />
                  <span>{currentLang === 'zh' ? '简体中文' : 'English'}</span>
                  <ChevronDown className="size-3 text-muted-foreground opacity-60" />
                </Button>
              </div>

              <Button
                type="button"
                role="link"
                variant="ghost"
                size="sm"
                onClick={() => setHelpDialogOpen(true)}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                无法登录？
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 服务端点配置弹窗 */}
      <ServerConfigDialog
        open={serverDialogOpen}
        onOpenChange={setServerDialogOpen}
      />

      {/* 无法登录 / 常见问题排查轻量弹窗 */}
      {helpDialogOpen && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <HelpCircle className="size-4" />
              <span>登录与服务排查指引</span>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <p>
                • <strong>本地运行</strong>
                ：桌面版启动时会自动拉起本地服务（进度见启动屏）；开发模式请在仓库运行{' '}
                <code className="rounded-sm bg-muted px-1 py-0.5 text-foreground font-mono">
                  pnpm dev
                </code>
                ，接口统一走 <code className="rounded-sm bg-muted px-1 py-0.5 text-foreground font-mono">/_api</code> 前缀。
              </p>
              <p>
                • <strong>初始账号</strong>
                ：首次使用请先{' '}
                <strong>邮箱注册</strong>
                ，或使用团队发放的邀请链接加入工作区。
              </p>
              <p>
                • <strong>私有服务</strong>
                ：若连接远端工作区，请点击下方“接入端点”配置完整的 API 地址。
              </p>
            </div>

            <Button
              className="w-full text-xs"
              size="sm"
              onClick={() => setHelpDialogOpen(false)}
            >
              我知道了
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
