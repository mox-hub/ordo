/**
 * ArtifactSection 嵌入区块行为级测试（CAP-A-32 / GAP-T-75）：
 * 列表渲染（图标行+来源徽标）/ document 行点击跳文档详情 / 非 document 行打开预览弹窗 /
 * 空态文案 / 上传按钮唤起上传对话框。
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArtifactSection } from './artifact-section';
import type { Artifact } from '@/modules/artifact/api/artifact-api';


vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  Link: ({ children, to }: { children: React.ReactNode; to?: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const useArtifacts = vi.fn();
vi.mock('@/modules/artifact/hooks/use-artifacts', () => ({
  useArtifacts: (...args: unknown[]) => useArtifacts(...args),
  // 区块内部挂上传/预览弹窗，弹窗链消费同模块其余 hooks——一并提供空实现
  useUploadArtifacts: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  useUploadArtifactVersion: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  useArtifactVersions: () => ({ data: [] }),
  useArtifactDetail: () => ({ data: undefined }),
  useUpdateArtifact: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  useDeleteArtifact: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

function makeArtifact(overrides?: Partial<Artifact>): Artifact {
  return {
    id: 'a1',
    projectId: 'p1',
    kind: 'upload',
    name: '设计稿.png',
    mimeType: 'image/png',
    sizeBytes: 1024,
    createdBy: 'u1',
    isDeleted: false,
    createdAt: '2026-10-27T00:00:00Z',
    updatedAt: '2026-10-27T00:00:00Z',
    versionsCount: 1,
    ...overrides,
  } as Artifact;
}

describe('ArtifactSection', () => {
  it('按 issueId 请求并渲染产物行', () => {
    useArtifacts.mockReturnValue({
      data: { data: [makeArtifact()], meta: { total: 1 } },
      isLoading: false,
    });
    render(<ArtifactSection projectId="p1" issueId="i1" />);

    expect(useArtifacts).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1', issueId: 'i1' }),
    );
    expect(screen.getByText('设计稿.png')).toBeTruthy();
    // 「上传」同时命中区块动作按钮与 upload 来源徽标（同词表是预期）
    expect(screen.getAllByText('上传').length).toBeGreaterThanOrEqual(2);
  });

  it('document 行点击跳文档详情，不入预览', () => {
    useArtifacts.mockReturnValue({
      data: {
        data: [makeArtifact({ kind: 'document', documentId: 'doc9', name: '需求文档' })],
        meta: { total: 1 },
      },
      isLoading: false,
    });
    render(<ArtifactSection projectId="p1" />);

    fireEvent.click(screen.getByText('需求文档'));
    expect(navigate).toHaveBeenCalledWith('/app/documents/doc9');
  });

  it('upload 行点击打开预览弹窗（弹窗头出现文件名）', async () => {
    useArtifacts.mockReturnValue({
      data: { data: [makeArtifact()], meta: { total: 1 } },
      isLoading: false,
    });
    render(<ArtifactSection projectId="p1" />);

    fireEvent.click(screen.getByText('设计稿.png'));
    await waitFor(() =>
      expect(screen.getAllByText('设计稿.png').length).toBeGreaterThanOrEqual(2),
    );
  });

  it('空态展示引导文案', () => {
    useArtifacts.mockReturnValue({ data: { data: [], meta: { total: 0 } }, isLoading: false });
    render(<ArtifactSection projectId="p1" />);
    expect(screen.getByText('暂无产物；可上传文件，AI 任务执行产生的文件会自动出现在这里')).toBeTruthy();
  });

  it('上传按钮唤起上传对话框', () => {
    useArtifacts.mockReturnValue({ data: { data: [], meta: { total: 0 } }, isLoading: false });
    render(<ArtifactSection projectId="p1" issueId="i1" />);

    fireEvent.click(screen.getByText('上传'));
    expect(screen.getByRole('button', { name: '选择或拖入文件' })).toBeTruthy();
  });
});
