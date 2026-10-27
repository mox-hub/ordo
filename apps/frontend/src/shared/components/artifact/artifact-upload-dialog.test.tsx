/**
 * ArtifactUploadDialog 行为级测试（CAP-A-32 / GAP-T-75）：
 * 拖拽区渲染 / 文件选择触发上传（归属注入 projectId+issueId）/ 成功态 / 失败态。
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArtifactUploadDialog } from './artifact-upload-dialog';


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

const mutateAsync = vi.fn();
vi.mock('@/modules/artifact/hooks/use-artifacts', () => ({
  useUploadArtifacts: () => ({ mutateAsync, isPending: false }),
}));

function makeFile(name: string): File {
  return new File(['content'], name, { type: 'text/plain' });
}

function renderDialog() {
  return render(
    <ArtifactUploadDialog
      open
      onOpenChange={vi.fn()}
      projectId="p1"
      issueId="i1"
    />,
  );
}

describe('ArtifactUploadDialog', () => {
  it('渲染拖拽区（aria-label 入口）', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: '选择或拖入文件' })).toBeTruthy();
  });

  it('选择文件即按注入归属上传，成功后呈现完成态', async () => {
    mutateAsync.mockResolvedValue({ id: 'a1' });
    renderDialog();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('spec.txt')] } });

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0]).toEqual({
      file: expect.any(File),
      projectId: 'p1',
      issueId: 'i1',
    });
    // 成功态：完成条目出现（拖拽区隐藏）
    await waitFor(() => expect(screen.getByText('spec.txt')).toBeTruthy());
  });

  it('上传失败按文件呈现失败态且不中断后续', async () => {
    mutateAsync
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ id: 'a2' });
    renderDialog();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [makeFile('bad.txt'), makeFile('good.txt')] },
    });

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    // 失败标记出现（"失败" 文案）且第二个文件仍被上传（顺序执行不中断）
    await waitFor(() => expect(screen.getByText('失败')).toBeTruthy());
  });
});
