import { api, apiClient } from '@/infrastructure/api-client';
import type { ApiSchemas } from '@/infrastructure/api-client/contract';

/**
 * 响应类型单源于 openapi 契约（components.schemas 响应 DTO）。
 * 上传为 multipart，契约不覆盖请求体，手写参数类型。
 */
export type Artifact = ApiSchemas['ArtifactResponseDto'];

export type ArtifactPage = ApiSchemas['ArtifactPageResponseDto'];

export type ArtifactVersion = ApiSchemas['ArtifactVersionResponseDto'];

export type ArtifactKind = 'upload' | 'execution' | 'document';

export type ArtifactListQuery = {
  projectId?: string;
  issueId?: string;
  executionId?: string;
  kind?: ArtifactKind | 'all';
  documentId?: string;
  mime?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export type UploadArtifactRequest = {
  file: File;
  projectId: string;
  issueId?: string;
};

export const artifactApi = {
  getList: async (query?: ArtifactListQuery): Promise<ArtifactPage> => {
    return api.get<ArtifactPage>('/artifacts', query);
  },

  getDetail: async (artifactId: string): Promise<Artifact> => {
    return api.get<Artifact>(`/artifacts/${artifactId}`);
  },

  update: async (
    artifactId: string,
    data: { name?: string; issueId?: string | null },
  ): Promise<Artifact> => {
    return api.put<Artifact>(`/artifacts/${artifactId}`, data);
  },

  remove: async (artifactId: string): Promise<void> => {
    await api.delete(`/artifacts/${artifactId}`);
  },

  getVersions: async (artifactId: string): Promise<ArtifactVersion[]> => {
    return api.get<ArtifactVersion[]>(`/artifacts/${artifactId}/versions`);
  },

  /** multipart 上传（axios 原生 FormData 序列化，走统一拦截器带认证与工作区头） */
  upload: async ({ file, projectId, issueId }: UploadArtifactRequest): Promise<Artifact> => {
    const form = new FormData();
    form.append('file', file);
    form.append('projectId', projectId);
    if (issueId) form.append('issueId', issueId);
    const res = await apiClient.post<unknown>('/artifacts/upload', form);
    return res.data as Artifact;
  },

  uploadVersion: async (artifactId: string, file: File): Promise<ArtifactVersion> => {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post<unknown>(`/artifacts/${artifactId}/versions`, form);
    return res.data as ArtifactVersion;
  },

  /** 取二进制内容（raw 端点；blob 直读不经 JSON 信封剥离） */
  fetchBlob: async (artifactId: string, version?: number): Promise<Blob> => {
    const res = await apiClient.get<Blob>(`/artifacts/${artifactId}/raw`, {
      responseType: 'blob',
      params: version ? { version } : undefined,
    });
    return res.data;
  },
};
