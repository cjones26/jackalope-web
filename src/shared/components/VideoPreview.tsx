/**
 * Video Preview Component
 * Shows static thumbnail by default, plays video on hover
 */

import { useEffect, useRef, useState } from 'react';

export interface VideoPreviewProps {
  videoUrl: string;
  thumbnailUrl?: string;
  alt?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  autoMute?: boolean;
  hoverToPlay?: boolean;
}

export function VideoPreview({
  videoUrl,
  thumbnailUrl,
  alt = 'Video preview',
  className = '',
  width = '100%',
  height = 'auto',
  autoMute = true,
  hoverToPlay = true
}: VideoPreviewProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [showVideo, setShowVideo] = useState(!thumbnailUrl); // Show video immediately if no thumbnail
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current || !hoverToPlay) return;

    if (isHovering) {
      // Show video and play
      setShowVideo(true);
      const playPromise = videoRef.current.play();

      // Handle play promise (required for some browsers)
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Video play failed:', error);
        });
      }
    } else {
      // Pause and reset video
      videoRef.current.pause();
      videoRef.current.currentTime = 0;

      // If we have a thumbnail, hide video after pause
      if (thumbnailUrl) {
        setShowVideo(false);
      }
    }
  }, [isHovering, hoverToPlay, thumbnailUrl]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
      onMouseEnter={() => hoverToPlay && setIsHovering(true)}
      onMouseLeave={() => hoverToPlay && setIsHovering(false)}
    >
      {/* Thumbnail image - shown when not hovering */}
      {thumbnailUrl && !showVideo && (
        <img
          src={thumbnailUrl}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {/* Video element - shown when hovering or no thumbnail */}
      <video
        ref={videoRef}
        src={videoUrl}
        className={`w-full h-full object-cover ${showVideo ? 'block' : 'hidden'}`}
        muted={autoMute}
        playsInline
        loop
        preload="metadata"
      >
        Your browser does not support video playback.
      </video>

      {/* Play icon overlay (only shown when thumbnail is visible) */}
      {thumbnailUrl && !showVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 pointer-events-none">
          <div className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-800 ml-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>
      )}

      {/* Hover hint */}
      {hoverToPlay && thumbnailUrl && !isHovering && (
        <div className="absolute bottom-2 right-2 text-xs bg-black bg-opacity-60 text-white px-2 py-1 rounded pointer-events-none">
          Hover to play
        </div>
      )}
    </div>
  );
}

export default VideoPreview;
