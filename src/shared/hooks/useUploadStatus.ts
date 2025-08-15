import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from './useApi';

export interface UploadStatus {
  upload_status: 'active' | 'completed' | 'aborted' | 'failed';
  processing_status?: 'pending' | 'processing' | 'processed' | 'failed';
  processing_progress?: number;
  processing_message?: string;
  ready_for_display: boolean;
}

export const useUploadStatus = (uploadId: string | null, enabled = true) => {
  const { fetchWithAuth } = useApi();

  return useQuery<UploadStatus>({
    queryKey: ['upload-status', uploadId],
    queryFn: async () => {
      if (!uploadId) {
        throw new Error('No upload ID provided');
      }
      return fetchWithAuth(`/api/v1/uploads/${uploadId}/status`);
    },
    enabled: enabled && !!uploadId,
    staleTime: 2 * 1000, // 2 seconds - we want relatively fresh status
    gcTime: 30 * 1000, // 30 seconds in cache
    refetchInterval: (query) => {
      // Auto-refresh if still processing
      const data = query?.state?.data as UploadStatus | undefined;
      if (
        data?.processing_status === 'processing' ||
        data?.processing_status === 'pending'
      ) {
        return 3000; // Poll every 3 seconds while processing
      }
      return false; // Stop polling when processed/failed
    },
    retry: (failureCount, error: Error) => {
      // Don't retry 404s (upload doesn't exist)
      if ('status' in error && (error as { status: number }).status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

export const useBulkUploadStatus = (uploadIds: string[], enabled = true) => {
  const { fetchWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useQuery<{ [uploadId: string]: UploadStatus }>({
    queryKey: ['bulk-upload-status', uploadIds],
    queryFn: async () => {
      if (!uploadIds.length) {
        return {};
      }

      const response = await fetchWithAuth('/api/v1/uploads/status/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadIds }),
      });

      // Cache individual statuses for reuse
      Object.entries(response).forEach(([uploadId, status]) => {
        queryClient.setQueryData(['upload-status', uploadId], status);
      });

      return response;
    },
    enabled: enabled && uploadIds.length > 0,
    staleTime: 2 * 1000, // 2 seconds
    gcTime: 30 * 1000, // 30 seconds
    refetchInterval: (query) => {
      // Auto-refresh if any uploads are still processing
      const data = query?.state?.data as
        | { [uploadId: string]: UploadStatus }
        | undefined;
      const hasProcessing =
        data &&
        Object.values(data).some(
          (status) =>
            status.processing_status === 'processing' ||
            status.processing_status === 'pending',
        );
      return hasProcessing ? 3000 : false;
    },
  });
};
