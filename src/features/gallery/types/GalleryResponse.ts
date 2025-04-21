import { GalleryImage } from './GalleryImage';

export interface GalleryResponse {
  images: GalleryImage[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}
