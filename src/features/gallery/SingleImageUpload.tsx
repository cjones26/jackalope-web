import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from '@/shared/constants/FileConstants';
import { useApi } from '@/shared/hooks/useApi';
import { Button } from '@/shared/ui/Button';
import { DialogFooter } from '@/shared/ui/Dialog';
import { Form, FormField } from '@/shared/ui/Form';
import { FormInput, FormTextarea } from '@/shared/ui/Form/Form';
import { TagInput } from '@/shared/ui/TagInput';

const imageUploadSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  image: z
    .custom<File>((val) => val instanceof File, {
      message: 'Please select an image file',
    })
    .refine(
      (file) => file.size <= MAX_FILE_SIZE,
      'File size must be less than 10MB'
    )
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      'Only .jpg, .jpeg, .png, .webp, and .gif files are accepted'
    ),
});

type ImageUploadFormData = z.infer<typeof imageUploadSchema>;

interface SingleImageUploadProps {
  onSuccess: () => void;
}

export function SingleImageUpload({ onSuccess }: SingleImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fetchWithAuth } = useApi();

  const form = useForm<ImageUploadFormData>({
    resolver: zodResolver(imageUploadSchema),
    defaultValues: {
      title: '',
      description: '',
      tags: [],
    },
  });

  // Create a preview when a file is selected
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Set the file in the form
      form.setValue('image', file, { shouldValidate: true });
    }
  };

  // Upload image mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: ImageUploadFormData) => {
      const formData = new FormData();

      if (data.title) {
        formData.append('title', data.title);
      }

      if (data.description) {
        formData.append('description', data.description);
      }

      if (data.tags && data.tags.length > 0) {
        formData.append('tags', JSON.stringify(data.tags));
      }

      formData.append('images', data.image);

      return fetchWithAuth('/gallery', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      resetForm();
      onSuccess();
    },
  });

  // Submit handler
  function onSubmit(data: ImageUploadFormData) {
    uploadMutation.mutate(data);
  }

  // Reset the form and preview
  const resetForm = () => {
    form.reset();
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    uploadMutation.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col items-center justify-center gap-3">
          {previewUrl ? (
            <div className="relative w-full max-h-64 overflow-hidden rounded-md">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  form.setValue('image', undefined as unknown as File);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md border-gray-300 cursor-pointer hover:border-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-sm text-muted-foreground">
                Click to select an image
              </p>
            </div>
          )}

          <input
            type="file"
            className="hidden"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          {form.formState.errors.image && (
            <p className="text-sm text-destructive">
              {form.formState.errors.image.message}
            </p>
          )}
        </div>
        <FormField
          control={form.control}
          name="title"
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
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormTextarea
              label="Description"
              placeholder="Image description (optional)"
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
        {uploadMutation.isError ? (
          <p className="font-medium text-destructive text-sm">
            There was an error uploading your image. Please try again.
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="submit"
            disabled={!form.formState.isValid || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
