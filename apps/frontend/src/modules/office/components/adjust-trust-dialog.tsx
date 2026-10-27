/**
 * 调整信任对话框 —— 人工选三级等级，保存写 Member.trustLevel（CAP-B-07）。
 * 由设置页「AI 执行中心」迁移（2026-10-02）：原挂载于恒空态的信任档案卡下
 * 不可触达；改挂办公室页 AI 同事卡后首次真正可用。
 *
 * 2026-10-27 接入 AutonomyDial（组件规划账本 B5）：拨盘即选择器——
 * 「锁定必问 / 先问我 / 自己跑」自治语义直接映射三级等级（观察者=锁定必问 /
 * 协助者=先问我 / 受托者=自己跑，1:1 无损）；下方三级对照卡降级为纯展示
 * （等级官方词表 + server 侧准确定位文案，与拨盘档位对照），不再承担选择。
 * 持久化走既有链路（PATCH /members/:id trustLevel），本批不新增契约。
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AutonomyDial, type AutonomyLevel } from '@/components/semantic/autonomy-dial';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { api } from '@/infrastructure/api-client';
import { MEMBER_TRUST_TIERS } from '@/shared/member/types';
import { TRUST_TIER_ICON, TRUST_TIER_TEXT_COLOR } from './trust-tiers-panel';

/** B-07 三级等级 ↔ 拨盘自治档位（1:1 无损）：观察者=锁定必问 / 协助者=先问我 / 受托者=自己跑 */
const TIER_TO_AUTONOMY: Record<number, AutonomyLevel> = { 1: 'locked', 2: 'ask', 3: 'auto' };
const AUTONOMY_TO_TIER: Record<AutonomyLevel, number> = { locked: 1, ask: 2, auto: 3 };

interface AdjustTrustDialogProps {
  memberId: string;
  memberName: string;
  /** 三级口径：1=观察者 2=协助者 3=受托者；未评估传 null */
  currentLevel: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdjustTrustDialog({
  memberId,
  memberName,
  currentLevel,
  open,
  onOpenChange,
}: AdjustTrustDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number>(currentLevel ?? 0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/members/${memberId}`, { trustLevel: selected });
      toast.success(t('trust.adjustSaved'));
      queryClient.invalidateQueries({ queryKey: ['office'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onOpenChange(false);
    } catch {
      toast.error(t('trust.adjustFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('trust.adjustTitle', { name: memberName })}</DialogTitle>
          <DialogDescription>{t('trust.adjustDesc')}</DialogDescription>
        </DialogHeader>
        {/* 自治边界拨盘：本对话框的选择器。selected=0（未评估）时兜底显最严档
            （锁定必问）+ lockedLabel 说明尚未设定——防「看起来已选」误导，保存仍
            须显式切档（!selected 时禁用）。samples 不接：成员动作→档位的真实
            映射尚无数据链路，禁造假样例（§9）。 */}
        <AutonomyDial
          value={selected ? TIER_TO_AUTONOMY[selected] : 'locked'}
          onValueChange={(level) => setSelected(AUTONOMY_TO_TIER[level])}
          lockedLabel={selected ? undefined : t('trust.unratedDesc')}
        />
        {/* 三级对照卡：纯展示（等级官方词表 + 定位文案，对照拨盘档位），非选择器 */}
        <div className="space-y-2">
          {MEMBER_TRUST_TIERS.map((tier) => {
            const Icon = TRUST_TIER_ICON[tier.level];
            return (
              <div
                key={tier.level}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3',
                  selected === tier.level ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <Icon className={cn('mt-0.5 size-4 shrink-0', TRUST_TIER_TEXT_COLOR[tier.level])} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {t(tier.labelKey)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t(tier.descKey)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-3xs text-muted-foreground">{t('trust.redlineNote')}</p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={save} disabled={saving || !selected}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
