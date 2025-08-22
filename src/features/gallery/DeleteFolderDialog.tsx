import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash } from 'lucide-react';
import { toast } from 'sonner';

import { useApi } from '@/shared/hooks/useApi';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/AlertDialog';

interface DeleteFolderDialogProps {
  open: boolean;
  onClose: () => void;
  folderId: string;
  folderName: string;
  onSuccess?: () => void;
}

export function DeleteFolderDialog({
  open,
  onClose,
  folderId,
  folderName,
  onSuccess,
}: DeleteFolderDialogProps) {
  const { fetchWithAuth } = useApi();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (targetFolderId: string) => {
      if (!targetFolderId) {
        throw new Error('Folder ID is required');
      }
      return fetchWithAuth(`/api/v1/folders/${targetFolderId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh folder tree and content
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
      queryClient.invalidateQueries({ queryKey: ['folder-breadcrumbs'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });

      toast.success('Folder deleted successfully');
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast.error('Failed to delete folder', {
        description:
          error?.message || 'The folder may contain files or subfolders.',
      });
    },
  });

  const handleDelete = () => {
    if (!folderId) {
      toast.error('Invalid folder ID');
      return;
    }
    deleteMutation.mutate(folderId);
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash className="h-5 w-5 text-destructive" />
            Delete Folder
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the folder "
            <strong>{folderName}</strong>"?
            <br />
            <br />
            This action cannot be undone. All files and subfolders within this
            folder will also be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending || !folderId}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Folder'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
