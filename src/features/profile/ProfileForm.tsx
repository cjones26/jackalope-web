import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useSupabase } from '@/shared/context/supabase';
import { supabase } from '@/shared/services/supabase';
import { Button } from '@/shared/ui/Button';
import { Form, FormField } from '@/shared/ui/Form';
import { FormInput } from '@/shared/ui/Form/Form';

import { ProfileAvatar } from './ProfileAvatar';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [successMessage, setSuccessMessage] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile?.avatar_url || null,
  );
  const queryClient = useQueryClient();
  const { user } = useSupabase();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
    },
  });

  // Update form and avatar URL when profile changes
  useEffect(() => {
    form.reset({
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
    });

    setAvatarUrl(profile?.avatar_url || null);
  }, [profile, form]);

  // Handle avatar URL changes from the ProfileAvatar component
  const handleAvatarChange = (url: string | null) => {
    setAvatarUrl(url);
  };

  // Update profile in Supabase (only for name fields)
  const userMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('users')
        .update({
          avatar_url: avatarUrl,
          first_name: data.firstName,
          last_name: data.lastName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      return {
        first_name: data.firstName,
        last_name: data.lastName,
        avatar_url: avatarUrl,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
      setSuccessMessage('Profile updated successfully!');
    },
  });

  function onSubmit(data: ProfileFormData) {
    setSuccessMessage('');
    userMutation.mutate(data);
  }

  const handleFormChange = () => {
    userMutation.reset();
    setSuccessMessage('');
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        onChange={handleFormChange}
        className="flex flex-col items-center gap-6 w-full max-w-md"
      >
        <ProfileAvatar
          avatarUrl={avatarUrl}
          firstName={profile?.first_name}
          lastName={profile?.last_name}
          onAvatarChange={handleAvatarChange}
        />

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
          {userMutation.isError ? (
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
              userMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={userMutation.isPending}
          >
            {userMutation.isPending ? (
              <span>Saving...</span>
            ) : (
              <span>Update Profile</span>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
