/**
 * AiReadinessCard - 创建面板 AI 模式就绪卡（批三·就绪度前置）
 *
 * AI 模式不可用（unavailable/unconfigured/unverified）时替换自然语言输入区，
 * 让用户在写下一句话之前就知道 AI 用不了——不再白写后收到 silent 通道 400。
 *
 * 视觉语义（方案规范 2.5/2.6）：琥珀警示系（§22.1 等人一等三要素：警示色+专属
 * 图标+可数说明）——「紫 = AI 可用，琥珀 = 等人处理环境问题」；人工/就绪态不渲染本卡。
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AiReadinessState } from '@/modules/ai-hub/hooks/use-ai-readiness';

export interface AiReadinessCardProps {
  state: Extract<AiReadinessState, 'unavailable' | 'unconfigured' | 'unverified'>;
  /** unverified 时的厂家实测错误详情（诚实展示失败原因） */
  detail?: string | null;
  onGoManual: () => void;
}

export function AiReadinessCard({ state, detail, onGoManual }: AiReadinessCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hard = state === 'unavailable';
  return (
    <div
      className={cn(
        'flex flex-1 flex-col gap-3 rounded-lg border px-4 py-5',
        hard ? 'border-accent-orange/40 bg-accent-orange/5' : 'border-border bg-muted/20',
      )}
      data-testid="ai-readiness-card"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-orange" />
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-sm font-medium text-foreground">
            {t(`unifiedCreate.readiness.${state}Title`)}
          </span>
          <span className="text-xs text-muted-foreground leading-relaxed">
            {t(`unifiedCreate.readiness.${state}Desc`)}
          </span>
          {detail && (
            <span className="text-xs text-muted-foreground/80 font-mono break-all">
              {detail}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/app/settings/ai')}
          data-ai-action="goto-ai-settings"
        >
          <Settings2 className="size-3.5" />
          {t('unifiedCreate.readiness.goConfig')}
          <ArrowRight className="size-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onGoManual}>
          {t('unifiedCreate.readiness.goManual')}
        </Button>
      </div>
    </div>
  );
}
