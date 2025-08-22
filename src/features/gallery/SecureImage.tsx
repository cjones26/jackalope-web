import { memo, useEffect, useState } from 'react';

import { Spinner } from '@/shared/ui/Spinner';

interface SecureImageProps {
  uploadId: string;
  alt: string;
  className?: string;
  thumbnail?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  disabled?: boolean;
}

// Global in-memory cache to prevent any unnecessary requests
const globalImageCache = new Map<string, { url: string; timestamp: number }>();

// Stable image URL cache - prevent component re-rendering from clearing URLs
const stableImageUrls = new Map<string, string>();

export const SecureImage = memo(
  function SecureImage({
    uploadId,
    alt,
    className = '',
    thumbnail = false,
    onLoad,
    onError,
    disabled = false,
  }: SecureImageProps) {
    const cacheKey = `${uploadId}-${thumbnail}`;

    // Check both caches - stable cache takes priority to prevent re-renders
    const stableUrl = stableImageUrls.get(cacheKey);
    const cached = globalImageCache.get(cacheKey);
    const isCacheValid =
      cached && Date.now() - cached.timestamp < 30 * 60 * 1000;

    // Use stable URL first, then cached URL as initial state if available
    const [imageUrl, setImageUrl] = useState<string | null>(
      stableUrl && !disabled
        ? stableUrl
        : isCacheValid && !disabled
          ? cached.url
          : null,
    );
    const [isLoading, setIsLoading] = useState(!isCacheValid && !disabled);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      // Skip effect if we already have a valid imageUrl from cache
      if (imageUrl && isCacheValid) {
        return;
      }

      // Double-check cache hasn't been populated since render
      const latestCached = globalImageCache.get(cacheKey);
      const isLatestCacheValid =
        latestCached && Date.now() - latestCached.timestamp < 30 * 60 * 1000;

      if (isLatestCacheValid) {
        setImageUrl(latestCached.url);
        setIsLoading(false);
        setError(null);
        return;
      }

      if (disabled || !uploadId) {
        setImageUrl(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      let cancelled = false;
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

          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/v1/signed-urls/${uploadId}?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          if (!cancelled) {
            // Cache the result in both caches
            globalImageCache.set(cacheKey, {
              url: data.url,
              timestamp: Date.now(),
            });

            // Also store in stable cache for preventing re-render issues
            stableImageUrls.set(cacheKey, data.url);

            // Preload the image to ensure it's in browser cache
            const img = new Image();
            img.src = data.url;

            // Wait for image to load before showing it
            img.onload = () => {
              if (!cancelled) {
                setImageUrl(data.url);
                setIsLoading(false);
              }
            };

            img.onerror = () => {
              if (!cancelled) {
                setError(new Error('Failed to load image'));
                setIsLoading(false);
              }
            };
          }
        } catch (err) {
          if (!cancelled) {
            setError(err as Error);
            setIsLoading(false);
          }
        }
      };

      fetchUrl();

      return () => {
        cancelled = true;
      };
    }, [uploadId, thumbnail, disabled]);

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
          <span className="text-sm text-center">Failed to load</span>
          <span className="text-xs text-muted-foreground/70 text-center mt-1">
            {error.message}
          </span>
        </div>
      );
    }

    // Show image when ready
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
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
      prevProps.disabled === nextProps.disabled;

    return shouldSkipRender;
  },
);
