import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Save,
  Trash,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { GalleryImage } from '@/features/gallery/types/GalleryImage';
import { useApi } from '@/shared/hooks/useApi';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/Alert';
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
import { Button } from '@/shared/ui/Button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/Dialog';
import { Form, FormField } from '@/shared/ui/Form';
import { FormInput, FormTextarea } from '@/shared/ui/Form/Form';
import { TagInput } from '@/shared/ui/TagInput';

const imageEditSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type ImageEditFormData = z.infer<typeof imageEditSchema>;

interface ImageDetailsProps {
  image: GalleryImage;
  open: boolean;
  onClose: () => void;
  onUpdate: (deletedImageId?: string) => void;
  // May not be the best solution but allows for navigation between images
  allImages: GalleryImage[];
}

export function ImageDetails({
  image,
  open,
  onClose,
  onUpdate,
  allImages,
}: ImageDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<GalleryImage>(image);
  const { fetchWithAuth } = useApi();

  // Get current image index in the array
  const currentIndex = allImages.findIndex(
    (img) => img._id === currentImage._id
  );

  // Navigation functions
  const navigateToNext = () => {
    if (currentIndex < allImages.length - 1 && !isEditing) {
      setCurrentImage(allImages[currentIndex + 1]);
    }
  };

  const navigateToPrevious = () => {
    if (currentIndex > 0 && !isEditing) {
      setCurrentImage(allImages[currentIndex - 1]);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable navigation when editing
      if (isEditing) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        navigateToPrevious();
      } else if (e.key === 'ArrowRight') {
        navigateToNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isEditing, allImages]);

  // Form setup
  const form = useForm<ImageEditFormData>({
    resolver: zodResolver(imageEditSchema),
    defaultValues: {
      title: currentImage.title || '',
      description: currentImage.description || '',
      tags: currentImage.tags || [],
    },
  });

  const handleSubmit = (data: ImageEditFormData) => {
    updateMutation.mutate(data);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
  };

  const formatUploadDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Reset form when current image changes
  useEffect(() => {
    if (!isEditing) {
      form.reset({
        title: currentImage.title || '',
        description: currentImage.description || '',
        tags: currentImage.tags || [],
      });
    }
  }, [currentImage, form, isEditing]);

  // Update image metadata mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ImageEditFormData) => {
      return fetchWithAuth(`/gallery/${currentImage._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setIsEditing(false);
      onUpdate();
    },
  });

  // Delete image mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return fetchWithAuth(`/gallery/${currentImage._id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);

      // Pass the deleted image ID to the parent component
      const deletedId = currentImage._id;
      onClose();
      onUpdate(deletedId);
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="wrap-break-word">
              {isEditing
                ? 'Edit Image Details'
                : currentImage.title || 'Image Details'}
            </DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          {isEditing ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormInput
                      type="text"
                      label="Title"
                      placeholder="Image title"
                      {...field}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormTextarea
                      label="Description"
                      placeholder="Image description"
                      className="min-h-24"
                      {...field}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Tags</label>
                      <TagInput
                        placeholder="Add tags (press Enter after each tag)"
                        tags={field.value || []}
                        onTagsChange={field.onChange}
                      />
                    </div>
                  )}
                />
                {updateMutation.isError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      There was an error updating the image details. Please try
                      again.
                    </AlertDescription>
                  </Alert>
                ) : null}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      !form.formState.isDirty || updateMutation.isPending
                    }
                  >
                    {updateMutation.isPending ? (
                      'Saving...'
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative rounded-md overflow-hidden">
                {/* Navigation buttons */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 p-2 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={navigateToPrevious}
                    disabled={currentIndex <= 0}
                    className="bg-black/30 hover:bg-black/50 text-white rounded-full"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    <span className="sr-only">Previous image</span>
                  </Button>
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 p-2 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={navigateToNext}
                    disabled={currentIndex >= allImages.length - 1}
                    className="bg-black/30 hover:bg-black/50 text-white rounded-full"
                  >
                    <ChevronRight className="h-5 w-5" />
                    <span className="sr-only">Next image</span>
                  </Button>
                </div>
                <img
                  src={currentImage.url}
                  alt={currentImage.title || 'Gallery image'}
                  className="w-full h-auto object-contain"
                />
                {/* Navigation indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                  {currentIndex + 1} / {allImages.length}
                </div>
              </div>
              <div className="space-y-4">
                {currentImage.title && (
                  <div>
                    <h3 className="text-lg font-medium">Title</h3>
                    <p className="wrap-break-word">{currentImage.title}</p>
                  </div>
                )}
                {currentImage.description && (
                  <div>
                    <h3 className="text-lg font-medium">Description</h3>
                    <p className="whitespace-pre-wrap">
                      {currentImage.description}
                    </p>
                  </div>
                )}
                {currentImage.tags && currentImage.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium">Tags</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {currentImage.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-medium">Upload Date</h3>
                  <p>{formatUploadDate(currentImage.uploadedAt)}</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium">Image Details</h3>
                  <p>
                    {currentImage.width} × {currentImage.height} pixels •{' '}
                    {currentImage.format.toUpperCase()}
                  </p>
                </div>
                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              image from your gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
