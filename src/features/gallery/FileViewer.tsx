import { memo, useEffect, useState } from 'react';
import { Play } from 'lucide-react';

import { FileIconPlaceholder } from '@/shared/components/FileIcon';
import { AudioPlayer, VideoPlayer } from '@/shared/components/VideoPlayer';
import { Spinner } from '@/shared/ui/Spinner';
import { getFileCategory } from '@/shared/utils/fileTypeUtils';

interface FileViewerProps {
  uploadId: string;
  alt: string;
  className?: string;
  thumbnail?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  disabled?: boolean;
  mimeType?: string;
  filename?: string;
}

// Global in-memory cache to prevent unnecessary requests
const globalFileCache = new Map<string, { url: string; timestamp: number }>();

// Stable file URL cache - prevent component re-rendering from clearing URLs
const stableFileUrls = new Map<string, string>();

export const FileViewer = memo(
  function FileViewer({
    uploadId,
    alt,
    className = '',
    thumbnail = false,
    onLoad,
    onError,
    disabled = false,
    mimeType,
    filename,
  }: FileViewerProps) {
    const cacheKey = `${uploadId}-${thumbnail}`;

    // Determine file category for non-image files
    // Default to 'image' if mimeType not provided (backwards compatibility)
    const fileCategory = mimeType
      ? getFileCategory(mimeType, filename)
      : 'image';
    const isImageFile = fileCategory === 'image';

    // Check both caches - stable cache takes priority to prevent re-renders
    const stableUrl = stableFileUrls.get(cacheKey);
    const cached = globalFileCache.get(cacheKey);
    const isCacheValid =
      cached && Date.now() - cached.timestamp < 30 * 60 * 1000;

    // Use stable URL first, then cached URL as initial state if available
    const [fileUrl, setFileUrl] = useState<string | null>(
      stableUrl && !disabled
        ? stableUrl
        : isCacheValid && !disabled
          ? cached.url
          : null,
    );
    const [isLoading, setIsLoading] = useState(!isCacheValid && !disabled);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      // Skip effect if we already have a valid fileUrl from cache
      if (fileUrl && isCacheValid) {
        return;
      }

      // Double-check cache hasn't been populated since render
      const latestCached = globalFileCache.get(cacheKey);
      const isLatestCacheValid =
        latestCached && Date.now() - latestCached.timestamp < 30 * 60 * 1000;

      if (isLatestCacheValid) {
        setFileUrl(latestCached.url);
        setIsLoading(false);
        setError(null);
        return;
      }

      if (disabled || !uploadId) {
        setFileUrl(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      let cancelled = false;
      const abortController = new AbortController();
      setIsLoading(true);
      setError(null);

      const fetchUrl = async () => {
        try {
          // Get token directly from localStorage
          const token = window.localStorage.getItem(
            'sb-nblbokiaferczwqkrrzk-auth-token',
          );
          if (!token) {
            throw new Error('No auth token');
          }

          const authData = JSON.parse(token);
          const accessToken = authData?.access_token;
          if (!accessToken) {
            throw new Error('No access token');
          }

          const params = new URLSearchParams();
          if (thumbnail) {
            params.set('thumbnail', 'true');
          }

          // TODO: This will work once storage backend is configured
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/v1/signed-urls/${uploadId}?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              signal: abortController.signal,
            },
          );

          if (!response.ok) {
            if (response.status === 501) {
              throw new Error('Storage not configured');
            }
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          if (!cancelled) {
            // Cache the result in both caches
            globalFileCache.set(cacheKey, {
              url: data.url,
              timestamp: Date.now(),
            });

            // Also store in stable cache for preventing re-render issues
            stableFileUrls.set(cacheKey, data.url);

            // Only preload images to ensure they're in browser cache
            // For videos and other files, set URL directly
            if (isImageFile) {
              const img = new Image();
              img.src = data.url;

              // Wait for image to load before showing it
              img.onload = () => {
                if (!cancelled) {
                  setFileUrl(data.url);
                  setIsLoading(false);
                }
              };

              img.onerror = () => {
                if (!cancelled) {
                  setError(new Error('Failed to load file'));
                  setIsLoading(false);
                }
              };
            } else {
              // For non-images (videos, audio, etc.), set URL immediately without preloading
              setFileUrl(data.url);
              setIsLoading(false);
            }
          }
        } catch (err) {
          if (!cancelled) {
            // Don't set error state for aborted requests
            if ((err as Error).name === 'AbortError') {
              return;
            }
            setError(err as Error);
            setIsLoading(false);
          }
        }
      };

      fetchUrl();

      return () => {
        cancelled = true;
        abortController.abort();
      };
    }, [
      uploadId,
      thumbnail,
      disabled,
      cacheKey,
      fileUrl,
      isCacheValid,
      isImageFile,
    ]);

    // Show loading state for initial fetch
    if (isLoading) {
      return (
        <div
          className={`flex items-center justify-center bg-muted ${className}`}
        >
          <Spinner />
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div
          className={`flex flex-col items-center justify-center bg-muted text-muted-foreground ${className} p-4`}
        >
          <div className="w-8 h-8 mb-2 text-destructive">⚠️</div>
          <span className="text-sm text-center">
            {error.message === 'Storage not configured'
              ? 'Configure storage backend first'
              : 'Failed to load file'}
          </span>
          <span className="text-xs text-muted-foreground/70 text-center mt-1">
            {error.message}
          </span>
        </div>
      );
    }

    // Show file when ready
    if (fileUrl) {
      // For images, show the actual image
      if (isImageFile) {
        return (
          <img
            src={fileUrl}
            alt={alt}
            className={className}
            onLoad={() => {
              onLoad?.();
            }}
            onError={() => {
              onError?.();
            }}
            loading="lazy"
          />
        );
      }

      // For video thumbnails, show the image with play button overlay
      if (fileCategory === 'video' && thumbnail) {
        return (
          <div className={`relative ${className}`}>
            <img
              src={fileUrl}
              alt={alt}
              className="w-full h-full object-cover"
              onLoad={() => {
                onLoad?.();
              }}
              onError={() => {
                onError?.();
              }}
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 rounded-full p-2">
                <Play className="h-6 w-6 text-white fill-white" />
              </div>
            </div>
          </div>
        );
      }

      // For non-image/non-video files in thumbnail mode, show icon placeholder
      if (!isImageFile && thumbnail) {
        return (
          <FileIconPlaceholder
            category={fileCategory}
            className={className}
            iconSize={64}
          />
        );
      }

      // For videos in full view, show video player
      if (fileCategory === 'video' && !thumbnail) {
        return (
          <VideoPlayer
            src={fileUrl}
            className={className}
            controls={true}
            preload="metadata"
            onError={(error) => {
              console.error('Video playback error:', error);
              onError?.();
            }}
          />
        );
      }

      // For audio in full view, show audio player
      if (fileCategory === 'audio' && !thumbnail) {
        return (
          <AudioPlayer
            src={fileUrl}
            className={className}
            preload="metadata"
            onError={(error) => {
              console.error('Audio playback error:', error);
              onError?.();
            }}
          />
        );
      }

      // For other non-image files in full view (PDFs, documents, etc.), show icon placeholder
      return (
        <FileIconPlaceholder
          category={fileCategory}
          className={className}
          iconSize={80}
        />
      );
    }

    // Fallback loading state
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <Spinner />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for React.memo to prevent unnecessary re-renders
    const shouldSkipRender =
      prevProps.uploadId === nextProps.uploadId &&
      prevProps.thumbnail === nextProps.thumbnail &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.mimeType === nextProps.mimeType &&
      prevProps.filename === nextProps.filename;

    return shouldSkipRender;
  },
);
