import { useMutation, useQuery } from '@tanstack/react-query';
import { getAppContainer } from '../../infrastructure/container';

/**
 * 工作区视图。openapi 中 /workspaces/{id}/activate 的响应是内联 schema（无命名 DTO），
 * 故此处为本地最小视图；契约补名后改指生成类型。
 */
export interface WorkspaceView {
  id: string;
  name: string;
  path?: string | null;
  isDefault?: boolean;
  createdAt?: string;
  lastOpenedAt?: string | null;
}

export interface WorkspacesPublicResponse {
  enabled: boolean;
  workspaces: WorkspaceView[];
}

export const WORKSPACES_PUBLIC_KEY = ['workspaces', 'public'] as const;

export function useWorkspacesPublic() {
  const api = getAppContainer().api;
  return useQuery({
    queryKey: WORKSPACES_PUBLIC_KEY,
    queryFn: () => api.get<WorkspacesPublicResponse>('/workspaces/public'),
  });
}

export function useActivateWorkspace() {
  const api = getAppContainer().api;
  return useMutation({
    mutationFn: (workspaceId: string) => api.post(`/workspaces/${workspaceId}/activate`),
  });
}
