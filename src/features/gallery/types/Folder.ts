export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  path: string;
  created_at: string;
  updated_at: string;
}

import { GalleryImage } from './GalleryImage';

export interface PaginationMetadata {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  folders_count: number;
  files_count: number;
}

export interface FolderContentsResponse {
  folders: Folder[];
  files: GalleryImage[];
  pagination?: PaginationMetadata;
  total_items: number; // Legacy field for backwards compatibility
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
  path: string;
}