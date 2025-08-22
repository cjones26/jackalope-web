import { Edit, Folder as FolderIcon, Home, Plus, Trash } from 'lucide-react';
import { memo, useState } from 'react';
import { toast } from 'sonner';

import { useApi } from '@/shared/hooks/useApi';
import { Button } from '@/shared/ui/Button';
import { TreeDataItem, TreeView } from '@/shared/ui/components/tree-view';
import { Spinner } from '@/shared/ui/Spinner';

import { DeleteFolderDialog } from './DeleteFolderDialog';
import { useFolderTree } from './hooks/useFolderTree';
import { RenameFolderDialog } from './RenameFolderDialog';

interface FolderTreeViewProps {
  currentFolderId?: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onCreateFolder: () => void;
  onFileDrop?: (
    draggedFileIds: string[],
    targetFolderId: string | null,
  ) => void;
  className?: string;
}

export const FolderTreeView = memo(function FolderTreeView({
  currentFolderId,
  onFolderSelect,
  onCreateFolder,
  onFileDrop,
  className = '',
}: FolderTreeViewProps) {
  const { treeData, isLoading, error, refetch } = useFolderTree();
  const { fetchWithAuth } = useApi();

  // Dialog states
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    folderId: string;
    folderName: string;
  }>({ open: false, folderId: '', folderName: '' });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    folderId: string;
    folderName: string;
  }>({ open: false, folderId: '', folderName: '' });

  const handleTreeSelect = (item: TreeDataItem | undefined) => {
    if (item) {
      onFolderSelect(item.id);
    }
  };

  // Context menu handlers
  const handleRenameFolder = (folderId: string, folderName: string) => {
    setRenameDialog({ open: true, folderId, folderName });
  };

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    setDeleteDialog({ open: true, folderId, folderName });
  };

  // Handle drag and drop for folder moving
  const handleFolderDrop = async (
    sourceFolder: TreeDataItem,
    targetFolder: TreeDataItem,
  ) => {
    // Don't allow dropping on itself or dropping root folder
    if (sourceFolder.id === targetFolder.id || sourceFolder.id === 'root') {
      return;
    }

    // Allow dropping into root (Home folder)

    try {
      // Call API to move folder (using POST method like file moves)
      await fetchWithAuth(`/api/v1/folders/${sourceFolder.id}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent_id: targetFolder.id === 'root' ? null : targetFolder.id,
        }),
      });

      // Refresh the folder tree and wait for it to complete
      await refetch();

      const targetName =
        targetFolder.id === 'root' ? 'Home (top level)' : targetFolder.name;
      toast.success(`Moved "${sourceFolder.name}" to "${targetName}"`);
    } catch (error) {
      console.error('Failed to move folder:', error);
      toast.error('Failed to move folder', {
        description:
          error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  // Handle file drop for moving files to folders
  const handleFileDrop = async (
    draggedFileIds: string[],
    targetFolderId: string | null,
  ) => {
    if (onFileDrop) {
      await onFileDrop(
        draggedFileIds,
        targetFolderId === 'root' ? null : targetFolderId,
      );
      await refetch();
    }
  };

  // Create context menu for a folder
  const createContextMenu = (folderId: string, folderName: string) => {
    // Don't show context menu for root/home
    if (folderId === 'root') {
      return undefined;
    }

    return [
      {
        label: 'Rename',
        icon: <Edit className="h-4 w-4" />,
        onClick: () => handleRenameFolder(folderId, folderName),
      },
      {
        label: 'Delete',
        icon: <Trash className="h-4 w-4" />,
        onClick: () => handleDeleteFolder(folderId, folderName),
        variant: 'destructive' as const,
        separator: true,
      },
    ];
  };

  // Enhance tree data with context menus and drag-drop
  const enhanceTreeDataWithContextMenu = (
    items: TreeDataItem[],
  ): TreeDataItem[] => {
    return items.map((item) => ({
      ...item,
      contextMenu: createContextMenu(item.id, item.name),
      draggable: true, // Enable dragging for all folders
      droppable: true, // Enable dropping on all folders
      children: item.children
        ? enhanceTreeDataWithContextMenu(item.children)
        : undefined,
    }));
  };

  // Add root/home item at the top
  const fullTreeData: TreeDataItem[] = [
    {
      id: 'root',
      name: 'Home',
      icon: Home,
      selectedIcon: Home,
      onClick: () => onFolderSelect(null),
      droppable: true, // Allow dropping into root
      draggable: false, // Don't allow dragging root
    },
    ...enhanceTreeDataWithContextMenu(treeData),
  ];

  if (isLoading) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Folders</h2>
          <Button size="sm" variant="outline" onClick={onCreateFolder}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <Spinner />
          <p className="text-sm text-muted-foreground">Loading folders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Folders</h2>
          <Button size="sm" variant="outline" onClick={onCreateFolder}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            Failed to load folders. Please refresh.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Folders</h2>
        <Button size="sm" variant="outline" onClick={onCreateFolder}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-auto">
        <TreeView
          data={fullTreeData}
          initialSelectedItemId={
            currentFolderId === null ? 'root' : currentFolderId
          }
          onSelectChange={handleTreeSelect}
          defaultNodeIcon={FolderIcon}
          defaultLeafIcon={FolderIcon}
          onDocumentDrag={handleFolderDrop}
          onFileDrop={handleFileDrop}
          className="h-full"
        />
      </div>

      {/* Dialogs */}
      <RenameFolderDialog
        open={renameDialog.open}
        onClose={() => {
          setRenameDialog({ open: false, folderId: '', folderName: '' });
        }}
        folderId={renameDialog.folderId}
        currentName={renameDialog.folderName}
        onSuccess={() => {
          refetch();
        }}
      />

      <DeleteFolderDialog
        open={deleteDialog.open}
        onClose={() =>
          setDeleteDialog({ open: false, folderId: '', folderName: '' })
        }
        folderId={deleteDialog.folderId}
        folderName={deleteDialog.folderName}
        onSuccess={() => {
          // Always navigate to home/root when deleting any folder
          onFolderSelect(null);
          refetch();
        }}
      />
    </div>
  );
});
