/**
 * Workflow 列表页（CAP-A-11 基座）——定义卡片 + 触发对话框。
 * 「运行」支持可选 JSON 入参（demo 工作流只需 { "topic": "..." }）。
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GitBranch, LayoutGrid, List, Play, Plus, SearchX, Sparkles, TableProperties, Workflow as WorkflowIcon } from 'lucide-react';
import { PageHeader, nodeToText } from '@/components/semantic/page-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { HeaderActionButton } from '@/components/semantic/header-action-button';
import { PageShell } from '@/components/semantic/page-shell';
import { ToolbarRow, useToolbarViews } from '@/components/semantic/toolbar-row';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/semantic/empty-state';
import { IconStack } from '@/components/semantic/icon-stack';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  useCreateWorkflow,
  useTriggerWorkflow,
  useWorkflowEvents,
  useWorkflows,
} from '../hooks/use-workflows';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWorkflowDraft } from '../hooks/use-workflow-draft';
import { WorkflowTriggerDialog } from '../components/workflow-trigger-dialog';
import { CreateWorkflowDialog } from '../components/create-workflow-dialog';
import { WorkflowTableView } from '../components/workflow-table-view';
import type { WorkflowSummary } from '../api/workflow-api';

type WorkflowViewMode = 'grid' | 'list' | 'table';

export function WorkflowListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: workflows, isLoading } = useWorkflows();
  useWorkflowEvents();

  const [triggerTarget, setTriggerTarget] = useState<WorkflowSummary | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<WorkflowViewMode>('grid');

  const toolbar = useToolbarViews({
    key: 'workflow-list',
    defaults: [
      {
        id: 'all',
        name: t('common.all', '全部'),
        icon: 'list',
        builtIn: true,
        snapshot: { search: '', viewMode: 'grid' },
      },
    ],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{ search: string; viewMode: WorkflowViewMode }>;
      setSearch(snap.search ?? '');
      setViewMode(snap.viewMode ?? 'grid');
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search, viewMode });
  }, [updateActiveSnapshot, search, viewMode]);

  const filteredWorkflows = useMemo(() => {
    if (!workflows) return [];
    if (!search.trim()) return workflows;
    const query = search.trim().toLowerCase();
    return workflows.filter(
      (wf) =>
        wf.name.toLowerCase().includes(query) ||
        wf.key.toLowerCase().includes(query) ||
        (wf.description && wf.description.toLowerCase().includes(query)),
    );
  }, [workflows, search]);

  return (
    <PageShell className="overflow-hidden" aiPage="workflow.workflow-list">
      <PageHeader
        aiId="workflow.workflow-list"
        title={t('workflow.title')}
        favorites={<FavoriteToggle label={nodeToText(t('workflow.title')).trim()} aiId="workflow.workflow-list" />}
        icon={WorkflowIcon}
        iconColor="text-accent-purple"
        metrics={[{ id: 'total', label: t('workflow.title'), value: filteredWorkflows.length }]}
        actions={
          <HeaderActionButton
            icon={Plus}
            label={t('workflow.createDialog.open')}
            onClick={() => setCreateOpen(true)}
            data-ai-component="workflow.workflow-list.new-button"
            data-ai-action="workflow.workflow-list.new-button.click"
            data-ai-role="submit"
          />
        }
      />

      <ToolbarRow
        aiId="workflow.workflow-list"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        isDirty={toolbar.isDirty}
        onSaveCurrentView={toolbar.saveCurrentToActive}
        viewStyle={{
          layout: 'centered',
          value: viewMode,
          onChange: (v) => setViewMode(v as WorkflowViewMode),
          options: [
            { value: 'grid', label: t('workflow.view.grid'), icon: LayoutGrid },
            { value: 'list', label: t('workflow.view.list'), icon: List },
            { value: 'table', label: t('workflow.view.table', '表格'), icon: TableProperties },
          ],
        }}
        filterMenu={{
          badge: [Boolean(search.trim())].filter(Boolean).length,
          search: {
            value: search,
            onChange: setSearch,
            placeholder: t('workflow.filter.searchPlaceholder'),
          },
        }}
        displayMenu={false}
        downloadMenu={false}
      />

      <div className="flex w-full min-w-0 flex-1 flex-col overflow-y-auto px-6 py-4 sm:px-8 sm:py-5 lg:px-10">
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : filteredWorkflows.length === 0 ? (
          search.trim() ? (
            <EmptyState
              icon={SearchX}
              title={t('workflow.empty')}
              description={t('workflow.emptyHint')}
              action={
                <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                  {t('common.filterClear', '清除筛选')}
                </Button>
              }
            />
          ) : (
            <EmptyState
              variant="page"
              visual={
                <IconStack aria-hidden="true" className="text-accent-purple">
                  <WorkflowIcon className="size-4 text-accent-purple" />
                </IconStack>
              }
              title={t('workflow.empty')}
              description={t('workflow.emptyHint')}
            />
          )
        ) : viewMode === 'table' ? (
          <WorkflowTableView
            workflows={filteredWorkflows}
            loading={isLoading}
            onWorkflowClick={(wf) => navigate(`/app/workflows/${wf.id}`)}
            onTrigger={setTriggerTarget}
          />
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {filteredWorkflows.map((wf) => (
              <Card
                key={wf.id}
                className="cursor-pointer transition-colors hover:border-border/80 hover:bg-muted/30"
                onClick={() => navigate(`/app/workflows/${wf.id}`)}
              >
                <CardContent className="flex items-center justify-between gap-4 p-3.5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-purple/10 text-accent-purple">
                      <GitBranch className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium hover:underline">
                          {wf.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-3xs"
                          title={t('workflow.grammarVersionBadge')}
                        >
                          v{wf.grammarVersion ?? 1}
                        </Badge>
                        <code className="font-mono text-2xs text-muted-foreground/60">
                          {wf.key}
                        </code>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {wf.description || t('workflow.noDescription')}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 px-2.5 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTriggerTarget(wf);
                      }}
                    >
                      <Play className="size-3" />
                      {t('workflow.run')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredWorkflows.map((wf) => (
              <Card
                key={wf.id}
                className="transition-colors hover:border-border/80 hover:bg-muted/30"
              >
                <CardContent className="flex h-full flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-2 text-left"
                      onClick={() => navigate(`/app/workflows/${wf.id}`)}
                    >
                      <GitBranch className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium hover:underline">
                        {wf.name}
                      </span>
                    </button>
                    <Badge
                      variant="secondary"
                      className="shrink-0"
                      title={t('workflow.grammarVersionBadge')}
                    >
                      v{wf.grammarVersion ?? 1}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => navigate(`/app/workflows/${wf.id}`)}
                  >
                    <p className="line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">
                      {wf.description || t('workflow.noDescription')}
                    </p>
                  </button>
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <code className="truncate text-2xs text-muted-foreground/60">{wf.key}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 px-2.5 text-xs"
                      onClick={() => setTriggerTarget(wf)}
                    >
                      <Play className="size-3" />
                      {t('workflow.run')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <WorkflowTriggerDialog
        target={triggerTarget}
        onClose={() => setTriggerTarget(null)}
      />
      <CreateWorkflowDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </PageShell>
  );
}
