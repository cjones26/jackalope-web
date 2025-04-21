export interface GalleryImage {
  _id: string;
  assetId: string;
  publicId: string;
  title: string;
  description: string;
  tags: string[];
  format: string;
  width: number;
  height: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}
