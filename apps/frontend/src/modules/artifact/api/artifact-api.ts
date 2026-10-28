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

/** 执行产物源文件读取响应（kind=unavailable 为诚实降级，非传输错误） */
export type ExecutionSourceResult = {
  kind: 'text' | 'image' | 'unavailable';
  content?: string;
  dataUrl?: string;
  truncated?: boolean;
  readFrom?: 'worktree' | 'workspace';
  integrationStatus?: string | null;
  message?: string;
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

  /**
   * multipart 上传（走统一拦截器带认证与工作区头）。
   * Content-Type 必须显式声明 multipart：apiClient 全局默认 application/json，
   * axios 1.x 对「声明为 JSON 的 FormData」会整体 formDataToJSON 序列化（File 变 `{}`），
   * 服务端 whitelist 即报 "property file should not exist"。声明后走 FormData 原样分支，
   * 边界由浏览器适配器补齐。
   */
  upload: async ({ file, projectId, issueId }: UploadArtifactRequest): Promise<Artifact> => {
    const form = new FormData();
    form.append('file', file);
    form.append('projectId', projectId);
    if (issueId) form.append('issueId', issueId);
    const res = await apiClient.post<unknown>('/artifacts/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data as Artifact;
  },

  uploadVersion: async (artifactId: string, file: File): Promise<ArtifactVersion> => {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post<unknown>(`/artifacts/${artifactId}/versions`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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

  /** 执行产物源文件读取（worktree/workspace 只读；unavailable=现场已清理诚实降级） */
  getExecutionSource: async (
    artifactId: string,
    version?: number,
  ): Promise<ExecutionSourceResult> => {
    return api.get<ExecutionSourceResult>(`/artifacts/${artifactId}/source`, {
      version,
    });
  },
};
