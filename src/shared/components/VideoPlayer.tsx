// Video Player Component
// HTML5 video player with S3 presigned URL support

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/shared/ui/utils';

interface VideoPlayerProps {
  src: string;
  poster?: string; // Thumbnail image URL
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  onLoadedMetadata?: (duration: number, videoElement: HTMLVideoElement) => void;
  onError?: (error: Error) => void;
}

export function VideoPlayer({
  src,
  poster,
  className,
  autoPlay = false,
  muted = false,
  controls = true,
  loop = false,
  preload = 'metadata',
  onLoadedMetadata,
  onError,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const handleLoadedMetadata = () => {
      if (onLoadedMetadata && video) {
        onLoadedMetadata(video.duration, video);
      }
    };

    const handleError = () => {
      const error = new Error('Failed to load video');
      setHasError(true);
      setErrorMessage(
        'Unable to load video. The file may be corrupted or in an unsupported format.',
      );
      onError?.(error);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
    };
  }, [onLoadedMetadata, onError]);

  if (hasError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-muted text-muted-foreground p-8',
          className,
        )}
      >
        <div className="w-16 h-16 mb-4 text-destructive text-4xl">⚠️</div>
        <p className="text-sm font-medium text-center mb-2">
          Video Player Error
        </p>
        <p className="text-xs text-center max-w-md">{errorMessage}</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      className={cn('w-full h-full', className)}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      preload={preload}
      controlsList="nodownload" // Prevent download button in some browsers
      playsInline // Important for iOS
    >
      {/* Fallback message for browsers without video support */}
      <p className="text-sm text-muted-foreground p-4">
        Your browser does not support the video tag. Please try a different
        browser.
      </p>
    </video>
  );
}

interface AudioPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  onLoadedMetadata?: (duration: number, audioElement: HTMLAudioElement) => void;
  onError?: (error: Error) => void;
}

/**
 * Audio Player Component
 * Similar to VideoPlayer but for audio files
 */
export function AudioPlayer({
  src,
  className,
  autoPlay = false,
  loop = false,
  preload = 'metadata',
  onLoadedMetadata,
  onError,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleLoadedMetadata = () => {
      if (onLoadedMetadata && audio) {
        onLoadedMetadata(audio.duration, audio);
      }
    };

    const handleError = () => {
      const error = new Error('Failed to load audio');
      setHasError(true);
      onError?.(error);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
    };
  }, [onLoadedMetadata, onError]);

  if (hasError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-muted text-muted-foreground p-8',
          className,
        )}
      >
        <div className="w-12 h-12 mb-3 text-destructive text-3xl">⚠️</div>
        <p className="text-sm font-medium">Unable to load audio file</p>
      </div>
    );
  }

  return (
    <audio
      ref={audioRef}
      src={src}
      className={cn('w-full', className)}
      controls
      autoPlay={autoPlay}
      loop={loop}
      preload={preload}
      controlsList="nodownload"
    >
      <p className="text-sm text-muted-foreground p-4">
        Your browser does not support the audio tag.
      </p>
    </audio>
  );
}
