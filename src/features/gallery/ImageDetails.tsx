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
    if (!open) return;

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
  }, [currentIndex, isEditing, allImages, open]);

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

  if (!open) return null;

  return (
    <>
      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
        {/* Header with title and close button */}
        <div className="flex items-center justify-between border-b p-4 h-16">
          <h2 className="text-xl font-semibold truncate max-w-2xl">
            {isEditing ? 'Edit Image' : currentImage.title || 'Image Details'}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-muted"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Image section (left 3/4) */}
          <div className="w-3/4 relative bg-black flex items-center justify-center">
            {/* Navigation buttons */}
            <Button
              variant="ghost"
              size="icon"
              onClick={navigateToPrevious}
              disabled={currentIndex <= 0 || isEditing}
              className="absolute left-4 bg-black/30 hover:bg-black/50 text-white rounded-full z-10"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={navigateToNext}
              disabled={currentIndex >= allImages.length - 1 || isEditing}
              className="absolute right-4 bg-black/30 hover:bg-black/50 text-white rounded-full z-10"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            {/* Image with max dimensions to maintain aspect ratio */}
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={currentImage.url}
                alt={currentImage.title || 'Gallery image'}
                className="max-h-full max-w-full object-contain"
              />

              {/* Navigation indicator */}
              {!isEditing && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                  {currentIndex + 1} / {allImages.length}
                </div>
              )}
            </div>
          </div>

          {/* Details section (right 1/4) */}
          <div className="w-1/4 overflow-y-auto p-6 border-l">
            {isEditing ? (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-6"
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
                        className="min-h-32"
                        {...field}
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <TagInput
                        label="Tags"
                        placeholder="Add tags (press Enter after each tag)"
                        tags={field.value || []}
                        onTagsChange={field.onChange}
                      />
                    )}
                  />
                  {updateMutation.isError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        There was an error updating the image details.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex items-center justify-between gap-4 pt-4 mt-8">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={updateMutation.isPending}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        !form.formState.isDirty || updateMutation.isPending
                      }
                      className="flex-1"
                    >
                      {updateMutation.isPending ? (
                        'Saving...'
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-primary mb-1">
                    Details
                  </h3>
                  <div className="space-y-4">
                    {currentImage.title && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Title
                        </h4>
                        <p className="wrap-break-word text-lg">
                          {currentImage.title}
                        </p>
                      </div>
                    )}

                    {currentImage.description && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Description
                        </h4>
                        <p className="whitespace-pre-wrap">
                          {currentImage.description}
                        </p>
                      </div>
                    )}

                    {currentImage.tags && currentImage.tags.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Tags
                        </h4>
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
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-primary mb-1">
                    Metadata
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Format
                      </h4>
                      <p>{currentImage.format.toUpperCase()}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Dimensions
                      </h4>
                      <p>
                        {currentImage.width} × {currentImage.height} px
                      </p>
                    </div>
                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Upload Date
                      </h4>
                      <p>{formatUploadDate(currentImage.uploadedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
