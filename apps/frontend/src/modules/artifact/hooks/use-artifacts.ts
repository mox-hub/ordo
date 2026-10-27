import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { artifactApi, type ArtifactListQuery } from '../api/artifact-api';

export const artifactKeys = {
  all: ['artifacts'] as const,
  list: (query?: ArtifactListQuery) => [...artifactKeys.all, 'list', query ?? {}] as const,
  detail: (id: string) => [...artifactKeys.all, 'detail', id] as const,
  versions: (id: string) => [...artifactKeys.all, 'versions', id] as const,
};

export function useArtifacts(query?: ArtifactListQuery) {
  return useQuery({
    queryKey: artifactKeys.list(query),
    queryFn: () => artifactApi.getList(query),
  });
}

export function useArtifactDetail(artifactId: string | undefined) {
  return useQuery({
    queryKey: artifactKeys.detail(artifactId ?? ''),
    queryFn: () => artifactApi.getDetail(artifactId as string),
    enabled: !!artifactId,
  });
}

export function useArtifactVersions(artifactId: string | undefined) {
  return useQuery({
    queryKey: artifactKeys.versions(artifactId ?? ''),
    queryFn: () => artifactApi.getVersions(artifactId as string),
    enabled: !!artifactId,
  });
}

function useInvalidateArtifact() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: artifactKeys.all });
  };
}

export function useUploadArtifacts() {
  const invalidate = useInvalidateArtifact();
  return useMutation({
    mutationFn: async (files: {
      file: File;
      projectId: string;
      issueId?: string;
    }) => artifactApi.upload(files),
    onSuccess: invalidate,
  });
}

export function useUploadArtifactVersion() {
  const invalidate = useInvalidateArtifact();
  return useMutation({
    mutationFn: ({ artifactId, file }: { artifactId: string; file: File }) =>
      artifactApi.uploadVersion(artifactId, file),
    onSuccess: invalidate,
  });
}

export function useUpdateArtifact() {
  const invalidate = useInvalidateArtifact();
  return useMutation({
    mutationFn: ({
      artifactId,
      ...data
    }: {
      artifactId: string;
      name?: string;
      issueId?: string | null;
    }) => artifactApi.update(artifactId, data),
    onSuccess: invalidate,
  });
}

export function useDeleteArtifact() {
  const invalidate = useInvalidateArtifact();
  return useMutation({
    mutationFn: (artifactId: string) => artifactApi.remove(artifactId),
    onSuccess: invalidate,
  });
}
