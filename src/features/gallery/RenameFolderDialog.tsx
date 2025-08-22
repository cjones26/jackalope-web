import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { useApi } from '@/shared/hooks/useApi';
import { Button } from '@/shared/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/Dialog';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/shared/ui/Label';

interface RenameFolderDialogProps {
  open: boolean;
  onClose: () => void;
  folderId: string;
  currentName: string;
  onSuccess?: () => void;
}

export function RenameFolderDialog({
  open,
  onClose,
  folderId,
  currentName,
  onSuccess,
}: RenameFolderDialogProps) {
  const [folderName, setFolderName] = useState(currentName);
  const { fetchWithAuth } = useApi();
  const queryClient = useQueryClient();

  const renameMutation = useMutation({
    mutationFn: async (newName: string) => {
      return fetchWithAuth(`/api/v1/folders/${folderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] });
      queryClient.invalidateQueries({ queryKey: ['folder-breadcrumbs'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });

      toast.success('Folder renamed successfully');
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast.error('Failed to rename folder', {
        description: error?.message || 'Please try again.',
      });
    },
  });

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    const trimmedName = folderName.trim();

    if (!trimmedName) {
      toast.error('Please enter a folder name');
      return;
    }

    if (trimmedName === currentName) {
      onClose();
      return;
    }

    renameMutation.mutate(trimmedName);
  };

  const handleClose = () => {
    if (!renameMutation.isPending) {
      setFolderName(currentName);
      onClose();
    }
  };

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setFolderName(currentName);
    }
  }, [open, currentName]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for the folder "{currentName}".
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name"
                disabled={renameMutation.isPending}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={renameMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={renameMutation.isPending || !folderName.trim()}
            >
              {renameMutation.isPending ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
