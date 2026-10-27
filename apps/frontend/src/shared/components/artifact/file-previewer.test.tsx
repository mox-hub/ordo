/**
 * FilePreviewer 分流预览测试（CAP-A-32 / GAP-T-75）：
 * resolvePreviewMode 纯函数覆盖分级预览词表（图片/markdown/代码/pdf/诚实降级），
 * fallback 态渲染元数据卡 + 下载（不发起取数）。
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  FilePreviewer,
  resolvePreviewMode,
  TEXT_PREVIEW_MAX_BYTES,
} from './file-previewer';
import { artifactApi, type Artifact } from '@/modules/artifact/api/artifact-api';


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

vi.mock('@/modules/artifact/api/artifact-api', () => ({
  artifactApi: { fetchBlob: vi.fn() },
}));

function makeArtifact(overrides: Partial<Artifact>): Artifact {
  return {
    id: 'a1',
    projectId: 'p1',
    kind: 'upload',
    name: 'file.bin',
    createdBy: 'u1',
    isDeleted: false,
    createdAt: '2026-10-27T00:00:00Z',
    updatedAt: '2026-10-27T00:00:00Z',
    versionsCount: 1,
    ...overrides,
  } as Artifact;
}

describe('resolvePreviewMode 分级预览词表', () => {
  it('图片扩展名与 MIME → image；svg 一律降级（内联脚本面）', () => {
    expect(resolvePreviewMode(makeArtifact({ name: 'a.png', mimeType: 'image/png' }))).toBe('image');
    expect(resolvePreviewMode(makeArtifact({ name: 'a', mimeType: 'image/jpeg' }))).toBe('image');
    expect(resolvePreviewMode(makeArtifact({ name: 'icon.svg', mimeType: 'image/svg+xml' }))).toBe('fallback');
  });

  it('markdown → markdown（小文件）', () => {
    expect(resolvePreviewMode(makeArtifact({ name: 'README.md', mimeType: 'text/markdown' }))).toBe('markdown');
  });

  it('文本/代码扩展名 → code（≤1MB）', () => {
    expect(resolvePreviewMode(makeArtifact({ name: 'app.tsx', mimeType: null }))).toBe('code');
    expect(resolvePreviewMode(makeArtifact({ name: 'config.json', mimeType: null }))).toBe('code');
    expect(resolvePreviewMode(makeArtifact({ name: 'notes.txt', mimeType: 'text/plain' }))).toBe('code');
  });

  it('pdf → pdf；超限文本诚实降级 fallback', () => {
    expect(resolvePreviewMode(makeArtifact({ name: 'spec.pdf', mimeType: 'application/pdf' }))).toBe('pdf');
    expect(
      resolvePreviewMode(
        makeArtifact({ name: 'big.ts', sizeBytes: TEXT_PREVIEW_MAX_BYTES + 1 }),
      ),
    ).toBe('fallback');
  });

  it('Office/压缩包/未知二进制 → fallback（元数据卡 + 下载）', () => {
    expect(resolvePreviewMode(makeArtifact({ name: '报告.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))).toBe('fallback');
    expect(resolvePreviewMode(makeArtifact({ name: '打包.zip', mimeType: 'application/zip' }))).toBe('fallback');
    expect(resolvePreviewMode(makeArtifact({ name: 'data.xyz', mimeType: 'application/octet-stream' }))).toBe('fallback');
  });
});

describe('FilePreviewer fallback 态', () => {
  it('渲染文件名 + 下载按钮，不进入预览渲染分支', async () => {
    const fetchBlob = vi.mocked(artifactApi.fetchBlob);
    fetchBlob.mockResolvedValue(new Blob(['x']));

    render(
      <FilePreviewer
        artifact={makeArtifact({ name: '报告.docx', sizeBytes: 2048 })}
      />,
    );

    expect(screen.getByText('报告.docx')).toBeTruthy();
    fireEvent.click(screen.getByText('下载'));
    // 下载走 fetchBlob（fallback 态唯一取数点），但绝不渲染 image/pdf/markdown/code 分支
    await vi.waitFor(() => expect(fetchBlob).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('img')).toBeNull();
  });
});
