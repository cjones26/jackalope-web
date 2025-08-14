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
  onError
}: SecureImageProps) {
  const { url, isLoading, error } = useSecureImageUrl(uploadId, thumbnail);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <Spinner />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
        <span className="text-sm">Failed to load image</span>
      </div>
    );
  }

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