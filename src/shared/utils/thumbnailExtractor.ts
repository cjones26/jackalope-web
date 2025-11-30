/**
 * Client-Side Thumbnail Extraction
 * Generates thumbnails for images and videos using HTML5 Canvas API
 */

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number; // 0-1 for JPEG quality
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

const DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
  width: 300,
  height: 300,
  quality: 0.8,
  format: 'image/jpeg'
};

/**
 * Extract thumbnail from video file
 * Captures frame from 1 second into the video
 */
async function extractVideoThumbnail(
  file: File,
  options: Required<ThumbnailOptions>
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Seek to 1 second (or 10% of video duration, whichever is smaller)
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      // Calculate dimensions to maintain aspect ratio
      const aspectRatio = video.videoWidth / video.videoHeight;
      let width = options.width;
      let height = options.height;

      if (aspectRatio > 1) {
        // Landscape
        height = width / aspectRatio;
      } else {
        // Portrait
        width = height * aspectRatio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, width, height);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(video.src);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }
        },
        options.format,
        options.quality
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error(`Video loading error: ${video.error?.message || 'Unknown error'}`));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Resize image file to thumbnail
 */
async function resizeImage(
  file: File,
  options: Required<ThumbnailOptions>
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate dimensions to maintain aspect ratio
      const aspectRatio = img.width / img.height;
      let width = options.width;
      let height = options.height;

      if (aspectRatio > 1) {
        // Landscape
        height = width / aspectRatio;
      } else {
        // Portrait
        width = height * aspectRatio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image to canvas with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(img.src);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail blob'));
          }
        },
        options.format,
        options.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Image loading error'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Extract thumbnail from image or video file
 * Returns a Blob that can be uploaded to storage
 */
export async function extractThumbnail(
  file: File,
  userOptions: ThumbnailOptions = {}
): Promise<Blob> {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };

  if (file.type.startsWith('video/')) {
    return extractVideoThumbnail(file, options);
  } else if (file.type.startsWith('image/')) {
    return resizeImage(file, options);
  } else {
    throw new Error(`Unsupported file type for thumbnail: ${file.type}`);
  }
}

/**
 * Generate data URL for immediate preview
 */
export async function extractThumbnailDataUrl(
  file: File,
  options: ThumbnailOptions = {}
): Promise<string> {
  const blob = await extractThumbnail(file, options);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
