import { X } from 'lucide-react';
import { useState } from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/Dialog';
import { Label } from '@/shared/ui/Label';
import { Switch } from '@/shared/ui/Switch';

import { MultiImageUpload } from './MultiImageUpload';
import { SingleImageUpload } from './SingleImageUpload';

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
  const [isMultiUpload, setIsMultiUpload] = useState(false);

  // Handle dialog close
  const handleClose = () => {
    setIsMultiUpload(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Add {isMultiUpload ? 'Multiple Images' : 'New Image'}
          </DialogTitle>
          <DialogDescription>
            Upload {isMultiUpload ? 'multiple images' : 'an image'} to your
            gallery.
            {!isMultiUpload && ' You can add a title, description, and tags.'}
          </DialogDescription>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="flex items-center space-x-2 mb-4">
          <Label htmlFor="multi-upload-mode" className="text-sm cursor-pointer">
            Multiple images
          </Label>
          <Switch
            id="multi-upload-mode"
            checked={isMultiUpload}
            onCheckedChange={setIsMultiUpload}
          />
        </div>

        {isMultiUpload ? (
          <MultiImageUpload onSuccess={onSuccess} />
        ) : (
          <SingleImageUpload onSuccess={onSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
}
