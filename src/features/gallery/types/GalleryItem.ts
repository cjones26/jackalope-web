export interface GalleryItem {
  _id: string;
  assetId: string;
  publicId: string;
  title: string;
  description: string;
  tags: string[];
  format: string;
  width?: number; // Optional for non-image files
  height?: number; // Optional for non-image files
  duration?: number; // For video/audio files
  fileSize?: number; // Size in bytes
  mimeType: string; // More generic than format
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
  folder_id: string | null;
  hasThumbnail: boolean;
}
