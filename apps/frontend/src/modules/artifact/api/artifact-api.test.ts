import { beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.fn();

vi.mock('@/infrastructure/api-client', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  apiClient: {
    post: (...args: unknown[]) => postMock(...args),
    get: vi.fn(),
  },
}));

import { artifactApi } from './artifact-api';

/**
 * 防回归：apiClient 全局默认 Content-Type: application/json，axios 1.x 会把
 * 「声明为 JSON 的 FormData」formDataToJSON 化（File 变 {}），服务端 whitelist
 * 报 "property file should not exist"（实机翻车 2026-10-28）。上传必须显式声明
 * multipart/form-data。
 */
describe('artifactApi 上传请求形态', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({ data: { id: 'artifact-1' } });
  });

  it('upload 显式以 multipart/form-data 发送，不走全局 JSON 默认头', async () => {
    await artifactApi.upload({
      file: new File(['hello'], 'CLAUDE.md', { type: 'text/markdown' }),
      projectId: 'p1',
      issueId: 'i1',
    });

    expect(postMock).toHaveBeenCalledTimes(1);
    const [url, body, config] = postMock.mock.calls[0];
    expect(url).toBe('/artifacts/upload');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('projectId')).toBe('p1');
    expect((body as FormData).get('issueId')).toBe('i1');
    expect(config).toEqual({
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });

  it('uploadVersion 同样显式声明 multipart/form-data', async () => {
    await artifactApi.uploadVersion('artifact-1', new File(['v2'], 'a.md'));

    const [url, body, config] = postMock.mock.calls[0];
    expect(url).toBe('/artifacts/artifact-1/versions');
    expect(body).toBeInstanceOf(FormData);
    expect(config).toEqual({
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });
});
