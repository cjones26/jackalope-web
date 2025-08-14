import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

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
import { Form, FormField } from '@/shared/ui/Form';
import { FormInput } from '@/shared/ui/Form/Form';

const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100, 'Folder name too long'),
});

type CreateFolderData = z.infer<typeof createFolderSchema>;

interface CreateFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentId: string | null;
}

export function CreateFolderDialog({ open, onClose, onSuccess, parentId }: CreateFolderDialogProps) {
  const { fetchWithAuth } = useApi();

  const form = useForm<CreateFolderData>({
    resolver: zodResolver(createFolderSchema),
    defaultValues: {
      name: '',
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (data: CreateFolderData) => {
      return fetchWithAuth('/api/v1/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          parent_id: parentId,
        }),
      });
    },
    onSuccess: () => {
      toast.success('Folder created successfully');
      form.reset();
      onClose();
      onSuccess();
    },
    onError: (error: any) => {
      toast.error('Failed to create folder', {
        description: error.statusText || 'Please try again',
      });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    createFolderMutation.mutate(data);
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            {parentId ? 'Create a new subfolder' : 'Create a new folder in the root directory'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormInput
                  label="Folder Name"
                  placeholder="Enter folder name"
                  {...field}
                />
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={createFolderMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createFolderMutation.isPending}
              >
                {createFolderMutation.isPending ? 'Creating...' : 'Create Folder'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}