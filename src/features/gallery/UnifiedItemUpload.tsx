import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ACCEPTED_FILE_TYPES } from '@/shared/constants/FileConstants';
import { useSupabase } from '@/shared/context/supabase';
import { ResumableUploader } from '@/shared/services/ResumableUploader';
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

// Define the schema for an individual item with metadata
const itemWithMetadataSchema = z.object({
  id: z.string(),
  file: z
    .custom<File>((val) => val instanceof File, {
      message: 'Invalid file',
    })
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      'Supported file types: images, videos, documents, and audio files',
    ),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Define the schema for the entire form
const uploadFormSchema = z.object({
  items: z
    .array(itemWithMetadataSchema)
    .min(1, { message: 'Please select at least one file' }),
  // No max limit - Google Drive style unlimited uploads
});

type UploadFormData = z.infer<typeof uploadFormSchema>;

interface UnifiedItemUploadProps {
  onSuccess: () => void;
  folderId?: string | null;
}

// Virtualized file list component for handling large uploads efficiently
interface VirtualizedFileListProps {
  fields: any[];
  form: any;
  getPreviewUrl: (file: File) => string;
  handleRemoveFile: (index: number) => void;
}

function VirtualizedFileList({
  fields,
  form,
  getPreviewUrl,
  handleRemoveFile,
}: VirtualizedFileListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: fields.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52, // Estimated height of each row (48px + 4px gap)
    overscan: 10, // Render 10 extra items outside visible area for smooth scrolling
  });

  return (
    <div
      ref={parentRef}
      className="h-[200px] overflow-auto border rounded-md p-3"
      style={{
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const field = fields[virtualItem.index];
          const item = form.getValues(`items.${virtualItem.index}`);

          return (
            <div
              key={field.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={getPreviewUrl(item.file)}
                      alt={`Preview ${virtualItem.index}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {item.file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(item.file.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(virtualItem.index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function UnifiedItemUpload({
  onSuccess,
  folderId,
}: UnifiedItemUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<Map<string, string>>(new Map());
  const { session } = useSupabase();

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
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
    if (!files || files.length === 0) {
      return;
    }

    const filesArray = Array.from(files);

    // Google Drive style: Accept unlimited files
    // Large batches will be processed efficiently with progress indicators

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
  };

  // Handle removing a file
  const handleRemoveFile = (index: number) => {
    remove(index);
  };

  // Handle clearing all files
  const handleClearFiles = () => {
    form.setValue('items', []);
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

  // Upload mutation with Google Drive-style batch processing
  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData) => {
      const responses = [];
      const totalItems = data.items.length;

      // Google Drive style: Process in batches for better performance and UX
      const BATCH_SIZE = 5; // Process 5 files concurrently
      const batches = [];

      for (let i = 0; i < data.items.length; i += BATCH_SIZE) {
        batches.push(data.items.slice(i, i + BATCH_SIZE));
      }

      console.log(
        `📦 Processing ${totalItems} files in ${batches.length} batches (${BATCH_SIZE} concurrent uploads)`,
      );

      // Initialize progress tracking

      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      let completedFiles = 0;

      // Process batches sequentially, but files within each batch concurrently
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(
          `📤 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} files)`,
        );

        // Process all files in current batch concurrently
        const batchPromises = batch.map(async (item) => {
          try {
            const uploader = new ResumableUploader(
              import.meta.env.VITE_API_URL,
              session.access_token,
            );

            const result = await uploader.uploadFile(item.file, (progress) => {
              // Update progress for this specific file
              const fileProgress =
                ((completedFiles + progress / 100) / totalItems) * 100;
              setUploadProgress(Math.min(fileProgress, 95));
            });

            if (!result.success) {
              console.error(
                `Upload failed for ${item.file.name}:`,
                result.error,
              );
              throw new Error(result.error || 'Upload failed');
            }

            // If we have a folder ID, move the file to that folder
            if (folderId && result.uploadId) {
              try {
                await fetch(
                  `${import.meta.env.VITE_API_URL}/api/v1/folders/files/${result.uploadId}/move`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ folder_id: folderId }),
                  },
                );
              } catch (moveError) {
                console.warn('Failed to move file to folder:', moveError);
                // Don't fail the entire upload if folder assignment fails
              }
            }

            console.log(`✅ Completed: ${item.file.name}`);
            completedFiles++;
            return { success: true, uploadId: result.uploadId };
          } catch (error) {
            console.error(`❌ Failed to upload ${item.file.name}:`, error);
            throw error;
          }
        });

        // Wait for all files in current batch to complete
        const batchResults = await Promise.all(batchPromises);
        responses.push(...batchResults);

        // Update progress after batch completion
        setUploadProgress((completedFiles / totalItems) * 100);
      }

      setUploadProgress(100);
      return responses;
    },
    onSuccess: (responses) => {
      resetForm();

      const itemCount = responses.length;

      // Google Drive style success message with more details for large uploads
      if (itemCount > 10) {
        toast.success('🎉 Bulk Upload Complete!', {
          description: `Successfully uploaded ${itemCount} items using batch processing`,
          duration: 5000,
        });
      } else {
        toast.success('Upload Complete!', {
          description: `Successfully uploaded ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`,
        });
      }

      onSuccess();
    },
  });

  // Form submission
  const onSubmit = form.handleSubmit(
    (data) => {
      console.log('📤 Form submitted successfully with data:', data);
      uploadMutation.mutate(data);
    },
    (errors) => {
      console.error('❌ Form validation errors:', errors);
    },
  );

  // Reset form state
  const resetForm = () => {
    form.reset({ items: [] });
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

  // Imgur-style interface logic
  const isNoFiles = fields.length === 0;
  const isSingleFile = fields.length === 1;
  const isMultipleFiles = fields.length > 1;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        {/* No files selected - Show drag & drop zone */}
        {isNoFiles && (
          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleOpenFileDialog}
              className={cn(
                'border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors',
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5',
              )}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFilesSelected(e.target.files)}
                multiple
                accept={ACCEPTED_FILE_TYPES.join(',')}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-3">
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    Drag & drop files here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Upload any number of files, no size limits
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Single item: full metadata editing • Multiple items: quick
                    upload
                  </p>
                </div>
              </div>
            </div>

            {form.formState.errors.items?.message && (
              <p className="text-sm text-destructive mt-2">
                {form.formState.errors.items.message}
              </p>
            )}
          </div>
        )}

        {/* Single file - Show detailed metadata form (existing behavior) */}
        {isSingleFile && (
          <div className="space-y-6">
            {/* File preview and actions */}
            <div className="flex items-center justify-between p-4 border rounded-md bg-muted/20">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded overflow-hidden bg-muted">
                  <img
                    src={getPreviewUrl(fields[0].file)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium">{fields[0].file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(fields[0].file.size / 1024 / 1024).toFixed(1)}MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearFiles}
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>

            {/* Metadata form */}
            <Card>
              <CardHeader>
                <CardTitle>Item Details</CardTitle>
                <CardDescription>
                  Add optional metadata for your item
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative w-full h-[300px] overflow-hidden rounded-md bg-muted flex items-center justify-center">
                  <img
                    src={getPreviewUrl(fields[0].file)}
                    alt="Preview"
                    className="max-w-full max-h-[300px] object-contain"
                  />
                </div>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="items.0.title"
                    render={({ field }) => (
                      <FormInput
                        type="text"
                        label="Title"
                        placeholder="Item title (optional)"
                        {...field}
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="items.0.description"
                    render={({ field }) => (
                      <FormTextarea
                        label="Description"
                        placeholder="Item description (optional)"
                        className="min-h-20"
                        {...field}
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="items.0.tags"
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
          </div>
        )}

        {/* Multiple files - Imgur-style simple interface */}
        {isMultipleFiles && (
          <div className="space-y-6">
            {/* Hidden FormFields to register all items with react-hook-form */}
            <div className="hidden">
              {fields.map((field, index) => (
                <div key={field.id}>
                  <FormField
                    control={form.control}
                    name={`items.${index}.title`}
                    render={({ field: titleField }) => (
                      <input {...titleField} />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field: descField }) => <input {...descField} />}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.tags`}
                    render={({ field: tagsField }) => <input {...tagsField} />}
                  />
                </div>
              ))}
            </div>

            {/* File count and actions */}
            <div className="flex items-center justify-between p-6 border rounded-md bg-muted/20">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {fields.length} items ready to upload
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total size:{' '}
                    {(
                      fields.reduce((sum, field) => sum + field.file.size, 0) /
                      1024 /
                      1024
                    ).toFixed(1)}
                    MB
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenFileDialog}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add More
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearFiles}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>

            {/* Virtualized file list for performance with large uploads */}
            <VirtualizedFileList
              fields={fields}
              form={form}
              getPreviewUrl={getPreviewUrl}
              handleRemoveFile={handleRemoveFile}
            />

            <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-700">
                💡 <strong>Quick Upload:</strong> Multiple items will be
                uploaded without individual metadata. You can edit titles,
                descriptions, and tags after upload if needed.
                {fields.length > 100 && (
                  <span className="block mt-1">
                    ⚡ Using virtualized rendering for optimal performance with{' '}
                    {fields.length} files.
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Hidden file input for all states */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFilesSelected(e.target.files)}
          multiple
          accept={ACCEPTED_FILE_TYPES.join(',')}
          className="hidden"
        />

        {/* Upload progress */}
        {uploadMutation.isPending && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                {fields.length > 10
                  ? `Processing ${fields.length} items in batches...`
                  : 'Uploading items...'}
              </span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
            {fields.length > 10 && (
              <div className="text-xs text-muted-foreground text-center">
                Google Drive style batch processing for optimal performance
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {uploadMutation.isError && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            Upload failed. Please try again.
          </div>
        )}

        {/* Upload button - only show when files are selected */}
        {!isNoFiles && (
          <DialogFooter>
            <Button
              type="submit"
              disabled={uploadMutation.isPending}
              className="gap-1"
              size="lg"
              onClick={() => {
                console.log('🔘 Upload button clicked!', {
                  filesLength: fields.length,
                  isNoFiles,
                  isSingleFile,
                  isMultipleFiles,
                  formState: form.formState,
                  formErrors: form.formState.errors,
                });
              }}
            >
              {uploadMutation.isPending ? (
                'Uploading...'
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {fields.length}{' '}
                  {fields.length === 1 ? 'Item' : 'Items'}
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </form>
    </Form>
  );
}
