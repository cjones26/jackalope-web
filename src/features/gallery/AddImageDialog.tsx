import { X } from 'lucide-react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/Dialog';

import { UnifiedImageUpload } from './UnifiedImageUpload';

interface AddImageDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddImageDialog({
  open,
  onClose,
  onSuccess,
}: AddImageDialogProps) {
  // Handle dialog close
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add Images</DialogTitle>
          <DialogDescription>
            Upload one or more images to your gallery. Drag and drop multiple
            files or select them individually.
          </DialogDescription>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <UnifiedImageUpload onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}
