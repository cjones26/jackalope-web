import { Folder, MoreVertical } from 'lucide-react';

import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/DropdownMenu';

import { Folder as FolderType } from './types/Folder';

interface FolderGridProps {
  folders: FolderType[];
  onFolderClick: (folderId: string) => void;
  onFolderRename?: (folderId: string, newName: string) => void;
  onFolderDelete?: (folderId: string) => void;
  onFolderMove?: (folderId: string) => void;
}

export function FolderGrid({
  folders,
  onFolderClick,
  onFolderRename,
  onFolderDelete,
  onFolderMove,
}: FolderGridProps) {
  if (folders.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
      {folders.map((folder) => (
        <Card key={folder.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center space-x-3 cursor-pointer flex-1"
              onClick={() => onFolderClick(folder.id)}
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <Folder className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{folder.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(folder.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {(onFolderRename || onFolderDelete || onFolderMove) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onFolderRename && (
                    <DropdownMenuItem
                      onClick={() => onFolderRename(folder.id, folder.name)}
                    >
                      Rename
                    </DropdownMenuItem>
                  )}
                  {onFolderMove && (
                    <DropdownMenuItem onClick={() => onFolderMove(folder.id)}>
                      Move
                    </DropdownMenuItem>
                  )}
                  {onFolderDelete && (
                    <DropdownMenuItem
                      onClick={() => onFolderDelete(folder.id)}
                      className="text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
