import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { List, Package, Plus, TableProperties } from 'lucide-react';
import type { ColumnDef } from '@/components/ui/data-table';
import { PageShell } from '@/components/semantic/page-shell';
import { ToolbarRow } from '@/components/semantic/toolbar-row';
import {
  DataList,
  ListDate,
  ListText,
} from '@/shared/components/data-list';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { FileTypeIcon } from '@/components/semantic/file-type-icon';
import { ArtifactSourceBadge } from '@/components/semantic/artifact-source-badge';
import { ArtifactUploadDialog } from '@/shared/components/artifact/artifact-upload-dialog';
import { useArtifacts, useDeleteArtifact } from '@/modules/artifact/hooks/use-artifacts';
import type { Artifact, ArtifactKind } from '@/modules/artifact/api/artifact-api';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { formatBytes, formatNumber } from '@/lib/format';

/**
 * 产物列表页（CAP-A-32）：三源统一视图（upload/execution/document），
 * list/table 双视图 + 项目/kind 筛选 + 上传入口；document 行点击跳文档详情，
 * 其余打开预览弹窗。
 */
export function ArtifactsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<ArtifactKind | 'all'>('all');
  const [projectId, setProjectId] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const deleteMutation = useDeleteArtifact();

  const projectsQuery = useProjectList();
  const projects = projectsQuery.data?.items ?? [];

  const { data, isLoading } = useArtifacts({
    q: search || undefined,
    kind,
    projectId: projectId || undefined,
    page,
    pageSize: 20,
  });
  const items = data?.data ?? [];
  const meta = data?.meta;

  const KIND_OPTIONS: { value: ArtifactKind | 'all'; label: string }[] = [
    { value: 'all', label: t('artifact.kind.all', '全部') },
    { value: 'upload', label: t('artifact.kind.upload', '上传') },
    { value: 'execution', label: t('artifact.kind.execution', '执行产物') },
    { value: 'document', label: t('artifact.kind.document', '文档') },
  ];

  const handleItemClick = (item: Artifact) => {
    if (item.kind === 'document' && item.documentId) {
      navigate(`/app/documents/${item.documentId}`);
      return;
    }
    navigate(`/app/artifacts/${item.id}`);
  };

  const columns: ColumnDef<Artifact, unknown>[] = [
    {
      accessorKey: 'name',
      header: t('artifact.columns.name', '名称'),
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <FileTypeIcon name={row.original.name} mimeType={row.original.mimeType} />
          <span className="truncate">{row.original.name}</span>
        </span>
      ),
    },
    {
      accessorKey: 'kind',
      header: t('artifact.columns.kind', '来源'),
      cell: ({ row }) => (
        <ArtifactSourceBadge kind={row.original.kind as Artifact['kind']} />
      ),
    },
    {
      accessorKey: 'issueId',
      header: t('artifact.columns.issue', '归属工单'),
      cell: ({ row }) =>
        row.original.issueId ? (
          <span className="font-mono text-xs">{row.original.issueId.slice(0, 8)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'sizeBytes',
      header: t('artifact.columns.size', '大小'),
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums">
          {row.original.sizeBytes != null ? formatBytes(row.original.sizeBytes) : '—'}
        </span>
      ),
    },
    {
      id: 'updatedAt',
      accessorKey: 'updatedAt',
      header: t('artifact.columns.updatedAt', '更新时间'),
      cell: ({ row }) => <ListDate value={row.original.updatedAt} />,
    },
  ];

  return (
    <PageShell
      variant="wide"
      aiPage="artifact-list"
      title={t('artifact.title', '产物')}
      icon={Package}
      metrics={[
        {
          id: 'total',
          label: t('artifact.metrics.total', '产物总数'),
          value: formatNumber(meta?.total ?? 0),
        },
      ]}
      padded
      actions={
        <Button size="sm" data-ai-action="artifact.artifact-list.upload.click" onClick={() => setUploadOpen(true)}>
          <Plus className="size-4" />
          {t('artifact.list.upload', '上传产物')}
        </Button>
      }
    >
      <ToolbarRow
        aiId="artifacts.list"
        viewStyle={{
          value: viewMode,
          onChange: setViewMode,
          options: [
            { value: 'list', label: t('viewDisplay.views.list', '列表'), icon: List },
            {
              value: 'table',
              label: t('viewDisplay.views.table', '表格'),
              icon: TableProperties,
            },
          ],
        }}
        filterMenu={{
          search: {
            value: search,
            onChange: (v) => {
              setSearch(v);
              setPage(1);
            },
            placeholder: t('artifact.filter.searchPlaceholder', '搜索产物名称…'),
          },
          items: [
            { type: 'label', label: t('artifact.filter.kindGroup', '来源类型') },
            ...KIND_OPTIONS.map((option) => ({
              id: `kind-${option.value}`,
              type: 'checkbox' as const,
              label: option.label,
              checked: kind === option.value,
              onSelect: () => {
                setKind(option.value);
                setPage(1);
              },
            })),
            { type: 'label', label: t('artifact.filter.projectGroup', '项目') },
            {
              id: 'project-all',
              type: 'checkbox',
              label: t('common.all', '全部'),
              checked: !projectId,
              onSelect: () => {
                setProjectId('');
                setPage(1);
              },
            },
            ...projects.map((p) => ({
              id: `project-${p.id}`,
              type: 'checkbox' as const,
              label: p.name,
              checked: projectId === p.id,
              onSelect: () => {
                setProjectId(projectId === p.id ? '' : p.id);
                setPage(1);
              },
            })),
          ],
        }}
        displayMenu={false}
        downloadMenu={false}
      />

      <div className="min-h-0 flex-1">
        {viewMode === 'list' ? (
          <DataList
            items={items}
            loading={isLoading}
            emptyMessage={t('artifact.list.empty', '暂无产物')}
            emptyDescription={t(
              'artifact.list.emptyDescription',
              '上传文件，或派发 AI 任务——执行产生的文件会自动出现在这里',
            )}
            emptyIcon={Package}
            renderLeading={(item) => (
              <span className="flex min-w-0 items-center gap-2">
                <FileTypeIcon name={item.name} mimeType={item.mimeType} />
                <span className="truncate text-sm font-medium text-foreground">
                  {item.name}
                </span>
              </span>
            )}
            renderTrailing={(item) => (
              <span className="flex items-center gap-3">
                <ArtifactSourceBadge kind={item.kind as Artifact['kind']} />
                {item.sizeBytes != null && (
                  <span className="w-16 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {formatBytes(item.sizeBytes)}
                  </span>
                )}
                <ListDate value={item.updatedAt} />
                <ListText className="w-14 text-right text-xs text-muted-foreground">
                  {t('artifact.list.versions', {
                    defaultValue: '{{count}} 个版本',
                    count: item.versionsCount ?? 0,
                  })}
                </ListText>
              </span>
            )}
            onItemClick={handleItemClick}
            onItemContextMenu={(item) => [
              {
                id: 'open',
                label: t('artifact.menu.open', '打开'),
                onSelect: () => handleItemClick(item),
              },
              ...(item.kind === 'upload'
                ? [
                    {
                      id: 'delete',
                      label: t('artifact.menu.delete', '删除'),
                      destructive: true,
                      onSelect: () => deleteMutation.mutate(item.id),
                    },
                  ]
                : []),
            ]}
          />
        ) : (
          <DataTable
            columns={columns}
            data={items}
            getRowId={(row) => row.id}
            onRowClick={handleItemClick}
            emptyContent={t('artifact.list.empty', '暂无产物')}
            manualPagination={
              meta && meta.totalPages > 1
                ? {
                    page: meta.page,
                    pageSize: meta.pageSize,
                    total: meta.total,
                    onPageChange: setPage,
                  }
                : undefined
            }
          />
        )}
      </div>

      {viewMode === 'list' && meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 py-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t('common.previousPage', '上一页')}
          </Button>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('common.nextPage', '下一页')}
          </Button>
        </div>
      )}

      <ArtifactUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectId={projectId || projects[0]?.id || ''}
      />
    </PageShell>
  );
}
