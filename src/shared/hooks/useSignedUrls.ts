import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from './useApi';
import { useUploadStatus } from './useUploadStatus';

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
      if (!uploadId) {
        throw new Error('No upload ID provided');
      }

      // For very long upload IDs (>100 chars), use bulk endpoint to avoid URL parsing issues
      if (uploadId.length > 100) {
        const response = (await fetchWithAuth('/api/v1/signed-urls/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uploadIds: [uploadId],
            thumbnail,
            expires: 3600,
          }),
        })) as BulkSignedUrlResponse;

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
      if (thumbnail) {
        params.set('thumbnail', 'true');
      }

      return fetchWithAuth(
        `/api/v1/signed-urls/${uploadId}?${params.toString()}`,
      );
    },
    enabled: !!uploadId,
    staleTime: 5 * 60 * 1000, // 5 minutes - shorter to avoid stale URLs from temp bucket
    gcTime: 60 * 60 * 1000, // 1 hour - keep in cache
    retry: (failureCount, error: Error) => {
      // Retry up to 5 times for 404 errors (newly uploaded files might not be ready yet)
      if ((error as any)?.status === 404 && failureCount < 5) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => {
      // Faster initial retries, then back off
      if (attemptIndex === 0) {
        return 300;
      } // First retry after 300ms
      if (attemptIndex === 1) {
        return 600;
      } // Second retry after 600ms
      return Math.min(1000 * 2 ** (attemptIndex - 2), 5000); // Then exponential backoff capped at 5s
    },
  });
};

export const useBulkSignedUrls = (
  uploadIds: string[],
  thumbnail = false,
  enabled = true,
) => {
  const { fetchWithAuth } = useApi();
  const queryClient = useQueryClient();

  return useQuery<BulkSignedUrlResponse>({
    queryKey: ['bulk-signed-urls', uploadIds.sort(), thumbnail],
    queryFn: async () => {
      if (!uploadIds.length) {
        return {};
      }

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
      Object.entries(response as BulkSignedUrlResponse).forEach(([uploadId, result]) => {
        if ('url' in result) {
          queryClient.setQueryData(
            ['signed-url', uploadId, thumbnail],
            result,
            {
              updatedAt: Date.now(),
            },
          );
        }
      });

      return response;
    },
    enabled: enabled && uploadIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - shorter to avoid stale URLs from temp bucket
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: (failureCount, error: Error) => {
      // Retry up to 5 times for 404 errors (newly uploaded files might not be ready yet)
      if ((error as any)?.status === 404 && failureCount < 5) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => {
      // Faster initial retries, then back off
      if (attemptIndex === 0) {
        return 300;
      } // First retry after 300ms
      if (attemptIndex === 1) {
        return 600;
      } // Second retry after 600ms
      return Math.min(1000 * 2 ** (attemptIndex - 2), 5000); // Then exponential backoff capped at 5s
    },
  });
};

// Hook for getting a secure URL with processing status awareness
export const useSecureImageUrl = (
  uploadId: string | null,
  thumbnail = false,
) => {
  const uploadStatusQuery = useUploadStatus(uploadId);

  // If upload is not ready for display, don't try to get signed URL
  const shouldFetchSignedUrl =
    uploadStatusQuery.data?.ready_for_display ?? false;

  // Create signed URL query with conditional enabling
  const signedUrlQuery = useSignedUrl(
    shouldFetchSignedUrl ? uploadId : null,
    thumbnail,
  );

  // If the upload is still processing, show loading state
  if (uploadStatusQuery.isLoading) {
    return {
      url: null,
      isLoading: true,
      error: null,
      processingStatus: uploadStatusQuery.data,
    };
  }

  // If upload failed or processing failed
  if (
    uploadStatusQuery.data?.processing_status === 'failed' ||
    uploadStatusQuery.data?.upload_status === 'failed'
  ) {
    return {
      url: null,
      isLoading: false,
      error: new Error(
        uploadStatusQuery.data?.processing_message || 'Processing failed',
      ),
      processingStatus: uploadStatusQuery.data,
    };
  }

  // If upload is not ready for display yet
  if (!uploadStatusQuery.data?.ready_for_display) {
    return {
      url: null,
      isLoading: false,
      error: null,
      processingStatus: uploadStatusQuery.data,
    };
  }

  // Return the signed URL if available
  if (signedUrlQuery.data?.url) {
    return {
      url: signedUrlQuery.data.url,
      isLoading: false,
      error: null,
      processingStatus: uploadStatusQuery.data,
    };
  }

  return {
    url: null,
    isLoading: signedUrlQuery.isLoading,
    error: signedUrlQuery.error,
    processingStatus: uploadStatusQuery.data,
  };
};
