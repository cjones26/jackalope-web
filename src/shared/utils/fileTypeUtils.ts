// File type detection and categorization utilities

export type FileCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'pdf'
  | 'spreadsheet'
  | 'presentation'
  | 'archive'
  | 'code'
  | 'text'
  | 'unknown';

export interface FileTypeInfo {
  category: FileCategory;
  mimeType: string;
  extensions: string[];
  canPreview: boolean;
  canGenerateThumbnail: boolean;
}

// MIME type to category mapping
const mimeTypeCategories: Record<string, FileCategory> = {
  // Images
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'image/bmp': 'image',
  'image/tiff': 'image',
  'image/heic': 'image',
  'image/heif': 'image',

  // Videos
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  'video/avi': 'video',
  'video/x-matroska': 'video',
  'video/mkv': 'video',
  'video/x-flv': 'video',
  'video/3gpp': 'video',

  // Audio
  'audio/mpeg': 'audio',
  'audio/mp3': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/aac': 'audio',
  'audio/flac': 'audio',
  'audio/m4a': 'audio',
  'audio/webm': 'audio',

  // Documents
  'application/pdf': 'pdf',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'document',
  'application/vnd.oasis.opendocument.text': 'document',
  'application/rtf': 'document',

  // Spreadsheets
  'application/vnd.ms-excel': 'spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    'spreadsheet',
  'application/vnd.oasis.opendocument.spreadsheet': 'spreadsheet',
  'text/csv': 'spreadsheet',

  // Presentations
  'application/vnd.ms-powerpoint': 'presentation',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'presentation',
  'application/vnd.oasis.opendocument.presentation': 'presentation',

  // Archives
  'application/zip': 'archive',
  'application/x-rar-compressed': 'archive',
  'application/x-7z-compressed': 'archive',
  'application/x-tar': 'archive',
  'application/gzip': 'archive',
  'application/x-bzip2': 'archive',

  // Code
  'text/javascript': 'code',
  'text/typescript': 'code',
  'application/javascript': 'code',
  'application/typescript': 'code',
  'text/html': 'code',
  'text/css': 'code',
  'application/json': 'code',
  'application/xml': 'code',
  'text/xml': 'code',
  'text/x-python': 'code',
  'text/x-java': 'code',
  'text/x-c': 'code',
  'text/x-c++': 'code',
  'text/x-ruby': 'code',
  'text/x-go': 'code',
  'text/x-rust': 'code',

  // Text
  'text/plain': 'text',
  'text/markdown': 'text',
};

// Extension to category mapping (fallback)
const extensionCategories: Record<string, FileCategory> = {
  // Images
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  bmp: 'image',
  tiff: 'image',
  heic: 'image',
  heif: 'image',

  // Videos
  mp4: 'video',
  webm: 'video',
  ogv: 'video', // OGG video format
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  flv: 'video',
  '3gp': 'video',
  m4v: 'video',

  // Audio
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio', // OGG audio format
  oga: 'audio', // OGG audio format
  aac: 'audio',
  flac: 'audio',
  m4a: 'audio',
  wma: 'audio',

  // Documents
  pdf: 'pdf',
  doc: 'document',
  docx: 'document',
  odt: 'document',
  rtf: 'document',
  txt: 'text',

  // Spreadsheets
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  ods: 'spreadsheet',
  csv: 'spreadsheet',

  // Presentations
  ppt: 'presentation',
  pptx: 'presentation',
  odp: 'presentation',

  // Archives
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',
  bz2: 'archive',

  // Code
  js: 'code',
  ts: 'code',
  jsx: 'code',
  tsx: 'code',
  html: 'code',
  css: 'code',
  json: 'code',
  xml: 'code',
  py: 'code',
  java: 'code',
  c: 'code',
  cpp: 'code',
  h: 'code',
  rb: 'code',
  go: 'code',
  rs: 'code',
  php: 'code',
  sh: 'code',
  md: 'text',
};

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length === 1) {
    return '';
  }
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Get file category from MIME type or filename
 */
export function getFileCategory(
  mimeType: string,
  filename?: string,
): FileCategory {
  // Try MIME type first
  const categoryFromMime = mimeTypeCategories[mimeType.toLowerCase()];
  if (categoryFromMime) {
    return categoryFromMime;
  }

  // Try generic MIME type patterns
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  if (mimeType.startsWith('text/')) {
    return 'text';
  }

  // Fallback to extension
  if (filename) {
    const ext = getFileExtension(filename);
    const categoryFromExt = extensionCategories[ext];
    if (categoryFromExt) {
      return categoryFromExt;
    }
  }

  return 'unknown';
}

/**
 * Check if a file type can be previewed in the browser
 */
export function canPreviewFile(category: FileCategory): boolean {
  return ['image', 'video', 'audio', 'pdf', 'text'].includes(category);
}

/**
 * Check if a file type can have a thumbnail generated
 */
export function canGenerateThumbnail(category: FileCategory): boolean {
  return ['image', 'video', 'pdf'].includes(category);
}

/**
 * Check if a file is an image
 */
export function isImage(mimeType: string, filename?: string): boolean {
  return getFileCategory(mimeType, filename) === 'image';
}

/**
 * Check if a file is a video
 */
export function isVideo(mimeType: string, filename?: string): boolean {
  return getFileCategory(mimeType, filename) === 'video';
}

/**
 * Check if a file is audio
 */
export function isAudio(mimeType: string, filename?: string): boolean {
  return getFileCategory(mimeType, filename) === 'audio';
}

/**
 * Get human-readable file type label
 */
export function getFileTypeLabel(category: FileCategory): string {
  const labels: Record<FileCategory, string> = {
    image: 'Image',
    video: 'Video',
    audio: 'Audio',
    document: 'Document',
    pdf: 'PDF',
    spreadsheet: 'Spreadsheet',
    presentation: 'Presentation',
    archive: 'Archive',
    code: 'Code',
    text: 'Text',
    unknown: 'File',
  };

  return labels[category];
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}
