// File type icon component
// Displays appropriate icons for different file types

import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  type LucideIcon,
  Presentation,
} from 'lucide-react';

import { cn } from '@/shared/ui/utils';
import { type FileCategory } from '@/shared/utils/fileTypeUtils';

interface FileIconProps {
  category: FileCategory;
  className?: string;
  size?: number;
}

// Map file categories to Lucide icons
const categoryIcons: Record<FileCategory, LucideIcon> = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
  pdf: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  archive: FileArchive,
  code: FileCode,
  text: FileText,
  unknown: File,
};

// Color classes for each file type
const categoryColors: Record<FileCategory, string> = {
  image: 'text-blue-500',
  video: 'text-purple-500',
  audio: 'text-pink-500',
  document: 'text-blue-600',
  pdf: 'text-red-500',
  spreadsheet: 'text-green-500',
  presentation: 'text-orange-500',
  archive: 'text-yellow-600',
  code: 'text-gray-500',
  text: 'text-gray-600',
  unknown: 'text-gray-400',
};

export function FileIcon({ category, className, size = 24 }: FileIconProps) {
  const Icon = categoryIcons[category];
  const colorClass = categoryColors[category];

  return (
    <Icon className={cn(colorClass, className)} size={size} strokeWidth={1.5} />
  );
}

// Background color variants for thumbnail placeholders
const categoryBackgrounds: Record<FileCategory, string> = {
  image: 'bg-blue-50 dark:bg-blue-950/30',
  video: 'bg-purple-50 dark:bg-purple-950/30',
  audio: 'bg-pink-50 dark:bg-pink-950/30',
  document: 'bg-blue-50 dark:bg-blue-950/30',
  pdf: 'bg-red-50 dark:bg-red-950/30',
  spreadsheet: 'bg-green-50 dark:bg-green-950/30',
  presentation: 'bg-orange-50 dark:bg-orange-950/30',
  archive: 'bg-yellow-50 dark:bg-yellow-950/30',
  code: 'bg-gray-50 dark:bg-gray-950/30',
  text: 'bg-gray-50 dark:bg-gray-950/30',
  unknown: 'bg-gray-50 dark:bg-gray-950/30',
};

interface FileIconPlaceholderProps {
  category: FileCategory;
  className?: string;
  iconSize?: number;
}

/**
 * File icon placeholder for non-image files
 * Used as thumbnail replacement in galleries
 */
export function FileIconPlaceholder({
  category,
  className,
  iconSize = 48,
}: FileIconPlaceholderProps) {
  const backgroundClass = categoryBackgrounds[category];

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        backgroundClass,
        className,
      )}
    >
      <FileIcon category={category} size={iconSize} />
    </div>
  );
}
