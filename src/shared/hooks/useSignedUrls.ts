import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './useApi';

interface SignedUrlResponse {
  url: string;
  expires_in: number;
  expires_at: string;
}

interface BulkSignedUrlResponse {
  [uploadId: string]: SignedUrlResponse | { error: string };
}

export const useSignedUrl = (uploadId: string | null, thumbnail = false) => {
  const { fetchWithAuth } = useApi();

  return useQuery<SignedUrlResponse>({
    queryKey: ['signed-url', uploadId, thumbnail],
    queryFn: async () => {
      if (!uploadId) throw new Error('No upload ID provided');
      
      // For very long upload IDs (>100 chars), use bulk endpoint to avoid URL parsing issues
      if (uploadId.length > 100) {
        const response = await fetchWithAuth('/api/v1/signed-urls/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uploadIds: [uploadId],
            thumbnail,
            expires: 3600,
          }),
        }) as BulkSignedUrlResponse;
        
        const result = response[uploadId];
        if (result && 'url' in result) {
          return result;
        } else if (result && 'error' in result) {
          throw new Error(result.error);
        } else {
          throw new Error('File not found');
        }
      }
      
      // For normal length IDs, use the direct endpoint
      const params = new URLSearchParams();
      if (thumbnail) params.set('thumbnail', 'true');
      
      return fetchWithAuth(`/api/v1/signed-urls/${uploadId}?${params.toString()}`);
    },
    enabled: !!uploadId,
    staleTime: 5 * 60 * 1000, // 5 minutes - shorter to avoid stale URLs from temp bucket
    gcTime: 60 * 60 * 1000, // 1 hour - keep in cache
  });
};

export const useBulkSignedUrls = (uploadIds: string[], thumbnail = false, enabled = true) => {
  const { fetchWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useQuery<BulkSignedUrlResponse>({
    queryKey: ['bulk-signed-urls', uploadIds.sort(), thumbnail],
    queryFn: async () => {
      if (!uploadIds.length) return {};
      
      const response = await fetchWithAuth('/api/v1/signed-urls/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadIds,
          thumbnail,
          expires: 3600, // 1 hour
        }),
      });

      // Cache individual signed URLs for reuse
      Object.entries(response).forEach(([uploadId, result]) => {
        if ('url' in result) {
          queryClient.setQueryData(
            ['signed-url', uploadId, thumbnail],
            result,
            {
              updatedAt: Date.now(),
            }
          );
        }
      });

      return response;
    },
    enabled: enabled && uploadIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - shorter to avoid stale URLs from temp bucket
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

// Hook for getting a secure URL with automatic fallback
export const useSecureImageUrl = (uploadId: string | null, thumbnail = false) => {
  const signedUrlQuery = useSignedUrl(uploadId, thumbnail);
  
  // Return the signed URL if available, otherwise a placeholder
  if (signedUrlQuery.data?.url) {
    return {
      url: signedUrlQuery.data.url,
      isLoading: false,
      error: null,
    };
  }

  return {
    url: null,
    isLoading: signedUrlQuery.isLoading,
    error: signedUrlQuery.error,
  };
};