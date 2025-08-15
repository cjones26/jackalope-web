import { useSecureImageUrl } from '@/shared/hooks/useSignedUrls';
import { Spinner } from '@/shared/ui/Spinner';

interface SecureImageProps {
  uploadId: string;
  alt: string;
  className?: string;
  thumbnail?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export function SecureImage({
  uploadId,
  alt,
  className = '',
  thumbnail = false,
  onLoad,
  onError,
}: SecureImageProps) {
  const { url, isLoading, error, processingStatus } = useSecureImageUrl(
    uploadId,
    thumbnail,
  );

  // Show loading state for initial fetch or processing
  if (isLoading) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-muted ${className}`}
      >
        <Spinner />
        {processingStatus?.processing_message && (
          <span className="text-xs text-muted-foreground mt-2 text-center px-2">
            {processingStatus.processing_message}
          </span>
        )}
      </div>
    );
  }

  // Show processing state with progress
  if (processingStatus && !processingStatus.ready_for_display && !error) {
    const progress = processingStatus.processing_progress || 0;
    const status = processingStatus.processing_status || 'pending';

    return (
      <div
        className={`flex flex-col items-center justify-center bg-muted ${className} p-4`}
      >
        <div className="w-8 h-8 mb-3">
          {status === 'processing' ? (
            <Spinner />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-primary/40 animate-pulse" />
            </div>
          )}
        </div>

        {progress > 0 && (
          <div className="w-full max-w-[120px] mb-2">
            <div className="h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-center text-xs text-muted-foreground mt-1">
              {progress}%
            </div>
          </div>
        )}

        <span className="text-xs text-muted-foreground text-center">
          {processingStatus.processing_message ||
            (status === 'pending'
              ? 'Queued for processing...'
              : status === 'processing'
                ? 'Processing...'
                : 'Preparing...')}
        </span>

        {status === 'processing' &&
          processingStatus.processing_message?.includes('video') && (
            <span className="text-xs text-muted-foreground/70 text-center mt-1">
              This may take several minutes
            </span>
          )}
      </div>
    );
  }

  // Show error state
  if (error || processingStatus?.processing_status === 'failed') {
    const errorMessage =
      error?.message ||
      processingStatus?.processing_message ||
      'Failed to load image';

    return (
      <div
        className={`flex flex-col items-center justify-center bg-muted text-muted-foreground ${className} p-4`}
      >
        <div className="w-8 h-8 mb-2 text-destructive">⚠️</div>
        <span className="text-sm text-center">Processing failed</span>
        <span className="text-xs text-muted-foreground/70 text-center mt-1">
          {errorMessage}
        </span>
      </div>
    );
  }

  // Show image when ready
  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        className={className}
        onLoad={onLoad}
        onError={onError}
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
}
