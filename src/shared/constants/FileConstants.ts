// No file size limit - S3 backend can handle large files
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/avif',
  'image/heic',
  'image/heif',
];

// Future: Support all file types for S3 backend
export const ACCEPTED_FILE_TYPES = [
  // Images
  ...ACCEPTED_IMAGE_TYPES,
  // Documents (future support)
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Videos (future support)  
  'video/mp4',
  'video/webm',
  'video/quicktime',
  // Audio (future support)
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
];

// No MAX_FILES limit - Google Drive style unlimited uploads with smart batching
