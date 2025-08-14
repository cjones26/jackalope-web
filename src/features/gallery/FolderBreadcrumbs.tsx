import { ChevronRight, Home } from 'lucide-react';

import { Button } from '@/shared/ui/Button';

import { BreadcrumbItem } from './types/Folder';

interface FolderBreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
}

export function FolderBreadcrumbs({
  breadcrumbs,
  onNavigate,
}: FolderBreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-1 text-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(null)}
        className="p-1"
      >
        <Home className="h-4 w-4" />
      </Button>

      {breadcrumbs.map((item, index) => (
        <div key={item.id} className="flex items-center space-x-1">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(item.id)}
            className="p-1 h-auto font-normal"
            disabled={index === breadcrumbs.length - 1}
          >
            {item.name}
          </Button>
        </div>
      ))}
    </nav>
  );
}
