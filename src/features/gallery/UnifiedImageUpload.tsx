import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Trash2, Upload, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES,
} from '@/shared/constants/FileConstants';
import { useApi } from '@/shared/hooks/useApi';
import { Button } from '@/shared/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/Card';
import { DialogFooter } from '@/shared/ui/Dialog';
import { Form, FormField } from '@/shared/ui/Form';
import { FormInput, FormTextarea } from '@/shared/ui/Form/Form';
import { Progress } from '@/shared/ui/Progress';
import { TagInput } from '@/shared/ui/TagInput';
import { cn } from '@/shared/ui/utils';

// Define the schema for an individual image with metadata
const imageWithMetadataSchema = z.object({
  id: z.string(),
  file: z
    .custom<File>((val) => val instanceof File, {
      message: 'Invalid file',
    })
    .refine(
      (file) => file.size <= MAX_FILE_SIZE,
      'File size must be less than 10MB'
    )
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      'Only .jpg, .jpeg, .png, .webp, and .gif files are accepted'
    ),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Define the schema for the entire form
const uploadFormSchema = z.object({
  images: z
    .array(imageWithMetadataSchema)
    .min(1, { message: 'Please select at least one image' })
    .max(MAX_FILES, {
      message: `You can only upload up to ${MAX_FILES} images at once`,
    }),
});

type UploadFormData = z.infer<typeof uploadFormSchema>;

interface UnifiedImageUploadProps {
  onSuccess: () => void;
}

export function UnifiedImageUpload({ onSuccess }: UnifiedImageUploadProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(
    null
  );
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<Map<string, string>>(new Map());
  const { fetchWithAuth } = useApi();

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      images: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'images',
  });

  // Get preview URL for a file
  const getPreviewUrl = useCallback((file: File): string => {
    // Create a unique key for this file
    const fileKey = `${file.name}-${file.size}-${file.lastModified}`;

    // Return existing URL if available
    if (previewUrlsRef.current.has(fileKey)) {
      return previewUrlsRef.current.get(fileKey)!;
    }

    // Create and store new URL
    const url = URL.createObjectURL(file);
    previewUrlsRef.current.set(fileKey, url);
    return url;
  }, []);

  // Handle file selection
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    const currentCount = fields.length;

    // Check if adding these files would exceed the limit
    if (currentCount + filesArray.length > MAX_FILES) {
      const availableSlots = MAX_FILES - currentCount;

      if (availableSlots <= 0) {
        form.setError('images', {
          type: 'manual',
          message: `You can only upload up to ${MAX_FILES} images at once`,
        });
        return;
      }

      filesArray.splice(availableSlots); // Truncate the array
      form.setError('images', {
        type: 'manual',
        message: `Only ${availableSlots} files were added as the maximum is ${MAX_FILES} files`,
      });
    }

    // Add the files to the form
    filesArray.forEach((file) => {
      append({
        id: nanoid(),
        file,
        title: '',
        description: '',
        tags: [],
      });
    });

    // If this is the first image being added, select it for editing
    if (currentCount === 0 && filesArray.length > 0) {
      setCurrentImageIndex(0);
    }
  };

  // Handle removing a file
  const handleRemoveFile = (index: number) => {
    remove(index);

    // Adjust current image index if needed
    if (currentImageIndex === index) {
      if (fields.length <= 1) {
        setCurrentImageIndex(null);
      } else if (index === fields.length - 1) {
        setCurrentImageIndex(index - 1);
      }
    } else if (currentImageIndex !== null && currentImageIndex > index) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  // Handle clearing all files
  const handleClearFiles = () => {
    form.setValue('images', []);
    setCurrentImageIndex(null);
  };

  // Open file dialog
  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  // Navigation between images
  const navigateToNextImage = () => {
    if (currentImageIndex !== null && currentImageIndex < fields.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const navigateToPreviousImage = () => {
    if (currentImageIndex !== null && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData) => {
      const responses = [];

      // Set up a progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 300);

      try {
        // Upload each image
        for (const image of data.images) {
          const formData = new FormData();
          formData.append('images', image.file);

          if (image.title) {
            formData.append('title', image.title);
          }

          if (image.description) {
            formData.append('description', image.description);
          }

          if (image.tags && image.tags.length > 0) {
            formData.append('tags', JSON.stringify(image.tags));
          }

          const response = await fetchWithAuth('/gallery', {
            method: 'POST',
            body: formData,
          });

          responses.push(response);
        }

        clearInterval(progressInterval);
        setUploadProgress(100);

        return responses;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: () => {
      resetForm();
      onSuccess();
    },
  });

  // Form submission
  const onSubmit = form.handleSubmit((data) => {
    uploadMutation.mutate(data);
  });

  // Reset form state
  const resetForm = () => {
    form.reset({ images: [] });
    setCurrentImageIndex(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
    const previewUrlsMap = previewUrlsRef.current;
    return () => {
      // Clean up all object URLs
      previewUrlsMap.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      previewUrlsMap.clear();
    };
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column: File selection and list */}
          <div className="md:col-span-1 space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleOpenFileDialog}
              className={cn(
                'border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors',
                isDragging
                  ? 'border-primary bg-primary/10'
                  : fields.length > 0
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5'
              )}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFilesSelected(e.target.files)}
                multiple
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Drag & drop images here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Up to {MAX_FILES} images, max 10MB each
                  </p>
                </div>
              </div>
            </div>

            {form.formState.errors.images?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.images.message}
              </p>
            )}

            {fields.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    {fields.length} {fields.length === 1 ? 'image' : 'images'}{' '}
                    selected
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearFiles}
                    className="h-8 px-2"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 rounded-md border p-2">
                  {fields.map((field, index) => {
                    const image = form.getValues(`images.${index}`);

                    return (
                      <div
                        key={field.id}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-md',
                          currentImageIndex === index
                            ? 'bg-primary/10'
                            : 'bg-muted/40',
                          'hover:bg-primary/5 cursor-pointer'
                        )}
                        onClick={() => setCurrentImageIndex(index)}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <div className="w-8 h-8 rounded overflow-hidden bg-muted">
                            <img
                              src={getPreviewUrl(image.file)}
                              alt={`Preview ${index}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm truncate max-w-[120px]">
                              {image.title || image.file.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {(image.file.size / 1024 / 1024).toFixed(1)}MB
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(index);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right column: Image preview and metadata editing */}
          <div className="md:col-span-2">
            {currentImageIndex !== null && fields[currentImageIndex] ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Edit Image Details
                    </CardTitle>
                    <div className="space-x-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={navigateToPreviousImage}
                        disabled={currentImageIndex === 0}
                        className="h-8 w-8"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={navigateToNextImage}
                        disabled={currentImageIndex === fields.length - 1}
                        className="h-8 w-8"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Image {currentImageIndex + 1} of {fields.length}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative w-full h-[200px] overflow-hidden rounded-md bg-muted flex items-center justify-center">
                    <img
                      src={getPreviewUrl(
                        form.getValues(`images.${currentImageIndex}.file`)
                      )}
                      alt={`Preview ${currentImageIndex}`}
                      className="max-w-full max-h-[200px] object-contain"
                    />
                  </div>
                  <div className="space-y-3">
                    <FormField
                      key={`title-field-${currentImageIndex}`}
                      control={form.control}
                      name={`images.${currentImageIndex}.title`}
                      render={({ field }) => (
                        <FormInput
                          type="text"
                          label="Title"
                          placeholder="Image title (optional)"
                          {...field}
                        />
                      )}
                    />
                    <FormField
                      key={`description-field-${currentImageIndex}`}
                      control={form.control}
                      name={`images.${currentImageIndex}.description`}
                      render={({ field }) => (
                        <FormTextarea
                          label="Description"
                          placeholder="Image description (optional)"
                          className="min-h-20"
                          {...field}
                        />
                      )}
                    />
                    <FormField
                      key={`tags-field-${currentImageIndex}`}
                      control={form.control}
                      name={`images.${currentImageIndex}.tags`}
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
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 border-2 border-dashed rounded-md border-muted-foreground/25">
                <div className="text-center">
                  <h3 className="text-lg font-medium">No Images Selected</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add image(s) using the panel on the left to edit their
                    details
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenFileDialog}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select Images
                </Button>
              </div>
            )}
          </div>
        </div>

        {uploadMutation.isPending && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading images...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {uploadMutation.isError && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            Upload failed. Please try again.
          </div>
        )}

        <DialogFooter>
          <Button
            type="submit"
            disabled={fields.length === 0 || uploadMutation.isPending}
            className="gap-1"
          >
            {uploadMutation.isPending ? (
              'Uploading...'
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload {fields.length > 0 && `(${fields.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
