/**
 * CreateReleaseDialog - 新建发版（批四·FormDialog 标准化迁移件 7/8）
 *
 * 从 release-list-page 内联定义抽出；裸 useState → semantic/form-dialog
 * （RHF+Zod §13.1）。版本推荐（recommend）、里程碑预填计划时间（CAP-A-16
 * 计划轴单一来源）、热修基线候选（批三血缘）等联动保持原逻辑：projectId/
 * version/name/milestone/hotfixOf 走表单字段，plannedAt/platforms 为伴随状态
 * 提交时合并。
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { FormDialog } from '@/components/semantic/form-dialog';
import { toast } from '@/components/ui/toast';
import { useProjectMilestones } from '@/modules/issue/hooks/use-project-tasks';
import {
  useCreateRelease,
  useRecommendVersion,
} from '../hooks/use-releases';
import { RELEASE_PLATFORMS, RELEASE_PLATFORM_LABELS, type ReleasePlatform, type ReleaseStatus } from '../api/release-api';

const createReleaseSchema = z.object({
  projectId: z.string().min(1, '请选择项目'),
  version: z.string().min(1, '请输入版本号'),
  name: z.string().optional(),
  milestoneId: z.string().optional(),
  hotfixOfId: z.string().optional(),
});

type CreateReleaseValues = z.infer<typeof createReleaseSchema>;

export interface CreateReleaseDialogProps {
  open: boolean;
  projectId: string;
  projects: Array<{ id: string; name: string }>;
  releases: Array<{
    id: string;
    projectId: string;
    status: ReleaseStatus;
    version: string;
    name?: string | null;
  }>;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function CreateReleaseDialog({
  open,
  projectId,
  projects,
  releases,
  onClose,
  onCreated,
}: CreateReleaseDialogProps) {
  const { t } = useTranslation();
  const [pidOverride, setPidOverride] = useState<string | null>(null);
  const pid = pidOverride ?? projectId;
  // 伴随状态：计划时间与目标平台（联动型控件，提交时与表单字段合并）
  const [plannedAt, setPlannedAt] = useState<Date | undefined>(undefined);
  const [platforms, setPlatforms] = useState<ReleasePlatform[]>([]);
  const [basis, setBasis] = useState('');

  const recommend = useRecommendVersion(pid || undefined);
  const create = useCreateRelease();
  // 所属里程碑（CAP-A-16 计划-交付轴）：数据源 = 该项目的 milestones 列表
  const { data: milestones } = useProjectMilestones(pid || undefined);
  // 热修基线候选（批三血缘）：同项目已发布发版，版本倒序
  const hotfixCandidates = useMemo(
    () =>
      releases
        .filter((r) => r.projectId === pid && r.status === 'released')
        .sort((a, b) => b.version.localeCompare(a.version)),
    [releases, pid],
  );

  return (
    <FormDialog<CreateReleaseValues>
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPidOverride(null);
          setPlannedAt(undefined);
          setPlatforms([]);
          setBasis('');
          onClose();
        }
      }}
      title={t('release.create.title')}
      description={t('release.create.desc')}
      schema={createReleaseSchema}
      defaultValues={{ projectId, version: '', name: '', milestoneId: '', hotfixOfId: '' }}
      submitLabel={t('release.create.submit')}
      submitting={create.isPending}
      onSubmit={async (values) => {
        try {
          const release = await create.mutateAsync({
            projectId: values.projectId,
            version: values.version.trim(),
            name: values.name?.trim() || undefined,
            milestoneId: values.milestoneId || null,
            plannedAt: plannedAt ? plannedAt.toISOString() : null,
            platforms: platforms.length ? platforms : null,
            hotfixOfId: values.hotfixOfId || null,
          });
          toast.success(t('release.create.created'));
          onCreated(release.id);
        } catch (err) {
          toast.error((err as Error).message);
          throw err; // 失败不关窗
        }
      }}
      fields={(form) => {
        const watchPid = form.watch('projectId') || pid;
        const handleMilestoneChange = (mid: string) => {
          form.setValue('milestoneId', mid);
          if (mid) {
            const target = milestones?.find((m) => m.id === mid)?.targetDate;
            // 计划轴单一来源不双填：选中里程碑且未手选计划时间时预填 targetDate
            if (target && !plannedAt) setPlannedAt(new Date(target));
          }
        };
        return (
        <>
          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('release.create.project')}</FormLabel>
                <FormControl>
                  <SelectField
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      setPidOverride(e.target.value);
                    }}
                    className="h-8 w-full text-xs"
                  >
                    <option value="">{t('release.filter.pickProject')}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </SelectField>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="version"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('release.create.version')}</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input placeholder="1.0.0" className="h-8 font-mono text-xs" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 text-xs"
                    disabled={!watchPid || recommend.isPending}
                    onClick={() => {
                      recommend.mutate(undefined, {
                        onSuccess: (r) => {
                          form.setValue('version', r.recommended);
                          setBasis(t('release.create.basis', {
                            base: r.base,
                            type: t(`release.create.type.${r.releaseType}`),
                          }));
                        },
                        onError: (err) => toast.error((err as Error).message),
                      });
                    }}
                  >
                    <Sparkles className={cn('mr-1 size-3 text-accent-purple', recommend.isPending && 'animate-pulse')} />
                    {t('release.create.recommend')}
                  </Button>
                </div>
                {basis ? (
                  <p className="text-2xs text-content-text-muted">{basis}</p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('release.create.nameLabel')}</FormLabel>
                <FormControl>
                  <Input className="h-8 text-xs" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-1.5" data-testid="release-milestone-select">
            <FormLabel>{t('release.create.milestoneLabel')}</FormLabel>
            <SelectField
              value={form.watch('milestoneId') ?? ''}
              onChange={(e) => handleMilestoneChange(e.target.value)}
              disabled={!watchPid}
              className="h-8 w-full text-xs"
            >
              <option value="">{t('release.create.milestoneNone')}</option>
              {(milestones ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </SelectField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5" data-testid="release-plannedat-picker">
              <FormLabel>{t('release.create.plannedAt')}</FormLabel>
              <DatePicker
                value={plannedAt}
                onValueChange={setPlannedAt}
                placeholder={t('release.create.plannedAtPlaceholder')}
                buttonClassName="h-8 w-full text-xs"
              />
            </div>
            <div className="space-y-1.5" data-testid="release-hotfix-select">
              <FormLabel>{t('release.create.hotfixOf')}</FormLabel>
              <SelectField
                value={form.watch('hotfixOfId') ?? ''}
                onChange={(e) => form.setValue('hotfixOfId', e.target.value)}
                disabled={!watchPid || hotfixCandidates.length === 0}
                className="h-8 w-full text-xs"
              >
                <option value="">{t('release.create.hotfixNone')}</option>
                {hotfixCandidates.map((r) => (
                  <option key={r.id} value={r.id}>
                    v{r.version}{r.name ? ` ${r.name}` : ''}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
          <div className="space-y-1.5" data-testid="release-platform-checks">
            <FormLabel>{t('release.create.platforms')}</FormLabel>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {RELEASE_PLATFORMS.map((p) => (
                <label key={p} className="flex cursor-pointer items-center gap-1.5 text-xs text-content-text">
                  <Checkbox
                    checked={platforms.includes(p)}
                    onCheckedChange={() =>
                      setPlatforms((prev) =>
                        prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
                      )
                    }
                  />
                  {RELEASE_PLATFORM_LABELS[p]}
                </label>
              ))}
            </div>
          </div>
        </>
        );
      }}
    />
  );
}
