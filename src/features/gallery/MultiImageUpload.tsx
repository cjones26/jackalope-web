import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { File as FileIcon, Trash2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES,
} from '@/shared/constants/FileConstants';
import { useApi } from '@/shared/hooks/useApi';
import { Button } from '@/shared/ui/Button';
import { DialogFooter } from '@/shared/ui/Dialog';
import { Progress } from '@/shared/ui/Progress';

const multiUploadSchema = z.object({
  images: z
    .array(z.instanceof(File))
    .min(1, { message: 'Please select at least one image' })
    .max(MAX_FILES, {
      message: `You can only upload up to ${MAX_FILES} images at once`,
    })
    .refine(
      (files) => files.every((file) => file.size <= MAX_FILE_SIZE),
      `File size should be less than 10MB`
    )
    .refine(
      (files) =>
        files.every((file) => ACCEPTED_IMAGE_TYPES.includes(file.type)),
      'Only .jpg, .jpeg, .png, .webp, and .gif files are accepted'
    ),
});

type MultiUploadFormData = z.infer<typeof multiUploadSchema>;

interface MultiImageUploadProps {
  onSuccess: () => void;
}

export function MultiImageUpload({ onSuccess }: MultiImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fetchWithAuth } = useApi();

  const form = useForm<MultiUploadFormData>({
    resolver: zodResolver(multiUploadSchema),
    defaultValues: {
      images: [],
    },
  });

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);
    setSelectedFiles((prev) => {
      const newFiles = [...prev];

      // Check if we're going over the limit
      const totalFiles = newFiles.length + filesArray.length;
      if (totalFiles > MAX_FILES) {
        const remainingSlots = MAX_FILES - newFiles.length;
        // Only add the remaining slots' worth of files
        newFiles.push(...filesArray.slice(0, remainingSlots));

        // Show a warning if we needed to truncate
        if (remainingSlots < filesArray.length) {
          form.setError('images', {
            type: 'manual',
            message: `Only ${remainingSlots} files were added as the maximum is ${MAX_FILES} files`,
          });
        }
      } else {
        newFiles.push(...filesArray);
      }

      form.setValue('images', newFiles, { shouldValidate: true });

      return newFiles;
    });
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);

      if (newFiles.length === 0) {
        form.setValue('images', [], { shouldValidate: true });
      } else {
        form.setValue('images', newFiles, { shouldValidate: true });
      }

      return newFiles;
    });
  };

  const handleClearFiles = () => {
    setSelectedFiles([]);
    form.setValue('images', [], { shouldValidate: true });
  };

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (data: MultiUploadFormData) => {
      const formData = new FormData();

      data.images.forEach((file) => {
        formData.append('images', file);
      });

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
        const result = await fetchWithAuth('/gallery', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        return result;
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

  const onSubmit = form.handleSubmit((data) => {
    uploadMutation.mutate(data);
  });

  const resetForm = () => {
    form.reset({ images: [] });
    setSelectedFiles([]);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    uploadMutation.reset();
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-4">
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleOpenFileDialog}
          className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
            selectedFiles.length > 0
              ? 'border-primary/50 bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5'
          }`}
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
            <Upload className="h-10 w-10 text-muted-foreground" />
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
        {form.formState.errors.images && (
          <p className="text-sm text-destructive">
            {form.formState.errors.images.message}
          </p>
        )}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                {selectedFiles.length}{' '}
                {selectedFiles.length === 1 ? 'file' : 'files'} selected
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
            <div className="max-h-60 overflow-y-auto space-y-2 rounded-md border p-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/40"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FileIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm truncate max-w-[180px]">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleRemoveFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        {uploadMutation.isPending && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
        {uploadMutation.isError && (
          <p className="text-sm text-destructive">
            Upload failed. Please try again.
          </p>
        )}
      </div>
      <DialogFooter className="mt-6">
        <Button
          type="submit"
          disabled={selectedFiles.length === 0 || uploadMutation.isPending}
          className="gap-1"
        >
          {uploadMutation.isPending ? (
            'Uploading...'
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
