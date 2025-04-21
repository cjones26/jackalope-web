import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import DefaultAvatar from '@/assets/default-avatar.jpg';
import { useApi } from '@/shared/hooks/useApi';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { Form, FormField } from '@/shared/ui/Form';
import { FormInput } from '@/shared/ui/Form/Form';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

// Fix: Update schema to handle File instead of FileList
const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  profileImage: z
    .custom<File>((val) => val instanceof File, {
      message: 'profileImage must be a File object',
    })
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE,
      'File size must be less than 5MB'
    )
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      'Only .jpg, .jpeg, .png, and .webp files are accepted'
    )
    .optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialData?: {
    first_name: string;
    last_name: string;
    profile_image?: string;
  };
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [successMessage, setSuccessMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialData?.profile_image || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fetchWithAuth } = useApi();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: initialData?.first_name || '',
      lastName: initialData?.last_name || '',
      profileImage: undefined,
    },
  });

  // Create a preview when the file is selected
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      form.setValue('profileImage', file, { shouldValidate: true });
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const formData = new FormData();
      formData.append('first_name', data.firstName);
      formData.append('last_name', data.lastName);

      if (data.profileImage) {
        formData.append('profileImage', data.profileImage);
      }

      const method = initialData ? 'PUT' : 'POST';

      return fetchWithAuth('/profile', {
        method,
        body: formData,
        headers: undefined,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      setSuccessMessage(
        initialData
          ? 'Profile updated successfully!'
          : 'Profile created successfully!'
      );

      if (data.profile_image) {
        setPreviewUrl(data.profile_image);
      }
    },
  });

  function onSubmit(data: ProfileFormData) {
    setSuccessMessage('');
    profileMutation.mutate(data);
  }

  const handleFormChange = () => {
    profileMutation.reset();
    setSuccessMessage('');
  };

  const getInitials = () => {
    if (form.watch('firstName') && form.watch('lastName')) {
      return `${form.watch('firstName')[0]}${form.watch('lastName')[0]}`.toUpperCase();
    }
    return initialData && initialData.first_name && initialData.last_name
      ? `${initialData.first_name[0]}${initialData.last_name[0]}`.toUpperCase()
      : '';
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onChange={handleFormChange}
        className="flex flex-col items-center gap-6 w-full max-w-md"
      >
        <div className="flex flex-col items-center justify-center gap-3">
          <div
            className="relative cursor-pointer group"
            onClick={handleAvatarClick}
          >
            <Avatar className="h-24 w-24">
              {previewUrl ? (
                <AvatarImage src={previewUrl} alt="Profile" />
              ) : (
                <AvatarImage src={DefaultAvatar} alt="Default Profile" />
              )}
              {(form.watch('firstName') && form.watch('lastName')) ||
              (initialData?.first_name && initialData?.last_name) ? (
                <AvatarFallback className="text-lg">
                  {getInitials()}
                </AvatarFallback>
              ) : null}
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </Avatar>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <span className="text-sm text-muted-foreground">
            Click to upload a profile photo
          </span>
          {form.formState.errors.profileImage && (
            <p className="text-sm text-destructive">
              {form.formState.errors.profileImage.message}
            </p>
          )}
        </div>
        <div className="w-full flex flex-col items-center space-y-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormInput
                type="text"
                placeholder="First Name"
                autoCapitalize="words"
                autoComplete="given-name"
                className="w-full lg:w-80"
                {...field}
              />
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormInput
                type="text"
                placeholder="Last Name"
                autoCapitalize="words"
                autoComplete="family-name"
                className="w-full lg:w-80"
                {...field}
              />
            )}
          />
          {profileMutation.isError ? (
            <p className="font-medium text-destructive w-full break-words text-center text-sm">
              There was an error saving your profile. Please try again.
            </p>
          ) : null}
          {successMessage ? (
            <p className="font-medium text-green-600 w-full break-words text-center text-sm">
              {successMessage}
            </p>
          ) : null}
          <Button
            type="submit"
            className={`w-full lg:w-80 ${
              profileMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={profileMutation.isPending}
          >
            {profileMutation.isPending ? (
              <span>Saving...</span>
            ) : (
              <span>{initialData ? 'Update Profile' : 'Create Profile'}</span>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
