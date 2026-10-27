/**
 * 发版列表页（CAP-K-03 驱动型发版，list-page 模板骨架；批三发版中心扩展）。
 * ToolbarRow 筛选（项目/状态/平台/通道收进下拉，项目真相源仍在 URL searchParams 深链友好）；
 * 创建草案走对话框（版本可 AI/机械推荐，计划时间/平台/热修基线批三补齐），
 * 发布主链路（门禁→审批→执行）在详情页完成；
 * 内容区顶部「即将发版」区：未发布且有计划时间的发版按计划升序预告。
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { List, Rocket, Sparkles, TableProperties } from 'lucide-react';
import { DomainEventTypes } from '@ordo/shared/events/domain-events';
import { PageShell } from '@/components/semantic/page-shell';
import { PageHeader, nodeToText } from '@/components/semantic/page-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { HeaderActionButton } from '@/components/semantic/header-action-button';
import { ToolbarRow, useToolbarViews } from '@/components/semantic/toolbar-row';
import { useEventSubscription } from '@/infrastructure/hooks/use-event-subscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { SelectField } from '@/components/ui/select-field';
import { DataList, DataListSkeleton, ListChip, ListDate, ListText } from '@/shared/components/data-list';
import { StatusIconFrame } from '@/shared/status/status-icon-frame';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/semantic/empty-state';
import { IconStack } from '@/components/semantic/icon-stack';
import { toast } from '@/components/ui/toast';
import { CreateReleaseDialog } from '../components/create-release-dialog';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { useProjectMilestones } from '@/modules/issue/hooks/use-project-tasks';
import { useCreateRelease, useRecommendVersion, useReleases, releaseKeys } from '../hooks/use-releases';
import {
  deriveReleaseChannel,
  RELEASE_PLATFORMS,
  RELEASE_PLATFORM_LABELS,
  type ReleaseChannel,
  type ReleasePlatform,
  type ReleaseStatus,
} from '../api/release-api';
import { RELEASE_STATUSES, RELEASE_STATUS_VISUALS, isPlannedOverdue, statusLabelKey } from '../release-status-meta';
import { ReleaseChannelChip, ReleasePlatformBadges } from '../components/release-platform-badges';
import { ReleaseUpcomingSection } from '../components/release-upcoming-section';
import { ReleaseTableView } from '../components/release-table-view';
import { cn } from '@/lib/utils';

// 兼容既有消费方（详情页/测试从本页导入）：视觉元信息已抽至 release-status-meta
export { RELEASE_STATUS_TONE, RELEASE_STATUS_VISUALS, RELEASE_STATUSES, statusLabelKey, isPlannedOverdue } from '../release-status-meta';

/** 视图形态词表（CAP-A-29 扩展切片：发版列表 list/table 双档） */
type ViewMode = 'list' | 'table';

export function ReleaseListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  // 本页自治的项目深链参数 ?project（CAP-A-15 遗产口径，参数名与各管道页一致）；无参 = 全部项目
  // 批四：status/q 同入 URL（与 project 同真相源，深链/刷新不丢）
  const projectId = searchParams.get('project') ?? '';
  const statusFilter = (searchParams.get('status') as ReleaseStatus | null) ?? 'all';
  const search = searchParams.get('q') ?? '';
  const [createOpen, setCreateOpen] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<ReleasePlatform | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<ReleaseChannel | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // 筛选参数统一写回 URL（replace 不留历史；null = 删除该参数）
  const patchParams = (patch: Record<string, string | null>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        return next;
      },
      { replace: true },
    );
  };
  const setSearch = (q: string) => patchParams({ q: q || null });
  const setStatusFilter = (s: ReleaseStatus | 'all') =>
    patchParams({ status: s === 'all' ? null : s });

  const projectsQuery = useProjectList();
  const projects = projectsQuery.data?.items ?? [];
  const releasesQuery = useReleases(projectId || undefined);
  const releases = useMemo(
    () => releasesQuery.data ?? [],
    [releasesQuery.data],
  );

  // 批四：发布状态变化实时失效（事件驱动，React Query 轮询兜底不存在——列表无轮询）
  useEventSubscription(DomainEventTypes.ReleaseStatusChanged, () => {
    queryClient.invalidateQueries({ queryKey: releaseKeys.all });
  });

  // 页头状态统计（批四）：全量客户端 reduce，零后端
  const statusCounts = useMemo(() => {
    const counts: Record<ReleaseStatus, number> = {
      draft: 0,
      gated: 0,
      approved: 0,
      publishing: 0,
      released: 0,
      failed: 0,
    };
    for (const r of releases) {
      if (r.status in counts) counts[r.status] += 1;
    }
    return counts;
  }, [releases]);

  // 客户端过滤（搜索 version/name/tag + 状态/平台/通道）
  const filtered = useMemo(
    () =>
      releases.filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (
          platformFilter !== 'all' &&
          !(r.platforms ?? []).includes(platformFilter)
        )
          return false;
        if (
          channelFilter !== 'all' &&
          deriveReleaseChannel(r.version) !== channelFilter
        )
          return false;
        if (search) {
          const kw = search.toLowerCase();
          const haystack = [`v${r.version}`, r.name ?? '', r.gitTag ?? '', r.project?.name ?? '']
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(kw)) return false;
        }
        return true;
      }),
    [releases, statusFilter, platformFilter, channelFilter, search],
  );

  // 项目筛选的真相源在 URL（深链/详情页返回/管道聚焦），工具栏快照 apply 时写回 URL；
  // 保留其他 searchParams（如管道聚焦未来追加的参数），仅增删 project
  const setProjectFilter = (pid: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (pid) next.set('project', pid);
        else next.delete('project');
        return next;
      },
      { replace: true },
    );
  };

  const toolbar = useToolbarViews({
    key: 'releases-page',
    defaults: [
      {
        id: 'all',
        name: t('common.all'),
        icon: 'list',
        builtIn: true,
        snapshot: {
          search: '',
          status: 'all',
          platform: 'all',
          channel: 'all',
          projectId: '',
          viewMode: 'list',
        },
      },
    ],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string;
        status: ReleaseStatus | 'all';
        platform: ReleasePlatform | 'all';
        channel: ReleaseChannel | 'all';
        projectId: string;
        viewMode: ViewMode;
      }>;
      setSearch(snap.search ?? '');
      setStatusFilter(snap.status ?? 'all');
      setPlatformFilter(snap.platform ?? 'all');
      setChannelFilter(snap.channel ?? 'all');
      setViewMode(snap.viewMode ?? 'list');
      const nextPid = snap.projectId ?? '';
      if (nextPid !== projectId) setProjectFilter(nextPid);
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search, status: statusFilter, platform: platformFilter, channel: channelFilter, projectId, viewMode });
  }, [updateActiveSnapshot, search, statusFilter, platformFilter, channelFilter, projectId, viewMode]);

  const hasActiveFilters =
    statusFilter !== 'all' || !!search || !!projectId || platformFilter !== 'all' || channelFilter !== 'all';
  // 批四：项目闸放开——无 ?project 直开对话框（对话框内自选项目），不再 toast 拦截
  const openCreate = () => {
    setCreateOpen(true);
  };

  return (
    <PageShell className="overflow-hidden" aiPage="releases.list">
      <PageHeader
        aiId="releases.list"
        title={t('release.title')}
        favorites={<FavoriteToggle label={nodeToText(t('release.title')).trim()} aiId="releases.list" />}
        icon={Rocket}
        iconColor="text-accent-green"
        metrics={[
          { id: 'total', label: t('release.title'), value: filtered.length },
          ...RELEASE_STATUSES.map((s) => ({
            id: s,
            label: t(statusLabelKey(s)),
            value: statusCounts[s],
          })),
        ]}
        actions={
          <HeaderActionButton
            icon={Rocket}
            label={t('release.create.open')}
            onClick={openCreate}
          />
        }
      />

      <ToolbarRow
        aiId="releases.list"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        viewStyle={{
          value: viewMode,
          onChange: (v) => setViewMode(v as ViewMode),
          options: [
            { value: 'list', label: t('viewDisplay.views.list', 'List'), icon: List },
            { value: 'table', label: t('viewDisplay.views.table', 'Table'), icon: TableProperties },
          ],
        }}
        filterMenu={{
          badge: hasActiveFilters ? 1 : 0,
          search: { value: search, onChange: setSearch, placeholder: t('release.filter.searchPlaceholder') },
          items: [
            { type: 'label', label: t('release.filter.projectGroup') },
            {
              id: 'project-all',
              type: 'checkbox',
              label: t('common.all'),
              checked: !projectId,
              onSelect: () => setProjectFilter(''),
            },
            ...projects.map((p) => ({
              id: `project-${p.id}`,
              type: 'checkbox' as const,
              label: p.name,
              checked: projectId === p.id,
              onSelect: () => setProjectFilter(projectId === p.id ? '' : p.id),
            })),
            { type: 'separator' },
            { type: 'label', label: t('release.filter.statusGroup') },
            {
              id: 'status-all',
              type: 'checkbox',
              label: t('common.all'),
              checked: statusFilter === 'all',
              onSelect: () => setStatusFilter('all'),
            },
            ...RELEASE_STATUSES.map((s) => ({
              id: `status-${s}`,
              type: 'checkbox' as const,
              label: t(statusLabelKey(s)),
              checked: statusFilter === s,
              onSelect: () => setStatusFilter(statusFilter === s ? 'all' : s),
            })),
            { type: 'separator' },
            { type: 'label', label: t('release.filter.platformGroup') },
            {
              id: 'platform-all',
              type: 'checkbox',
              label: t('common.all'),
              checked: platformFilter === 'all',
              onSelect: () => setPlatformFilter('all'),
            },
            ...RELEASE_PLATFORMS.map((p) => ({
              id: `platform-${p}`,
              type: 'checkbox' as const,
              label: RELEASE_PLATFORM_LABELS[p],
              checked: platformFilter === p,
              onSelect: () => setPlatformFilter(platformFilter === p ? 'all' : p),
            })),
            { type: 'separator' },
            { type: 'label', label: t('release.filter.channelGroup') },
            {
              id: 'channel-all',
              type: 'checkbox',
              label: t('common.all'),
              checked: channelFilter === 'all',
              onSelect: () => setChannelFilter('all'),
            },
            ...(['alpha', 'beta', 'rc'] as const).map((c) => ({
              id: `channel-${c}`,
              type: 'checkbox' as const,
              label: c,
              checked: channelFilter === c,
              onSelect: () => setChannelFilter(channelFilter === c ? 'all' : c),
            })),
          ],
        }}
      />

      {/* 内容区：即将发版告示条 + 状态分支（加载骨架 / 空发版（带创建动作）/ 筛选无结果 / 任务列表基座 DataList）。
          CAP-A-15：无 ?project 时仍发起请求（后端返回全部项目），不再渲染“先选项目”引导 */}
      <div className="flex-1 overflow-auto p-6">
        {releasesQuery.isLoading ? (
          <DataListSkeleton />
        ) : filtered.length === 0 ? (
          releases.length === 0 ? (
            <EmptyState
              variant="page"
              visual={
                <IconStack aria-hidden="true" className="text-accent-purple">
                  <Rocket className="size-4 text-accent-purple" />
                </IconStack>
              }
              title={t('release.empty.none')}
              description={t('release.empty.noneDesc')}
              action={
                <Button size="sm" onClick={openCreate}>
                  <Sparkles className="mr-1 size-3 text-accent-purple" />
                  {t('release.empty.createAction')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={t('release.empty.filtered')}
              description={t('release.empty.filteredDesc')}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                >
                  {t('common.filterClear')}
                </Button>
              }
            />
          )
        ) : (
          <>
            <ReleaseUpcomingSection
              releases={filtered}
              onItemClick={(r) => navigate(`/app/releases/${r.id}`)}
            />
            {viewMode === 'table' ? (
              <ReleaseTableView
                releases={filtered}
                onReleaseClick={(r) => navigate(`/app/releases/${r.id}`)}
              />
            ) : (
              <DataList
              items={filtered}
              onItemClick={(r) => navigate(`/app/releases/${r.id}`)}
              renderLeading={(r) => {
                const visual = RELEASE_STATUS_VISUALS[r.status];
                return (
                  <>
                    <StatusIconFrame
                      icon={visual.icon}
                      tone={visual.tone}
                      size="list"
                      spin={r.status === 'publishing'}
                      title={
                        r.status === 'failed' && r.failureReason
                          ? `${t(statusLabelKey(r.status))}：${r.failureReason}`
                          : t(statusLabelKey(r.status))
                      }
                    />
                    <span className="shrink-0 whitespace-nowrap font-mono text-sm font-medium text-muted-foreground/50">
                      v{r.version}
                    </span>
                    <ReleaseChannelChip channel={deriveReleaseChannel(r.version)} />
                    {/* 行级卡点（批四）：待审批蓝 / 门禁未过红——流水线操作台一眼见卡在哪 */}
                    {r.hasPendingApproval ? (
                      <ListChip className="shrink-0 bg-accent-blue-light text-accent-blue">
                        {t('release.list.pendingApproval')}
                      </ListChip>
                    ) : null}
                    {r.gateFailedChecks ? (
                      <ListChip className="shrink-0 bg-accent-red-light text-accent-red">
                        {t('release.list.gateFailed', { count: r.gateFailedChecks })}
                      </ListChip>
                    ) : null}
                    <ListText className="min-w-0 flex-1 text-md font-medium">{r.name || '—'}</ListText>
                  </>
                );
              }}
              renderTrailing={(r) => (
                <>
                  {/* 尾列流式贴右（与任务列表同口径）：无值不渲染，头像位由状态日期兜底 */}
                  {r.project?.name ? (
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{r.project.name}</span>
                  ) : null}
                  {r.milestone?.name ? (
                    <ListChip className="max-w-27.5 truncate border border-border bg-muted/40 text-muted-foreground">
                      {r.milestone.name}
                    </ListChip>
                  ) : null}
                  <ReleasePlatformBadges platforms={r.platforms} />
                  {r.plannedAt ? (
                    <ListDate value={r.plannedAt} overdue={isPlannedOverdue(r)} />
                  ) : null}
                  {r.gitTag ? (
                    <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground/50">{r.gitTag}</span>
                  ) : null}
                  {r.releasedAt ? <ListDate value={r.releasedAt} /> : null}
                </>
              )}
            />
            )}
          </>
        )}
      </div>

      <CreateReleaseDialog
        open={createOpen}
        projectId={projectId}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        releases={releases}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => navigate(`/app/releases/${id}`)}
      />
    </PageShell>
  );
}
