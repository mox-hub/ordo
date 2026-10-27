/**
 * 全局 AI 就绪度横幅（CAP-A-18「AI 就绪」第一公里三件套 ③，GAP-T-72）。
 *
 * 形态依据设计宪法：§8.4 z-banner 档用途明写「全局横幅（连接状态、离线提示）」；
 * §10.6「禁止只用 toast 报错而界面无状态」——持久状态横幅正是它的合规解。
 * 挂点与 ConnectionBanner 同层（shell-layout），两者互斥不叠加：断线时本横幅
 * 让位（连接横幅优先，且断线期间就绪查询不可信，宁可沉默也不误报「未配置」）。
 *
 * 硬度分级（2026-10-26 用户裁决「配置内置 AI 几乎是所有工作的前提，但没有硬性
 * 提醒」的正面回答）：
 * - unavailable（内置 AI 完全不可用）：常驻不可暂关——配置是前提，硬提醒；
 * - unconfigured / unverified：软提醒，可暂关（sessionStorage 记忆当轮会话，
 *   状态变化自动重现；新会话重现）。
 * 方案全文：docs/roadmap/内置AI引导与AI员工创建方案-2026-10-26.md §三。
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bot, TriangleAlert, X } from 'lucide-react';
import { eventClient } from '@/infrastructure/event-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useAiReadiness,
  type AiReadinessState,
} from '../hooks/use-ai-readiness';

const DISMISS_STORAGE_KEY = 'ordo.ai-readiness.dismissed';
const SETTINGS_AI_PATH = '/app/settings/ai';

/** 软提醒可暂关；unavailable 是硬提醒不可暂关 */
const isDismissible = (state: AiReadinessState) => state !== 'unavailable';

/** 三态文案映射（loading/unknown/ready 在渲染前已拦截） */
const BANNER_CONTENT = {
  unavailable: {
    titleKey: 'aiHub.readiness.unavailableTitle',
    descKey: 'aiHub.readiness.unavailableDesc',
  },
  unconfigured: {
    titleKey: 'aiHub.readiness.unconfiguredTitle',
    descKey: 'aiHub.readiness.unconfiguredDesc',
  },
  unverified: {
    titleKey: 'aiHub.readiness.unverifiedTitle',
    descKey: 'aiHub.readiness.unverifiedDesc',
  },
} as const;

export function AiReadinessBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, detail } = useAiReadiness();
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(DISMISS_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const onDown = () => setOffline(true);
    const onUp = () => setOffline(false);
    eventClient.on('disconnected', onDown);
    eventClient.on('error', onDown);
    eventClient.on('connected', onUp);
    return () => {
      eventClient.off('disconnected', onDown);
      eventClient.off('error', onDown);
      eventClient.off('connected', onUp);
    };
  }, []);

  if (offline) return null;
  if (state === 'loading' || state === 'unknown' || state === 'ready') {
    return null;
  }
  if (isDismissible(state) && dismissed === state) return null;

  const destructive = state === 'unavailable';
  const content = BANNER_CONTENT[state];

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, state);
    } catch {
      // 会话记忆失败不影响本轮提醒，仅失去跨刷新记忆
    }
    setDismissed(state);
  };

  return (
    <div
      className={cn(
        'fixed inset-x-0 top-0 z-banner flex h-7 items-center justify-center gap-2 px-4 text-xs font-medium',
        destructive ? 'bg-accent-red text-white' : 'bg-accent-orange text-background',
      )}
      data-ai-component="ai-hub.readiness-banner"
      data-ai-role="status"
      data-readiness-state={state}
      data-testid="ai-readiness-banner"
    >
      {destructive ? (
        <Bot className="size-3.5 shrink-0" />
      ) : (
        <TriangleAlert className="size-3.5 shrink-0" />
      )}
      <span className="shrink-0">{t(content.titleKey)}</span>
      <span className="hidden min-w-0 truncate opacity-80 lg:inline">
        {state === 'unverified' && detail
          ? `${t(content.descKey)}（${detail}）`
          : t(content.descKey)}
      </span>
      <Button
        type="button"
        size="xs"
        variant="ghost"
        className="h-5 bg-background/15 px-2 text-3xs text-current hover:bg-background/25 hover:text-current"
        data-ai-action="ai-hub.readiness.go-configure"
        data-testid="ai-readiness-cta"
        onClick={() => navigate(SETTINGS_AI_PATH)}
      >
        {state === 'unverified'
          ? t('aiHub.readiness.goCheck')
          : t('aiHub.readiness.goConfigure')}
      </Button>
      {isDismissible(state) ? (
        <Button
          type="button"
          size="icon-2xs"
          variant="ghost"
          className="text-current hover:bg-background/25 hover:text-current"
          aria-label={t('aiHub.readiness.later')}
          data-ai-action="ai-hub.readiness.dismiss"
          onClick={dismiss}
        >
          <X className="size-3" />
        </Button>
      ) : null}
    </div>
  );
}
